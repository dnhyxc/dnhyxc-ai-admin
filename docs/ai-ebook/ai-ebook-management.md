# AI 电子书管理实现

## 1. 背景与目标

管理后台需要查看 `dnhyxc-ai` 业务库中的电子书数据（只读）。

**目标：**
- 只读方式展示电子书列表
- 支持按书名 / 用户名搜索
- 格式大小格式化展示
- 分页浏览

## 2. 改动范围

| 文件 | 类型 | 说明 |
|------|------|------|
| `ai-ebook-book.entity.ts` | 新增 | TypeORM 实体，映射 `ebook_book` 表 |
| `ai-ebook.service.ts` | 新增 | 业务逻辑，查询与分页 |
| `ai-ebook.controller.ts` | 新增 | REST API 控制器，暴露 `GET /ai-ebook/getBooks` |
| `ai-ebook.module.ts` | 新增 | NestJS 模块注册 |
| `AiEbooksPage.tsx` | 新增 | 前端页面组件 |

## 3. 核心思路

- **实体映射**：`AiEbookBook` 映射 AI 业务库的 `ebook_book` 表，只读模式
- **过滤规则**：只展示主书（`sourceBookId IS NULL`），排除读者副本
- **关联查询**：LEFT JOIN `AiUser` 表，展示书籍所属用户名
- **分页搜索**：支持按书名模糊搜索、按用户名模糊搜索，分页返回

## 4. 关键代码

### 4.1 AiEbookBook 实体

> 来源：`apps/backend/src/services/ai-ebook/ai-ebook-book.entity.ts`

```typescript
// 从 typeorm 引入实体装饰器和列装饰器
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
// 引入 AI 用户实体，用于关联查询
import { AiUser } from '../ai-user/ai-user.entity';

/**
 * 映射 dnhyxc-ai 业务库 `ebook_book`（只读管理子集）
 */
// 声明该类是一个 TypeORM 实体，对应数据库表名 ebook_book
@Entity({ name: 'ebook_book' })
// 导出 AiEbookBook 实体类
export class AiEbookBook {
	// 主键列，使用 UUID 自动生成
	@PrimaryGeneratedColumn('uuid')
	// 书籍唯一标识
	id: string;

	// 普通列，类型为 int，对应数据库字段 user_id
	@Column({ type: 'int', name: 'user_id' })
	// 书籍所属用户 ID
	userId: number;

	// 普通列，类型为 varchar，长度 8，存储书籍格式
	@Column({ type: 'varchar', length: 8 })
	// 书籍格式（如 EPUB、PDF 等）
	fmt: string;

	// 普通列，类型为 varchar，长度 512，存储书名
	@Column({ type: 'varchar', length: 512 })
	// 书籍标题
	title: string;

	// 普通列，类型为 varchar，长度 255，允许为空，存储作者
	@Column({ type: 'varchar', length: 255, nullable: true })
	// 书籍作者，可为空
	author: string | null;

	// 普通列，类型为 varchar，长度 16，对应数据库字段 src_kind，表示来源类型
	@Column({ type: 'varchar', length: 16, name: 'src_kind' })
	// 来源类型
	srcKind: string;

	// 普通列，类型为 bigint，允许为空，存储文件大小
	@Column({ type: 'bigint', nullable: true })
	// 文件大小（字节数），可能为空
	size: string | null;

	// 普通列，对应数据库字段 is_public，布尔类型，默认 false
	@Column({ name: 'is_public', type: 'boolean', default: false })
	// 是否公开
	isPublic: boolean;

	// 普通列，类型为 UUID，对应数据库字段 source_book_id，允许为空
	// 非空时表示这是某本书的读者副本，为空时表示这是主书
	@Column({ type: 'uuid', name: 'source_book_id', nullable: true })
	// 原书 ID（读者副本关联的原书），主书为 null
	sourceBookId: string | null;

	// 普通列，对应数据库字段 parse_status，类型 varchar 长度 16，允许为空
	@Column({
		type: 'varchar',
		length: 16,
		name: 'parse_status',
		nullable: true,
	})
	// 解析状态（ready/failed 等）
	parseStatus: string | null;

	// 普通列，对应数据库字段 total_word_count，类型 int，允许为空
	@Column({ type: 'int', name: 'total_word_count', nullable: true })
	// 总字数
	totalWordCount: number | null;

	// 创建时间列，对应数据库字段 created_at，由 TypeORM 自动管理
	@CreateDateColumn({ name: 'created_at', type: 'timestamp' })
	// 书籍创建时间
	createdAt: Date;

	// 多对一关系，关联 AiUser 实体，允许为空
	@ManyToOne(() => AiUser, { nullable: true })
	// 外键列，使用 user_id 作为关联字段
	@JoinColumn({ name: 'user_id' })
	// 关联的用户信息，可为空
	user: AiUser | null;
}
```

