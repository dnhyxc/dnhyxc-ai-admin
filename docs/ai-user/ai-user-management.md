# AI 用户管理实现

## 1. 背景与目标

管理后台需要查看 `dnhyxc-ai` 业务库中的 AI 业务用户（只读管理子集）。

**目标：**
- 只读用户管理
- 查看会员信息
- 查看角色关联
- 搜索与分页

## 2. 改动范围

| 文件 | 说明 |
|------|------|
| `ai-role.entity.ts` | AI 角色 TypeORM 实体映射 |
| `ai-user.entity.ts` | AI 用户 TypeORM 实体映射（含 ManyToMany 关联） |
| `ai-user.service.ts` | 业务逻辑层：查询、健康检查、仪表盘指标 |
| `ai-user.module.ts` | NestJS 模块注册（多数据源、Guard） |
| `AiUsersPage.tsx` | 前端用户管理页面（Ant Design Table） |

## 3. 核心思路

- **ManyToMany 关系**：`AiUser` 与 `AiRole` 通过 `user_roles` 中间表实现多对多关联
- **只读设计**：不提供创建/更新/删除操作，仅支持查询
- **字段安全**：使用 `select` 限定返回字段，避免敏感数据泄露
- **懒加载健康检查**：`assertReady()` 在每次查询前检查 AI 数据源连接状态

## 4. 关键代码

### 4.1 AiRole 实体

**来源**: `apps/backend/src/services/ai-user/ai-role.entity.ts` (当前, 约 L1-L23 行)

```typescript
// 从 typeorm 导入实体装饰器、列装饰器、多对多装饰器、主键自增装饰器
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
// 导入 AiUser 实体，用于声明多对多关系的另一端
import { AiUser } from './ai-user.entity';

/**
 * 映射 dnhyxc-ai 业务库 `roles` 表（只读子集，仅展示用）
 */
// 声明该类为 TypeORM 实体，对应数据库表名为 'roles'
@Entity({ name: 'roles' })
export class AiRole {
	// 主键自增列，TypeORM 自动生成 id 字段
	@PrimaryGeneratedColumn()
	// 角色唯一标识（主键）
	id: number;

	// 普通列，映射角色名称
	@Column()
	// 角色名称（如 "admin"、"vip" 等）
	name: string;

	// 普通列，设置默认值为空字符串，映射角色描述
	@Column({ default: '' })
	// 角色描述信息
	description: string;

	// 多对多关系：一个角色可以被多个用户拥有
	// () => AiUser 指定关联目标实体
	// (user) => user.roles 指定反向关联属性（AiUser 中的 roles 字段）
	@ManyToMany(
		() => AiUser,
		(user) => user.roles,
	)
	// 拥有该角色的用户列表（只读，由 AiUser 侧的 @JoinTable 维护中间表）
	users: AiUser[];
}
```

### 4.2 AiUser 实体

**来源**: `apps/backend/src/services/ai-user/ai-user.entity.ts` (当前, 约 L1-L46 行)

```typescript
// 从 typeorm 导入实体所需的装饰器：列、实体、 JoinTable（用于指定中间表）、多对多、主键自增
import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';
// 导入 AiRole 实体，用于声明多对多关系
import { AiRole } from './ai-role.entity';

/**
 * 映射 dnhyxc-ai 业务库 `user` 表（只读管理子集）
 */
// 声明该类为 TypeORM 实体，对应数据库表名为 'user'
@Entity({ name: 'user' })
export class AiUser {
	// 主键自增列
	@PrimaryGeneratedColumn()
	// 用户唯一标识（主键）
	id: number;

	// 普通列，映射用户名
	@Column()
	// 用户登录名
	username: string;

	// 普通列，映射邮箱
	@Column()
	// 用户邮箱地址
	email: string;

	// 自定义列映射：指定数据库列名为 'createTime'，类型为 timestamp，允许为空
	@Column({ name: 'createTime', type: 'timestamp', nullable: true })
	// 用户注册时间，可能为 null
	createTime: Date | null;

	// 布尔列，默认值为 false，表示是否为会员
	@Column({ type: 'boolean', default: false })
	// 是否为付费会员
	isMember: boolean;

	// 可变长字符串列，最大长度 32，默认值为 'free'
	@Column({ type: 'varchar', length: 32, default: 'free' })
	// 会员类型（如 'free'、'monthly'、'yearly' 等）
	membershipType: string;

	// 时间戳列，允许为空，表示会员到期时间
	@Column({ type: 'timestamp', nullable: true })
	// 会员过期时间，可能为 null
	memberExpiresAt: Date | null;

	// 多对多关系：一个用户可以拥有多个角色
	// () => AiRole 指定关联目标实体
	// (role) => role.users 指定反向关联属性（AiRole 中的 users 字段）
	@ManyToMany(
		() => AiRole,
		(role) => role.users,
	)
	// 定义中间表：'user_roles' 为关联表名
	// joinColumn: 当前实体在中间表的外键列（userId → id）
	// inverseJoinColumn: 目标实体在中间表的外键列（rolesId → id）
	@JoinTable({
		name: 'user_roles',
		joinColumn: { name: 'userId', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'rolesId', referencedColumnName: 'id' },
	})
	// 当前用户拥有的角色列表
	roles: AiRole[];
}
```

