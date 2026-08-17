# AI 日志管理实现

## 1. 背景与目标

管理后台需要查看和删除 AI 业务操作日志，数据来源于 `dnhyxc-ai` 业务库。

**目标：**
- 日志列表分页展示（支持按路径、用户名搜索）
- 单条删除日志
- 批量删除日志（限管理员角色）

## 2. 改动范围

| 文件 | 职责 |
|------|------|
| `ai-log.entity.ts` | 定义 TypeORM 实体，映射 `dnhyxc-ai.logs` 表 |
| `ai-logs.service.ts` | 业务逻辑：查询列表、删除、计数 |
| `ai-logs.controller.ts` | REST 接口定义，含 DTO 校验与角色守卫 |
| `ai-logs.module.ts` | 模块注册，注册实体、控制器、服务 |
| `AiLogsPage.tsx` | 前端页面：日志表格、搜索、删除操作 |

## 3. 核心思路

- **实体映射**：`AiLog` 实体映射 `dnhyxc-ai.logs` 表，仅用于查询与删除（无新增/更新）
- **关联查询**：通过 `LEFT JOIN AiUser` 获取日志对应的用户名
- **权限控制**：删除操作通过 `@Roles(Role.ADMIN)` 限制仅管理员可用
- **批量删除**：使用 `DELETE ... WHERE id IN (?)` 实现批量删除

## 4. 关键代码

### 4.1 AiLog 实体

> 源文件：`apps/backend/src/services/ai-logs/ai-log.entity.ts`

```typescript
// 从 typeorm 导入实体装饰器和列类型装饰器
import {
	Column,         // 定义数据库列
	Entity,         // 标记为实体类
	JoinColumn,     // 定义外键列名
	ManyToOne,      // 定义多对一关系
	PrimaryGeneratedColumn, // 定义自增主键
} from 'typeorm';
// 导入 AiUser 实体，用于关联查询用户名
import { AiUser } from '../ai-user/ai-user.entity';

// JSDoc 注释：说明此实体映射 dnhyxc-ai 业务库的 logs 表（只读）
// 注意：字段以产品库为准，没有 action 字段
/**
 * 映射 dnhyxc-ai 业务库 `logs` 表（只读）
 * 字段以产品库为准：无 action
 */
// @Entity 装饰器指定数据库表名为 'logs'
@Entity({ name: 'logs' })
// 导出 AiLog 实体类
export class AiLog {
	// 主键自增列，对应 id 字段
	@PrimaryGeneratedColumn()
	// 日志 ID
	id: number;

	// 普通列，对应请求路径
	@Column()
	// 记录请求路径（如 /api/xxx）
	path: string;

	// 普通列，对应请求方法
	@Column()
	// 记录 HTTP 请求方法（GET/POST 等）
	method: string;

	// text 类型列，用于存储较大的请求数据
	@Column({ type: 'text' })
	// 记录请求体数据（JSON 字符串）
	data: string;

	// text 类型列，允许为空，列名为 responseData（驼峰转下划线不匹配时显式指定）
	@Column({ name: 'responseData', type: 'text', nullable: true })
	// 记录响应数据，可能为空
	responseData: string | null;

	// int 类型列，存储请求结果状态码
	@Column({ type: 'int' })
	// 记录请求结果（HTTP 状态码）
	result: number;

	// timestamp 类型列，列名为 createTime
	@Column({ name: 'createTime', type: 'timestamp' })
	// 记录请求创建时间
	createTime: Date;

	// 多对一关联 AiUser，允许为空（日志可能没有关联用户）
	@ManyToOne(() => AiUser, { nullable: true })
	// 外键列名为 userId，关联 AiUser 实体
	@JoinColumn({ name: 'userId' })
	// 关联的用户对象，可能为 null
	user: AiUser | null;
}
```

### 4.2 AiLogsService 服务层

> 源文件：`apps/backend/src/services/ai-logs/ai-logs.service.ts`

