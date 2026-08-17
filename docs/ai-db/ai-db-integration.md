# AI 业务库集成实现

## 1. 背景与目标

Dnhyxc AI Admin 管理后台需要同时操作两个独立的数据库：
- **Admin 管理库**（默认连接）：存储管理员账号、角色、菜单、后台日志等管理系统自身数据
- **AI 业务库**（命名连接 `ai`）：存储 AI 产品的业务数据（用户、电子书、日志等），只读管理子集

本实现的目标是：
1. 通过 TypeORM 命名连接机制集成 AI 业务库
2. 确保 AI 业务库**只读**访问，严禁 `synchronize` 误改产品表结构
3. AI 业务库不可用时不阻断 Admin 主流程，采用懒加载 + 健康检查模式
4. 通过环境变量灵活控制 AI 库的启用状态与连接参数

## 2. 改动范围

| 文件路径 | 说明 |
|----------|------|
| `apps/backend/src/database/typeorm-ai.config.ts` | **新增** — AI 业务库 TypeORM 配置工厂 |
| `apps/backend/src/database/typeorm-ai.config.ts` | 注册 AI 库实体（AiUser、AiRole、AiLog、AiEbookBook） |
| `apps/backend/src/app.module.ts` | 根据 AI_DB_ENABLED 动态引入 AI 模块 |
| `apps/backend/src/services/ai-ebook/ai-ebook.module.ts` | 使用命名连接 `ai` 注册仓库 |
| `apps/backend/src/services/ai-logs/ai-logs.module.ts` | 使用命名连接 `ai` 注册仓库 |
| `apps/backend/src/services/ai-user/ai-user.module.ts` | 使用命名连接 `ai` 注册仓库 |
| `apps/backend/src/services/health/health.controller.ts` | 健康检查增加 AI 库状态 |
| `apps/backend/src/services/dashboard/dashboard.service.ts` | 仪表盘集成 AI 库统计 |

## 3. 核心思路

### 3.1 双库架构

```
TypeORM 多连接
├── 默认连接 (admin)     → Admin 管理库
│   ├── User, Roles, Menus, Logs, Profile
│   └── synchronize: true
│
└── 命名连接 "ai"        → AI 业务库
    ├── AiUser, AiRole, AiLog, AiEbookBook
    └── synchronize: false
```

### 3.2 关键设计决策

1. **禁止自动同步**：AI 业务库设置 `synchronize: false`，防止管理后台误改产品表结构
2. **懒加载实体**：AI 库实体只在对应模块中通过 `TypeOrmModule.forFeature([...], DB_CONNECTIONS.AI)` 注册
3. **启用开关**：通过 `AI_DB_ENABLED` 环境变量控制是否启用 AI 库功能，便于开发/测试环境独立调试
4. **连接池控制**：`AI_DB_POOL_SIZE` 限制 AI 库连接数，避免占用过多资源
5. **优雅降级**：AI 库不可用时，管理后台其他功能正常运行，仪表盘显示降级提示

### 3.3 健康检查策略

每个 AI 服务内部实现 `assertReady()` 方法，在执行任何数据库操作前检查数据源是否初始化：

- 未初始化时抛出 `ServiceUnavailableException`
- 前端捕获后显示友好提示
- 健康检查接口 `/health` 返回 AI 库连接状态

## 4. 关键代码

### 4.1 TypeORM AI 库配置

**来源**: `apps/backend/src/database/typeorm-ai.config.ts` (当前, 全文)