### 4.3 AiUserService.findAll() 方法

**来源**: `apps/backend/src/services/ai-user/ai-user.service.ts` (当前, 约 L1-L52 行)

```typescript
// 从 NestJS 核心导入可注入装饰器和服务不可用异常
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
// 从 typeorm 的 NestJS 集成导入数据源注入和仓库注入装饰器
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
// 从 typeorm 导入数据源、Like 操作符（用于模糊查询）、仓库类型
import { DataSource, Like, Repository } from 'typeorm';
// 导入数据库连接常量，用于指定 AI 业务库的连接名
import { DB_CONNECTIONS } from '../../database/constants';
// 导入 AiUser 实体
import { AiUser } from './ai-user.entity';

// 声明该类为可注入的服务提供者
@Injectable()
export class AiUserService {
	// 构造函数：通过依赖注入获取 AI 用户仓库和数据源
	constructor(
		// 注入 AiUser 仓库，使用 AI 数据源（非默认数据源）
		@InjectRepository(AiUser, DB_CONNECTIONS.AI)
		// AI 用户实体仓库，用于执行数据库操作
		private readonly aiUserRepository: Repository<AiUser>,
		// 注入 AI 数据源，用于健康检查和原生 SQL 查询
		@InjectDataSource(DB_CONNECTIONS.AI)
		// AI 业务数据源实例
		private readonly aiDataSource: DataSource,
	) {}

	// 私有方法：检查 AI 数据源是否已初始化，未初始化则抛出 503 异常
	private assertReady() {
		// 如果数据源未初始化
		if (!this.aiDataSource?.isInitialized) {
			// 抛出服务不可用异常，提示 AI 业务库未连接
			throw new ServiceUnavailableException(
				'AI 业务库未连接，请确认 dnhyxc-ai MySQL 已启动且 AI_DB_* 配置正确',
			);
		}
	}

	// 查找所有 AI 用户（分页 + 搜索），支持可选的分页和用户名搜索参数
	async findAll(query: {
		// 页码，可选，默认 1
		pageNo?: number;
		// 每页条数，可选，默认 10
		pageSize?: number;
		// 用户名搜索关键字，可选
		username?: string;
	}) {
		// 执行健康检查，确保 AI 库可用
		this.assertReady();
		// 设置默认页码为 1
		const pageNo = query.pageNo || 1;
		// 设置默认每页条数为 10
		const pageSize = query.pageSize || 10;
		// 使用 findAndCount 同时获取分页数据和总数
		const [list, total] = await this.aiUserRepository.findAndCount({
			// 如果传入了用户名关键字，则使用 Like 进行模糊匹配（%关键字%）
			where: query.username
				? { username: Like(`%${query.username}%`) }
				: undefined,
			// 关联查询角色信息（多对多关系）
			relations: { roles: true },
			// 安全选择：仅返回必要字段，避免暴露敏感数据
			select: {
				// 用户 ID
				id: true,
				// 用户名
				username: true,
				// 邮箱
				email: true,
				// 注册时间
				createTime: true,
				// 是否会员
				isMember: true,
				// 会员类型
				membershipType: true,
				// 会员过期时间
				memberExpiresAt: true,
				// 角色信息：只返回角色 ID 和名称
				roles: { id: true, name: true },
			},
			// 分页：限制返回条数
			take: pageSize,
			// 分页：跳过前面的记录
			skip: (pageNo - 1) * pageSize,
			// 排序：按 ID 降序（最新注册的排在前面）
			order: { id: 'DESC' },
		});
		// 返回列表和总数
		return { list, total };
	}
```