```typescript
// 从 @nestjs/common 导入可注入装饰器和异常类
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
// 从 @nestjs/typeorm 导入数据源和仓库注入装饰器
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
// 从 typeorm 导入数据源、In 操作符和仓库类
import { DataSource, In, Repository } from 'typeorm';
// 导入数据库连接常量，用于指定 AI 业务库连接
import { DB_CONNECTIONS } from '../../database/constants';
// 导入 AiLog 实体
import { AiLog } from './ai-log.entity';

// @Injectable 装饰器标记为可注入服务
@Injectable()
// 导出 AiLogsService 服务类
export class AiLogsService {
	// 构造函数注入依赖
	constructor(
		// 注入 AiLog 仓库，指定使用 AI 数据库连接
		@InjectRepository(AiLog, DB_CONNECTIONS.AI)
		// aiLogRepository 用于操作 logs 表
		private readonly aiLogRepository: Repository<AiLog>,
		// 注入 AI 数据源，用于检查连接状态
		@InjectDataSource(DB_CONNECTIONS.AI)
		// aiDataSource 数据源实例
		private readonly aiDataSource: DataSource,
	) {}

	// 私有方法：断言 AI 数据库连接是否就绪
	private assertReady() {
		// 检查数据源是否已初始化连接
		if (!this.aiDataSource?.isInitialized) {
			// 如果未连接，抛出 503 ServiceUnavailable 异常
			throw new ServiceUnavailableException(
				// 错误提示信息，说明需要检查 AI 业务库连接
				'AI 业务库未连接，请确认 dnhyxc-ai MySQL 已启动且 AI_DB_* 配置正确',
			);
		}
	}

	// 异步查询日志列表方法，接收分页和筛选参数
	async findAll(query: {
		// 当前页码，可选，默认 1
		pageNo?: number;
		// 每页条数，可选，默认 20
		pageSize?: number;
		// 路径筛选关键字，可选
		path?: string;
		// 用户名筛选关键字，可选
		username?: string;
	}) {
		// 先检查数据库连接状态
		this.assertReady();
		// 设置默认页码为 1
		const pageNo = query.pageNo || 1;
		// 设置默认每页条数为 20
		const pageSize = query.pageSize || 20;

		// 创建查询构建器，别名设为 'log'
		const qb = this.aiLogRepository
			.createQueryBuilder('log')
			// LEFT JOIN 关联 user 表，获取用户名
			.leftJoinAndSelect('log.user', 'user')
			// 按 ID 倒序排列，最新日志在前
			.orderBy('log.id', 'DESC')
			// 设置每页返回条数
			.take(pageSize)
			// 设置跳过的条数（计算偏移量）
			.skip((pageNo - 1) * pageSize);

		// 如果传入了路径筛选条件
		if (query.path) {
			// 添加 LIKE 条件进行模糊搜索
			qb.andWhere('log.path LIKE :path', { path: `%${query.path}%` });
		}
		// 如果传入了用户名筛选条件
		if (query.username) {
			// 添加用户名 LIKE 模糊搜索条件
			qb.andWhere('user.username LIKE :username', {
				username: `%${query.username}%`,
			});
		}

		// 执行查询，获取列表和总数
		const [list, total] = await qb.getManyAndCount();
		// 返回列表和总数
		return { list, total };
	}

	// 异步删除日志方法，接收 ID 数组
	async remove(ids: number[]) {
		// 检查数据库连接状态
		this.assertReady();
		// 如果 ID 数组为空，直接返回
		if (!ids.length) return { affected: 0 };
		// 执行批量删除，使用 In 操作符生成 WHERE id IN (...)
		const result = await this.aiLogRepository.delete({ id: In(ids) });
		// 返回受影响的行数
		return { affected: result.affected ?? 0 };
	}

	// 异步统计日志总数方法
	async count() {
		// 检查数据库连接状态
		this.assertReady();
		// 返回 logs 表总记录数
		return this.aiLogRepository.count();
	}
}
```

### 4.3 AiLogsController 控制器层

> 源文件：`apps/backend/src/services/ai-logs/ai-logs.controller.ts`