```typescript
// 引入 TypeOrmOptionsFactory 接口，用于创建 TypeORM 配置
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
// 引入 ConfigService，用于读取环境变量配置
import { ConfigService } from '@nestjs/config';
// 引入 AI 数据库配置枚举，定义环境变量 key
import { AiDbEnum } from '../enum/config.enum';
// 引入 AI 业务库的所有实体
import { AiUser } from '../services/ai-user/ai-user.entity';
import { AiRole } from '../services/ai-user/ai-role.entity';
import { AiLog } from '../services/ai-logs/ai-log.entity';
import { AiEbookBook } from '../services/ai-ebook/ai-ebook-book.entity';
// 引入布尔值解析工具函数
import { parseBoolean } from '../utils';

// TypeOrmAiConfigService 实现 TypeOrmOptionsFactory 接口
// 用于创建 AI 业务库的 TypeORM 连接配置
@Injectable()
export class TypeOrmAiConfigService implements TypeOrmOptionsFactory {
  // 注入 NestJS Logger，用于打印配置相关的日志
  private readonly logger = new Logger(TypeOrmAiConfigService.name);

  // 构造函数注入 ConfigService，用于读取环境变量
  constructor(private readonly configService: ConfigService) {}

  // 创建 TypeORM 配置选项的核心方法
  createTypeOrmOptions(): TypeOrmModuleOptions {
    // 读取 AI 库启用开关，默认 true
    const enabled = parseBoolean(
      this.configService.get(AiDbEnum.AI_DB_ENABLED),
      true,
    );
    // 读取连接池大小配置，默认 5
    const poolSize = Number(
      this.configService.get(AiDbEnum.AI_DB_POOL_SIZE) ?? 5,
    );

    // 如果 AI 库被禁用，打印警告日志
    if (!enabled) {
      this.logger.warn('AI 业务库已禁用（AI_DB_ENABLED=false）');
    }

    // 返回 TypeORM 连接配置
    return {
      // 命名连接为 "ai"，便于在 forFeature 中引用
      name: 'ai',
      // 数据库类型为 MySQL
      type: 'mysql',
      // 从环境变量读取主机地址，默认 127.0.0.1
      host: this.configService.get<string>(AiDbEnum.AI_DB_HOST) || '127.0.0.1',
      // 从环境变量读取端口，默认 3090（AI 库独立端口）
      port: Number(this.configService.get(AiDbEnum.AI_DB_PORT) || 3090),
      // 读取数据库用户名，默认 root
      username:
        this.configService.get<string>(AiDbEnum.AI_DB_USERNAME) || 'root',
      // 读取数据库密码，默认空
      password: this.configService.get<string>(AiDbEnum.AI_DB_PASSWORD) || '',
      // 读取数据库名，默认 dnhyxc_ai_db
      database:
        this.configService.get<string>(AiDbEnum.AI_DB_DATABASE) ||
        'dnhyxc_ai_db',
      // 设置时区为 UTC
      timezone: 'Z',
      // 注册 AI 业务库相关的实体
      entities: [AiUser, AiRole, AiLog, AiEbookBook],
      // 硬约束：禁止自动同步表结构，防止误改产品表
      synchronize: false,
      // 关闭日志，避免生产环境日志过多
      logging: false,
      // 根据启用开关决定重试次数
      retryAttempts: enabled ? 2 : 0,
      // 重试间隔 2 秒
      retryDelay: 2000,
      // 关闭自动加载实体（已手动指定）
      autoLoadEntities: false,
      // MySQL 连接池和保活配置
      extra: {
        timezone: 'Z',
        connectionLimit: poolSize,
        waitForConnections: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      },
    };
  }
}
```

**变更摘要**: 新增 TypeORM 命名连接配置，支持 AI 业务库的独立连接管理。通过 `synchronize: false` 确保只读安全，通过 `retryAttempts` 和 `enabled` 开关实现优雅降级。

### 4.2 应用模块动态引入

**来源**: `apps/backend/src/app.module.ts` (当前, 关键部分)

```typescript
// 引入全局装饰器
import { Global } from '@nestjs/common';
// 引入配置模块
import { ConfigModule } from '@nestjs/config';
// 引入数据库模块和 AI_DB_ENABLED 常量
import { AI_DB_ENABLED, DatabaseModule } from './database/database.module';
// 引入 AI 相关模块
import { AiEbookModule } from './services/ai-ebook/ai-ebook.module';
import { AiLogsModule } from './services/ai-logs/ai-logs.module';
import { AiUserModule } from './services/ai-user/ai-user.module';

// 应用根模块，注册所有功能模块
@Global()
@Module({
  imports: [
    // 配置模块，使用 appConfig 工厂
    ConfigModule.forRoot(appConfig()),
    // 数据库模块（含 Admin + AI 双连接）
    DatabaseModule,
    // ... 其他后台模块（Logs, User, Roles, Menus, Auth, Seed, Health, Dashboard）
    // 根据 AI_DB_ENABLED 常量动态决定是否加载 AI 业务模块
    ...(AI_DB_ENABLED ? [AiUserModule, AiLogsModule, AiEbookModule] : []),
  ],
  providers: [Logger],
  exports: [Logger],
})
export class AppModule {}
```

**变更摘要**: 通过展开运算符 `...(AI_DB_ENABLED ? [...] : [])` 实现 AI 模块的条件加载。当 AI 库不可用时，这些模块不会被注册，避免启动失败。

### 4.3 AI 模块命名连接注册

**来源**: `apps/backend/src/services/ai-ebook/ai-ebook.module.ts` (当前, 全文)