### 4.2 AiEbookService

> 来源：`apps/backend/src/services/ai-ebook/ai-ebook.service.ts`

```typescript
// 从 @nestjs/common 引入可注入装饰器和异常类
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
// 从 @nestjs/typeorm 引入注入数据源和仓储的装饰器
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
// 从 typeorm 引入数据源、IsNull 操作符和仓储类
import { DataSource, IsNull, Repository } from 'typeorm';
// 引入数据库连接常量
import { DB_CONNECTIONS } from '../../database/constants';
// 引入实体类
import { AiEbookBook } from './ai-ebook-book.entity';

// 声明为可注入的服务类
@Injectable()
export class AiEbookService {
	// 构造函数，注入仓储和数据源
	constructor(
		// 注入 AiEbookBook 实体对应的仓储，使用 AI 数据库连接
		@InjectRepository(AiEbookBook, DB_CONNECTIONS.AI)
		// ebook 仓储实例
		private readonly ebookRepository: Repository<AiEbookBook>,
		// 注入 AI 数据源，用于检查连接状态
		@InjectDataSource(DB_CONNECTIONS.AI)
		// AI 数据源实例
		private readonly aiDataSource: DataSource,
	) {}

	// 私有方法，检查 AI 数据库连接是否就绪
	private assertReady() {
		// 如果数据源未初始化
		if (!this.aiDataSource?.isInitialized) {
			// 抛出服务不可用异常，提示 AI 业务库未连接
			throw new ServiceUnavailableException(
				'AI 业务库未连接，请确认 dnhyxc-ai MySQL 已启动且 AI_DB_* 配置正确',
			);
		}
	}

	// 查询所有书籍，支持分页和搜索
	async findAll(query: {
		// 当前页码，可选
		pageNo?: number;
		// 每页条数，可选
		pageSize?: number;
		// 书名搜索关键词，可选
		title?: string;
		// 用户名搜索关键词，可选
		username?: string;
	}) {
		// 先检查数据库连接状态
		this.assertReady();
		// 默认页码为 1
		const pageNo = query.pageNo || 1;
		// 默认每页 20 条
		const pageSize = query.pageSize || 20;

		// 创建查询构建器，别名为 book
		const qb = this.ebookRepository
			.createQueryBuilder('book')
			// LEFT JOIN 关联用户表，别名为 user，用于获取用户名
			.leftJoinAndSelect('book.user', 'user')
			// 只查询主书（sourceBookId 为 NULL），排除读者副本
			.where('book.sourceBookId IS NULL')
			// 按创建时间倒序排列
			.orderBy('book.createdAt', 'DESC')
			// 限制返回条数
			.take(pageSize)
			// 跳过前几页的数据
			.skip((pageNo - 1) * pageSize);

		// 如果传入了书名搜索关键词
		if (query.title) {
			// 添加书名模糊搜索条件
			qb.andWhere('book.title LIKE :title', { title: `%${query.title}%` });
		}
		// 如果传入了用户名搜索关键词
		if (query.username) {
			// 添加用户名模糊搜索条件
			qb.andWhere('user.username LIKE :username', {
				username: `%${query.username}%`,
			});
		}

		// 执行查询，获取数据列表和总数
		const [list, total] = await qb.getManyAndCount();
		// 返回列表和总数
		return { list, total };
	}

	// 统计主书数量
	async count() {
		// 检查数据库连接状态
		this.assertReady();
		// 使用仓储的 count 方法统计 sourceBookId 为 NULL 的记录数
		return this.ebookRepository.count({
			where: { sourceBookId: IsNull() },
		});
	}
}
```