### 4.4 AiUsersPage 前端组件

**来源**: `apps/frontend/src/views/ai-users/AiUsersPage.tsx` (当前, 约 L1-L128 行)

```typescript
// 从 antd 导入 UI 组件：警告提示、按钮、输入框、间距布局、表格、标签、排版文本
import { Alert, Button, Input, Space, Table, Tag, Typography } from 'antd';
// 从 React 导入副作用钩子和状态钩子
import { useEffect, useState } from 'react';
// 从项目工具库导入默认分页大小和表格分页配置函数
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
// 从项目服务层导入获取 AI 用户列表的 API 方法
import { getAiUsersApi } from '@/service';

// 定义前端 AiUser 类型，与后端返回字段对齐
type AiUser = {
	// 用户 ID
	id: number;
	// 用户名
	username: string;
	// 邮箱
	email: string;
	// 是否会员
	isMember: boolean;
	// 会员类型
	membershipType: string;
	// 会员过期时间（ISO 字符串或 null）
	memberExpiresAt: string | null;
	// 注册时间（ISO 字符串或 null）
	createTime: string | null;
	// 角色列表（可选）
	roles?: Array<{ id: number; name: string }>;
};

// AI 用户管理页面组件（函数式组件）
export function AiUsersPage() {
	// 用户列表数据状态
	const [list, setList] = useState<AiUser[]>([]);
	// 总记录数状态
	const [total, setTotal] = useState(0);
	// 当前页码状态
	const [pageNo, setPageNo] = useState(1);
	// 每页条数状态
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	// 用户名搜索关键字状态
	const [username, setUsername] = useState('');
	// 错误信息状态
	const [error, setError] = useState('');

	// 加载数据的异步函数，接受页码和页大小参数
	const load = async (page = pageNo, size = pageSize) => {
		try {
			// 清空之前的错误信息
			setError('');
			// 调用后端 API 获取 AI 用户列表
			const res = await getAiUsersApi({
				// 传入当前页码
				pageNo: page,
				// 传入每页条数
				pageSize: size,
				// 传入用户名搜索关键字（空字符串时传 undefined 以跳过搜索）
				username: username || undefined,
			});
			// 将后端返回的数据断言为 { list, total } 结构
			const data = res.data as { list: AiUser[]; total: number };
			// 更新用户列表状态
			setList(data.list);
			// 更新总记录数状态
			setTotal(data.total);
			// 更新当前页码状态
			setPageNo(page);
			// 更新每页条数状态
			setPageSize(size);
		} catch (e: any) {
			// 请求失败时清空列表
			setList([]);
			// 请求失败时将总数置零
			setTotal(0);
			// 设置错误提示信息，优先使用后端错误消息
			setError(
				e?.message ||
					'AI 业务库不可用，请确认 AI_DB_ENABLED=true 且 dnhyxc-ai MySQL 已启动',
			);
		}
	};

	// 组件挂载后执行首次加载
	useEffect(() => {
		// 从第 1 页开始，使用默认页大小加载
		load(1, DEFAULT_PAGE_SIZE);
	}, []);

	// 渲染页面
	return (
		// 根容器 div
		<div>
			// 顶部工具栏：显示总数和搜索控件
			<div
				// 使用内联样式实现 flex 布局，两端对齐，垂直居中
				style={{
					// 使用 flex 布局
					display: 'flex',
					// 两端对齐
					justifyContent: 'space-between',
					// 垂直居中
					alignItems: 'center',
					// 子元素间距
					gap: 16,
					// 底部外边距
					marginBottom: 16,
				}}
			>
				// 左侧：显示总人数提示
				<Typography.Text type="secondary">
					读取 dnhyxc-ai 业务库 · 共 {total} 人
				</Typography.Text>
				// 右侧：搜索控件组
				<Space>
					// 用户名搜索输入框
					<Input
						// 占位提示文字
						placeholder="搜索用户名"
						// 受控组件：绑定 username 状态
						value={username}
						// 输入变化时更新 username 状态
						onChange={(e) => setUsername(e.target.value)}
						// 固定宽度 200px
						style={{ width: 200 }}
						// 允许一键清除
						allowClear
						// 回车键触发搜索（从第 1 页开始）
						onPressEnter={() => load(1, pageSize)}
					/>
					// 查询按钮
					<Button type="primary" onClick={() => load(1, pageSize)}>
						查询
					</Button>
				</Space>
			</div>

			// 错误提示区域：仅在有错误时显示
			{error && (
				<Alert
					// 警告类型提示
					type="warning"
					// 显示图标
					showIcon
					// 提示内容为错误信息
					message={error}
					// 底部外边距
					style={{ marginBottom: 16 }}
				/>
			)}

			// 用户数据表格
			<Table
				// 行唯一标识使用 id 字段
				rowKey="id"
				// 数据源为用户列表
				dataSource={list}
				// 自定义空数据文本：有错误时显示空格（隐藏），无错误时显示"暂无数据"
				locale={{ emptyText: error ? ' ' : '暂无数据' }}
				// 分页配置：使用项目统一的分页工具函数
				pagination={tablePagination(total, pageNo, pageSize, load)}
				// 表格列定义
				columns={[
					// 第一列：ID，固定宽度 80px
					{ title: 'ID', dataIndex: 'id', width: 80 },
					// 第二列：用户名
					{ title: '用户名', dataIndex: 'username' },
					// 第三列：邮箱
					{ title: '邮箱', dataIndex: 'email' },
					// 第四列：角色标签列表
					{
						// 列标题
						title: '角色',
						// 数据字段
						dataIndex: 'roles',
						// 自定义渲染：将角色数组渲染为 Tag 标签列表
						render: (roles: AiUser['roles']) =>
							// 如果有角色则渲染标签列表，否则显示 "—"
							roles?.length
								? roles.map((r) => (
										// 每个角色渲染为一个 Tag，管理员角色使用金色
										<Tag key={r.id} color={r.id === 1 ? 'gold' : 'default'}>
											{r.name}
										</Tag>
									))
								: '—',
					},
					// 第五列：会员状态
					{
						// 列标题
						title: '会员',
						// 数据字段
						dataIndex: 'isMember',
						// 自定义渲染：布尔值渲染为绿色"是"或灰色"否"标签
						render: (v: boolean) =>
							v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
					},
					// 第六列：会员类型
					{ title: '类型', dataIndex: 'membershipType' },
					// 第七列：注册时间
					{
						// 列标题
						title: '注册时间',
						// 数据字段
						dataIndex: 'createTime',
						// 自定义渲染：格式化日期为中文本地格式
						render: (v: string | null) =>
							v ? new Date(v).toLocaleString('zh-CN') : '—',
					},
				]}
			/>
		</div>
	);
}
```