```typescript
// 引入 NestJS Module 装饰器
import { Module } from '@nestjs/common';
// 引入 TypeOrmModule，用于注册实体仓库
import { TypeOrmModule } from '@nestjs/typeorm';
// 引入数据库连接常量
import { DB_CONNECTIONS } from '../../database/constants';
// 引入角色守卫
import { RoleGuard } from '../../guards/role.guard';
// 引入 AI 用户实体（用于关联查询）
import { AiUser } from '../ai-user/ai-user.entity';
// 引入用户模块（导出 UserService 等）
import { UserModule } from '../user/user.module';
// 引入 AI 电子书控制器
import { AiEbookController } from './ai-ebook.controller';
// 引入 AI 电子书服务
import { AiEbookService } from './ai-ebook.service';
// 引入 AI 电子书实体
import { AiEbookBook } from './ai-ebook-book.entity';

// AI 电子书模块定义
@Module({
  // 使用命名连接 'ai' 注册实体仓库
  // AiEbookBook 是主实体，AiUser 用于关联查询
  imports: [
    TypeOrmModule.forFeature([AiEbookBook, AiUser], DB_CONNECTIONS.AI),
    UserModule,
  ],
  // 注册控制器
  controllers: [AiEbookController],
  // 注册服务和守卫
  providers: [AiEbookService, RoleGuard],
  // 导出服务供其他模块使用
  exports: [AiEbookService],
})
export class AiEbookModule {}
```

**变更摘要**: 通过 `TypeOrmModule.forFeature([...], DB_CONNECTIONS.AI)` 第二个参数指定命名连接，确保实体仓库绑定到 AI 业务库而非默认管理库。

### 4.4 服务层健康检查

**来源**: `apps/backend/src/services/ai-ebook/ai-ebook.service.ts` (当前, 健康检查部分)

```typescript
// 引入 NestJS 的注入装饰器和异常类
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
// 引入 TypeORM 的数据源和仓库注入装饰器
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
// 引入 TypeORM 的数据源类型和查询构建器
import { DataSource } from 'typeorm';
// 引入数据库连接常量
import { DB_CONNECTIONS } from '../../database/constants';
// 引入实体
import { AiEbookBook } from './ai-ebook-book.entity';

// AI 电子书服务
@Injectable()
export class AiEbookService {
  constructor(
    // 注入 AI 库的实体仓库
    @InjectRepository(AiEbookBook, DB_CONNECTIONS.AI)
    private readonly ebookRepository: Repository<AiEbookBook>,
    // 注入 AI 库的数据源（用于健康检查）
    @InjectDataSource(DB_CONNECTIONS.AI)
    private readonly aiDataSource: DataSource,
  ) {}

  // 私有方法：检查 AI 库是否就绪
  // 在每次数据库操作前调用，确保数据源已初始化
  private assertReady() {
    // 检查数据源是否存在且已初始化
    if (!this.aiDataSource?.isInitialized) {
      // 抛出服务不可用异常，携带友好提示信息
      throw new ServiceUnavailableException(
        'AI 业务库未连接，请确认 dnhyxc-ai MySQL 已启动且 AI_DB_* 配置正确',
      );
    }
  }

  // 查找所有电子书，支持分页和条件查询
  async findAll(query: { pageNo?: number; pageSize?: number; title?: string; username?: string }) {
    // 在执行任何数据库操作前，先检查连接状态
    this.assertReady();
    // ... 查询逻辑
  }

  // 统计书籍总数
  async count() {
    // 同样需要检查连接状态
    this.assertReady();
    // ... 计数逻辑
  }
}
```

**变更摘要**: 每个 AI 服务实现统一的 `assertReady()` 健康检查方法，在所有数据库操作前调用。这确保了 AI 库不可用时能快速失败并给出明确错误信息。

## 5. 兼容性与影响

### 5.1 行为变化

| 场景 | 行为 |
|------|------|
| AI 库正常运行 | 所有 AI 功能正常可用 |
| AI 库未启动 | 管理后台核心功能正常，AI 相关功能显示不可用提示 |
| AI_DB_ENABLED=false | AI 模块不加载，启动更快，适合独立调试 Admin 功能 |
| 端口冲突 | 通过 AI_DB_PORT 环境变量调整 |

### 5.2 风险与回归

- **建议测试路径**：
  1. 正常启动，所有 AI 功能可用
  2. 关闭 AI 库后启动，确认管理后台核心功能不受影响
  3. AI 库运行中手动停止，确认错误提示友好
  4. 修改 AI_DB_ENABLED 为 false，确认 AI 模块不加载
  5. 仪表盘在 AI 库不可用时正确显示降级信息

## 6. 相关源码路径

| 说明 | 路径 |
|------|------|
| AI 库配置工厂 | `apps/backend/src/database/typeorm-ai.config.ts` |
| 数据库模块 | `apps/backend/src/database/database.module.ts` |
| 数据库连接常量 | `apps/backend/src/database/constants.ts` |
| AI 环境变量枚举 | `apps/backend/src/enum/config.enum.ts` |
| AI 电子书服务 | `apps/backend/src/services/ai-ebook/ai-ebook.service.ts` |
| AI 日志服务 | `apps/backend/src/services/ai-logs/ai-logs.service.ts` |
| AI 用户服务 | `apps/backend/src/services/ai-user/ai-user.service.ts` |
| 健康检查控制器 | `apps/backend/src/services/health/health.controller.ts` |
| 应用模块入口 | `apps/backend/src/app.module.ts` |

---

若与仓库最新源码不一致，以源码为准。