### 4.3 AiEbookController

> 来源：`apps/backend/src/services/ai-ebook/ai-ebook.controller.ts`

```typescript
// 从 @nestjs/common 引入控制器、路由装饰器和拦截器
import {
	Controller,
	Get,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
// 引入 class-transformer 的类型转换装饰器
import { Type } from 'class-transformer';
// 引入 class-validator 的验证装饰器
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
// 引入自定义角色装饰器
import { Roles } from '../../decorators/roles.decorator';
// 引入角色枚举
import { Role } from '../../enum/roles.enum';
// 引入 JWT 认证守卫
import { JwtGuard } from '../../guards/jwt.guard';
// 引入角色守卫
import { RoleGuard } from '../../guards/role.guard';
// 引入响应拦截器
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
// 引入服务层
import { AiEbookService } from './ai-ebook.service';

// 定义查询参数的 DTO 类，用于参数校验和类型转换
class GetAiEbooksQuery {
	// pageNo 参数可选
	@IsOptional()
	// 将查询参数转为数字类型
	@Type(() => Number)
	// 必须是整数
	@IsInt()
	// 最小值为 1
	@Min(1)
	// 当前页码，默认 1
	pageNo?: number = 1;

	// pageSize 参数可选
	@IsOptional()
	// 转为数字类型
	@Type(() => Number)
	// 必须是整数
	@IsInt()
	// 最小值为 1
	@Min(1)
	// 每页条数，默认 20
	pageSize?: number = 20;

	// title 参数可选
	@IsOptional()
	// 必须是字符串
	@IsString()
	// 书名搜索关键词
	title?: string;

	// username 参数可选
	@IsOptional()
	// 必须是字符串
	@IsString()
	// 用户名搜索关键词
	username?: string;
}

// 控制器前缀为 ai-ebook
@Controller('ai-ebook')
// 使用 JWT 守卫和角色守卫
@UseGuards(JwtGuard, RoleGuard)
// 允许管理员和普通用户访问
@Roles(Role.ADMIN, Role.USER)
// 使用响应拦截器统一处理响应格式
@UseInterceptors(ResponseInterceptor)
export class AiEbookController {
	// 构造函数，注入服务层
	constructor(private readonly aiEbookService: AiEbookService) {}

	// GET 请求，路径为 /ai-ebook/getBooks
	@Get('/getBooks')
	// 获取书籍列表接口，接收查询参数
	getBooks(@Query() query: GetAiEbooksQuery) {
		// 调用服务层的 findAll 方法
		return this.aiEbookService.findAll(query);
	}
}
```

### 4.4 AiEbookModule

> 来源：`apps/backend/src/services/ai-ebook/ai-ebook.module.ts`

```typescript
// 从 @nestjs/common 引入模块装饰器
import { Module } from '@nestjs/common';
// 引入 TypeOrmModule，用于注册实体
import { TypeOrmModule } from '@nestjs/typeorm';
// 引入数据库连接常量
import { DB_CONNECTIONS } from '../../database/constants';
// 引入角色守卫
import { RoleGuard } from '../../guards/role.guard';
// 引入 AI 用户实体
import { AiUser } from '../ai-user/ai-user.entity';
// 引入用户模块
import { UserModule } from '../user/user.module';
// 引入控制器
import { AiEbookController } from './ai-ebook.controller';
// 引入服务
import { AiEbookService } from './ai-ebook.service';
// 引入实体
import { AiEbookBook } from './ai-ebook-book.entity';

// 声明为 NestJS 模块
@Module({
	// 导入 TypeOrmModule，注册 AiEbookBook 和 AiUser 实体到 AI 数据库连接
	imports: [
		TypeOrmModule.forFeature([AiEbookBook, AiUser], DB_CONNECTIONS.AI),
		// 导入用户模块
		UserModule,
	],
	// 注册控制器
	controllers: [AiEbookController],
	// 注册服务和守卫为提供者
	providers: [AiEbookService, RoleGuard],
	// 导出服务供其他模块使用
	exports: [AiEbookService],
})
export class AiEbookModule {}
```