## 5. 兼容性与影响

| 影响项 | 说明 |
|--------|------|
| 多数据源依赖 | 依赖 `DB_CONNECTIONS.AI` 数据源正确配置，若 AI 库未启用则接口返回 503 |
| 只读约束 | 后端未暴露 create/update/delete 接口，前端无相关按钮，确保只读安全 |
| 字段暴露控制 | `select` 限定了返回字段，`passwordHash` 等敏感字段不会泄露 |
| 性能影响 | `findAndCount` 在大数据量下 `COUNT` 查询可能较慢，已通过分页限制 `pageSize` |
| 搜索模糊匹配 | 使用 `LIKE '%keyword%'` 全表扫描，无索引优化，适用于管理后台低频查询场景 |
| 健康检查 | 每次请求都执行 `assertReady()`，增加少量开销但保障系统健壮性 |

## 6. 相关源码路径

| 层级 | 路径 |
|------|------|
| 后端实体 | `apps/backend/src/services/ai-user/ai-role.entity.ts` |
| 后端实体 | `apps/backend/src/services/ai-user/ai-user.entity.ts` |
| 后端服务 | `apps/backend/src/services/ai-user/ai-user.service.ts` |
| 后端模块 | `apps/backend/src/services/ai-user/ai-user.module.ts` |
| 前端页面 | `apps/frontend/src/views/ai-users/AiUsersPage.tsx` |
| 分页工具 | `apps/frontend/src/lib/table-pagination.ts` |

---

若与仓库最新源码不一致，以源码为准。