```typescript
// 从 @nestjs/common 导入控制器所需的装饰器和管道
import {
	Body,           // 从请求体提取参数
	Controller,     // 标记为控制器
	Delete,         // DELETE 路由装饰器
	Get,            // GET 路由装饰器
	Param,          // 从路由参数提取参数
	ParseIntPipe,   // 整数解析管道
	Query,          // 从查询参数提取
	UseGuards,      // 使用守卫
	UseInterceptors, // 使用拦截器
} from '@nestjs/common';
// 从 class-transformer 导入 Type 装饰器，用于类型转换
import { Type } from 'class-transformer';
// 从 class-validator 导入验证装饰器
import {
	ArrayNotEmpty,  // 数组非空校验
	IsArray,        // 数组类型校验
	IsInt,          // 整数校验
	IsOptional,     // 可选字段校验
	IsString,       // 字符串校验
	Min,            // 最小值校验
} from 'class-validator';
// 导入自定义角色装饰器
import { Roles } from '../../decorators/roles.decorator';
// 导入角色枚举
import { Role } from '../../enum/roles.enum';
// 导入 JWT 认证守卫
import { JwtGuard } from '../../guards/jwt.guard';
// 导入角色守卫
import { RoleGuard } from '../../guards/role.guard';
// 导入响应拦截器（统一响应格式）
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
// 导入 AiLogsService
import { AiLogsService } from './ai-logs.service';

// 查询参数 DTO 类，用于日志列表查询
class GetAiLogsQuery {
	// pageNo 可选，类型转换为数字，整数校验，最小值 1，默认值 1
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageNo?: number = 1;

	// pageSize 可选，类型转换为数字，整数校验，最小值 1，默认值 20
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageSize?: number = 20;

	// path 可选，字符串类型
	@IsOptional()
	@IsString()
	path?: string;

	// username 可选，字符串类型
	@IsOptional()
	@IsString()
	username?: string;
}

// 批量删除 DTO 类
class DeleteAiLogsDto {
	// ids 必须是数组，非空，元素转换为数字，每个元素为整数
	@IsArray()
	@ArrayNotEmpty()
	@Type(() => Number)
	@IsInt({ each: true })
	ids: number[];
}

// 控制器装饰器，路由前缀为 ai-logs
@Controller('ai-logs')
// 使用 JWT 守卫和角色守卫
@UseGuards(JwtGuard, RoleGuard)
// 设置允许的角色为管理员和普通用户（查看需要登录）
@Roles(Role.ADMIN, Role.USER)
// 使用响应拦截器统一响应格式
@UseInterceptors(ResponseInterceptor)
// 导出 AiLogsController 控制器类
export class AiLogsController {
	// 构造函数注入 AiLogsService
	constructor(private readonly aiLogsService: AiLogsService) {}

	// GET /ai-logs/getLogs 获取日志列表
	@Get('/getLogs')
	// 处理日志列表查询请求
	getLogs(@Query() query: GetAiLogsQuery) {
		// 调用 service 的 findAll 方法
		return this.aiLogsService.findAll(query);
	}

	// DELETE /ai-logs/deleteLog/:id 单条删除日志
	@Delete('/deleteLog/:id')
	// 仅允许管理员角色执行删除操作
	@Roles(Role.ADMIN)
	// 处理单条删除请求，解析路由参数 id 为整数
	deleteLog(@Param('id', ParseIntPipe) id: number) {
		// 将单个 ID 包装为数组，调用 remove 方法
		return this.aiLogsService.remove([id]);
	}

	// DELETE /ai-logs/deleteLogs 批量删除日志
	@Delete('/deleteLogs')
	// 仅允许管理员角色执行批量删除
	@Roles(Role.ADMIN)
	// 处理批量删除请求，从请求体获取 ID 数组
	deleteLogs(@Body() dto: DeleteAiLogsDto) {
		// 调用 remove 方法批量删除
		return this.aiLogsService.remove(dto.ids);
	}
}
```

### 4.4 前端页面 AiLogsPage

> 源文件：`apps/frontend/src/views/ai-logs/AiLogsPage.tsx`