### 4.5 AiEbooksPage 前端组件

> 来源：`apps/frontend/src/views/ai-ebooks/AiEbooksPage.tsx`

```typescript
// 从 antd 引入 UI 组件
import { Alert, Button, Input, Space, Table, Tag, Typography } from 'antd';
// 从 react 引入钩子
import { useEffect, useState } from 'react';
// 引入表格分页工具
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
// 引入 API 调用方法
import { getAiEbooksApi } from '@/service';

// 定义表格行数据的类型
type AiEbookRow = {
	// 书籍 ID
	id: string;
	// 书名
	title: string;
	// 作者，可能为空
	author: string | null;
	// 书籍格式
	fmt: string;
	// 文件大小，可能为空
	size: string | null;
	// 是否公开
	isPublic: boolean;
	// 解析状态，可能为空
	parseStatus: string | null;
	// 总字数，可能为空
	totalWordCount: number | null;
	// 创建时间
	createdAt: string;
	// 关联的用户信息，可能为空
	user?: { id: number; username: string; email: string } | null;
};

// 格式化字节大小，将字节数转为人类可读格式
function formatBytes(v?: string | null) {
	// 将字符串转为数字
	const n = Number(v);
	// 如果不是有效数字或小于等于 0，显示占位符
	if (!Number.isFinite(n) || n <= 0) return '—';
	// 定义单位数组
	const units = ['B', 'KB', 'MB', 'GB'];
	// 单位索引
	let i = 0;
	// 当前大小
	let size = n;
	// 循环除以 1024 直到合适的单位
	while (size >= 1024 && i < units.length - 1) {
		// 除以 1024 转换到下一级单位
		size /= 1024;
		// 单位索引加 1
		i += 1;
	}
	// 格式化输出，无小数或保留一位小数
	return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 格式化时间字符串
function formatTime(v?: string) {
	// 空值显示占位符
	if (!v) return '—';
	// 创建日期对象
	const d = new Date(v);
	// 如果日期无效，返回原始字符串
	if (Number.isNaN(d.getTime())) return v;
	// 补零函数，将个位数补前导零
	const p = (n: number) => String(n).padStart(2, '0');
	// 拼接格式化后的时间字符串
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 导出主页面组件
export function AiEbooksPage() {
	// 书籍列表状态
	const [list, setList] = useState<AiEbookRow[]>([]);
	// 总条数状态
	const [total, setTotal] = useState(0);
	// 当前页码状态
	const [pageNo, setPageNo] = useState(1);
	// 每页条数状态
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	// 书名搜索关键词状态
	const [title, setTitle] = useState('');
	// 用户名搜索关键词状态
	const [username, setUsername] = useState('');
	// 错误信息状态
	const [error, setError] = useState('');

	// 加载数据的异步函数
	const load = async (page = pageNo, size = pageSize) => {
		try {
			// 清除之前的错误
			setError('');
			// 调用 API 获取书籍列表
			const res = await getAiEbooksApi({
				// 当前页码
				pageNo: page,
				// 每页条数
				pageSize: size,
				// 书名关键词，空字符串转为 undefined
				title: title || undefined,
				// 用户名关键词，空字符串转为 undefined
				username: username || undefined,
			});
			// 提取响应数据
			const data = res.data as { list: AiEbookRow[]; total: number };
			// 更新列表数据
			setList(data.list);
			// 更新总条数
			setTotal(data.total);
			// 更新当前页码
			setPageNo(page);
			// 更新每页条数
			setPageSize(size);
		} catch (e: any) {
			// 出错时清空列表
			setList([]);
			// 出错时将总数置零
			setTotal(0);
			// 设置错误信息，优先使用异常消息
			setError(
				e?.message ||
					'AI 业务库不可用，请确认 AI_DB_ENABLED=true 且 dnhyxc-ai MySQL 已启动',
			);
		}
	};

	// 组件挂载时加载初始数据
	useEffect(() => {
		// 加载第一页，使用默认每页大小
		load(1, DEFAULT_PAGE_SIZE);
		// 空依赖数组，仅挂载时执行一次
	}, []);

	// 返回 JSX 页面
	return (
		// 根容器
		<div>
			// 顶部操作栏，包含标题和搜索条件
			<div
				style={{
					// 使用弹性布局
					display: 'flex',
					// 两端对齐
					justifyContent: 'space-between',
					// 垂直居中
					alignItems: 'center',
					// 元素间距
					gap: 16,
					// 底部外边距
					marginBottom: 16,
				}}
			>
				// 左侧显示统计信息
				<Typography.Text type="secondary">
					读取 dnhyxc-ai 业务库 ebook_book · 共 {total} 本
				</Typography.Text>
				// 右侧搜索操作区
				<Space wrap>
					// 书名搜索输入框
					<Input
						placeholder="书名"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						style={{ width: 180 }}
						allowClear
					/>
					// 用户名搜索输入框
					<Input
						placeholder="用户名"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						style={{ width: 160 }}
						allowClear
					/>
					// 查询按钮
					<Button type="primary" onClick={() => load(1, pageSize)}>
						查询
					</Button>
				</Space>
			</div>

			// 错误提示区域
			{error && (
				<Alert
					type="warning"
					showIcon
					message={error}
					style={{ marginBottom: 16 }}
				/>
			)}

			// 书籍列表表格
			<Table
				rowKey="id"
				dataSource={list}
				pagination={tablePagination(total, pageNo, pageSize, load)}
				scroll={{ x: 1100 }}
				locale={{ emptyText: error ? ' ' : '暂无数据' }}
				columns={[
					// 书名列
					{
						title: '书名',
						dataIndex: 'title',
						ellipsis: true,
					},
					// 作者列
					{
						title: '作者',
						dataIndex: 'author',
						width: 140,
						ellipsis: true,
						render: (v: string | null) => v || '—',
					},
					// 所属用户列
					{
						title: '所属用户',
						width: 140,
						render: (_, r) => r.user?.username || '—',
					},
					// 格式列
					{
						title: '格式',
						dataIndex: 'fmt',
						width: 90,
						render: (v: string) => <Tag>{(v || '').toUpperCase()}</Tag>,
					},
					// 大小列
					{
						title: '大小',
						dataIndex: 'size',
						width: 100,
						render: (v: string | null) => formatBytes(v),
					},
					// 是否公开列
					{
						title: '公开',
						dataIndex: 'isPublic',
						width: 80,
						render: (v: boolean) =>
							v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
					},
					// 解析状态列
					{
						title: '解析',
						dataIndex: 'parseStatus',
						width: 100,
						render: (v: string | null) => {
							if (!v) return '—';
							const color =
								v === 'ready'
									? 'success'
									: v === 'failed'
										? 'error'
										: 'default';
							return <Tag color={color}>{v}</Tag>;
						},
					},
					// 添加时间列
					{
						title: '添加时间',
						dataIndex: 'createdAt',
						width: 180,
						render: (v: string) => formatTime(v),
					},
				]}
			/>
		</div>
	);
}
```