```tsx
// 从 antd 导入 UI 组件
import {
	Alert,          // 警告提示组件
	Button,         // 按钮组件
	Input,          // 输入框组件
	message,        // 全局消息提示
	Popconfirm,     // 气泡确认框
	Space,          // 间距组件
	Table,          // 表格组件
	Tag,            // 标签组件
	Tooltip,        // 文字提示组件
	Typography,     // 排版组件
} from 'antd';
// 从 react 导入 Key 类型和 Hook
import { type Key, useEffect, useState } from 'react';
// 导入表格分页工具
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
// 导入 API 接口方法
import { deleteAiLogApi, deleteAiLogsApi, getAiLogsApi } from '@/service';

// 定义日志行数据类型
type AiLogRow = {
	// 日志 ID
	id: number;
	// 请求路径
	path: string;
	// 请求方法
	method: string;
	// 请求数据
	data: string;
	// 响应数据，可能为空
	responseData?: string | null;
	// 请求结果状态码
	result: number;
	// 请求时间
	createTime: string;
	// 关联的用户名，可能为空
	user?: { username: string } | null;
};

// 格式化请求时间函数
function formatRequestTime(v?: string) {
	// 如果值为空，显示占位符
	if (!v) return '—';
	// 创建日期对象
	const d = new Date(v);
	// 如果日期无效，返回原值
	if (Number.isNaN(d.getTime())) return v;
	// 补零函数，将数字格式化为两位数
	const p = (n: number) => String(n).padStart(2, '0');
	// 返回格式化的日期时间字符串
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 格式化 JSON 数据函数，用于美化显示
function formatJsonData(v?: string | null) {
	// 如果值为空，返回空字符串
	if (!v) return '';
	try {
		// 尝试解析并格式化 JSON
		return JSON.stringify(JSON.parse(v), null, 2);
	} catch {
		// 如果解析失败，返回原始字符串
		return v;
	}
}

// 渲染数据单元格的函数，带 Tooltip 预览
function renderDataCell(v?: string | null) {
	// 如果值为空，显示占位符
	if (!v) return '—';
	// 格式化数据
	const pretty = formatJsonData(v);
	// 返回带 Tooltip 的 span 元素，鼠标悬停显示格式化后的 JSON
	return (
		<Tooltip
			placement="topLeft"
			overlayStyle={{ maxWidth: 480 }}
			title={
				// 使用 pre 标签保留格式
				<pre
					style={{
						margin: 0,
						maxHeight: 280,
						overflow: 'auto',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontSize: 12,
						lineHeight: 1.5,
					}}
				>
					{pretty}
				</pre>
			}
		>
			<span>{v}</span>
		</Tooltip>
	);
}

// 导出 AiLogsPage 页面组件
export function AiLogsPage() {
	// 日志列表数据状态
	const [list, setList] = useState<AiLogRow[]>([]);
	// 总数状态
	const [total, setTotal] = useState(0);
	// 当前页码状态
	const [pageNo, setPageNo] = useState(1);
	// 每页条数状态
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	// 路径搜索关键字状态
	const [path, setPath] = useState('');
	// 用户名搜索关键字状态
	const [username, setUsername] = useState('');
	// 错误信息状态
	const [error, setError] = useState('');
	// 选中行的 key 数组状态
	const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

	// 加载数据的异步函数
	const load = async (page = pageNo, size = pageSize) => {
		try {
			// 清除之前的错误
			setError('');
			// 调用 API 获取日志列表
			const res = await getAiLogsApi({
				pageNo: page,
				pageSize: size,
				path: path || undefined,
				username: username || undefined,
			});
			// 从响应中提取数据
			const data = res.data as { list: AiLogRow[]; total: number };
			// 更新列表数据
			setList(data.list);
			// 更新总数
			setTotal(data.total);
			// 更新当前页码
			setPageNo(page);
			// 更新每页条数
			setPageSize(size);
			// 清空选中行
			setSelectedRowKeys([]);
		} catch (e: any) {
			// 加载失败时清空数据
			setList([]);
			setTotal(0);
			setSelectedRowKeys([]);
			// 设置错误信息
			setError(
				e?.message ||
					'AI 业务库不可用，请确认 AI_DB_ENABLED=true 且 dnhyxc-ai MySQL 已启动',
			);
		}
	};

	// 页面首次加载时获取数据
	useEffect(() => {
		load(1, DEFAULT_PAGE_SIZE);
	}, []);

	// 渲染页面
	return (
		<div>
			{/* 顶部操作栏 */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 16,
					marginBottom: 16,
				}}
			>
				{/* 左侧显示数据统计 */}
				<Typography.Text type="secondary">
					读取 dnhyxc-ai 业务库 logs · 共 {total} 条
				</Typography.Text>
				{/* 右侧操作按钮组 */}
				<Space wrap>
					{/* 路径搜索输入框 */}
					<Input
						placeholder="路径"
						value={path}
						onChange={(e) => setPath(e.target.value)}
						style={{ width: 180 }}
						allowClear
					/>
					{/* 用户名搜索输入框 */}
					<Input
						placeholder="用户名"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						style={{ width: 160 }}
						allowClear
					/>
					{/* 查询按钮，点击后从第 1 页开始搜索 */}
					<Button type="primary" onClick={() => load(1, pageSize)}>
						查询
					</Button>
					{/* 批量删除按钮，带确认框 */}
					<Popconfirm
						title={`确认删除选中的 ${selectedRowKeys.length} 条？`}
						disabled={!selectedRowKeys.length}
						onConfirm={async () => {
							// 调用批量删除 API
							await deleteAiLogsApi(selectedRowKeys.map(Number));
							message.success('已删除');
							load();
						}}
					>
						<Button danger disabled={!selectedRowKeys.length}>
							批量删除
						</Button>
					</Popconfirm>
				</Space>
			</div>

			{/* 错误提示 */}
			{error && (
				<Alert
					type="warning"
					showIcon
					message={error}
					style={{ marginBottom: 16 }}
				/>
			)}

			{/* 日志数据表格 */}
			<Table
				rowKey="id"
				dataSource={list}
				pagination={tablePagination(total, pageNo, pageSize, load)}
				scroll={{ x: 1280 }}
				locale={{ emptyText: error ? ' ' : '暂无数据' }}
				rowSelection={{
					selectedRowKeys,
					onChange: setSelectedRowKeys,
				}}
				columns={[
					// ID 列
					{ title: 'ID', dataIndex: 'id', width: 80 },
					// 用户名列，显示关联的用户名
					{
						title: '用户',
						width: 120,
						render: (_, r) => r.user?.username || '—',
					},
					// 请求方法列，使用 Tag 标签展示
					{
						title: '方法',
						dataIndex: 'method',
						width: 90,
						render: (v: string) => <Tag>{v}</Tag>,
					},
					// 路径列，支持省略显示
					{ title: '路径', dataIndex: 'path', ellipsis: true },
					// 结果状态码列，根据状态码显示不同颜色
					{
						title: '结果',
						dataIndex: 'result',
						width: 80,
						render: (v: number) => (
							<Tag color={v >= 200 && v < 400 ? 'success' : 'error'}>{v}</Tag>
						),
					},
					// 请求数据列，支持 Tooltip 预览
					{
						title: '请求数据',
						dataIndex: 'data',
						ellipsis: { showTitle: false },
						render: (v: string) => renderDataCell(v),
					},
					// 响应数据列，支持 Tooltip 预览
					{
						title: '响应数据',
						dataIndex: 'responseData',
						ellipsis: { showTitle: false },
						render: (v: string) => renderDataCell(v),
					},
					// 请求时间列，格式化显示
					{
						title: '请求时间',
						dataIndex: 'createTime',
						width: 180,
						render: (v: string) => formatRequestTime(v),
					},
					// 操作列，单条删除
					{
						title: '操作',
						width: 90,
						fixed: 'right',
						render: (_, r) => (
							<Popconfirm
								title="确认删除？"
								onConfirm={async () => {
									// 调用单条删除 API
									await deleteAiLogApi(r.id);
									message.success('已删除');
									load();
								}}
							>
								<Button danger type="link" size="small">
									删除
								</Button>
							</Popconfirm>
						),
					},
				]}
			/>
		</div>
	);
}
```

## 5. 兼容性与影响

| 影响点 | 说明 |
|--------|------|
| 数据库依赖 | 依赖 `dnhyxc-ai` MySQL 实例正常运行，且 `AI_DB_*` 环境变量配置正确 |
| 只读场景 | `logs` 表为只读日志表，无新增/修改接口 |
| 权限约束 | 删除操作需要 `ADMIN` 角色，普通用户仅可查看 |
| 级联删除 | 日志删除为物理删除，不可恢复，需谨慎操作 |
| 用户关联 | 日志通过 `userId` 关联 `AiUser`，若用户被删除则日志用户名显示为空 |

## 6. 相关源码路径

| 模块 | 路径 |
|------|------|
| 后端实体 | `apps/backend/src/services/ai-logs/ai-log.entity.ts` |
| 后端服务 | `apps/backend/src/services/ai-logs/ai-logs.service.ts` |
| 后端控制器 | `apps/backend/src/services/ai-logs/ai-logs.controller.ts` |
| 后端模块 | `apps/backend/src/services/ai-logs/ai-logs.module.ts` |
| 前端页面 | `apps/frontend/src/views/ai-logs/AiLogsPage.tsx` |
| 前端 API | `apps/frontend/src/service/` |
| 数据库常量 | `apps/backend/src/database/constants.ts` |

---

**若与仓库最新源码不一致，以源码为准。**