## 5. 兼容性与影响

- **只读访问**：实体仅做查询操作，不会修改 AI 业务库数据
- **连接检查**：服务层在每次查询前检查 AI 数据源连接状态，未连接时返回 503
- **权限控制**：需要 JWT 认证，仅 ADMIN 和 USER 角色可访问
- **数据过滤**：默认排除读者副本（`sourceBookId IS NOT NULL`），只展示主书
- **搜索**：书名和用户名均为模糊匹配，使用 `%keyword%` 模式

## 6. 相关源码路径

| 用途 | 路径 |
|------|------|
| 实体定义 | `apps/backend/src/services/ai-ebook/ai-ebook-book.entity.ts` |
| 服务层 | `apps/backend/src/services/ai-ebook/ai-ebook.service.ts` |
| 控制器 | `apps/backend/src/services/ai-ebook/ai-ebook.controller.ts` |
| 模块定义 | `apps/backend/src/services/ai-ebook/ai-ebook.module.ts` |
| 前端页面 | `apps/frontend/src/views/ai-ebooks/AiEbooksPage.tsx` |
| 数据库常量 | `apps/backend/src/database/constants.ts` |
| AI 用户实体 | `apps/backend/src/services/ai-user/ai-user.entity.ts` |

---

> 若与仓库最新源码不一致，以源码为准。