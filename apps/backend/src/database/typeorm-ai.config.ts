import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { AiDbEnum } from '../enum/config.enum';
import { AiEbookBook } from '../services/ai-ebook/ai-ebook-book.entity';
import { AiKnowledge } from '../services/ai-knowledge/ai-knowledge.entity';
import { AiKnowledgeTrash } from '../services/ai-knowledge/ai-knowledge-trash.entity';
import { AiLog } from '../services/ai-logs/ai-log.entity';
import { AiRole } from '../services/ai-user/ai-role.entity';
import { AiUser } from '../services/ai-user/ai-user.entity';
import { AiLearningNote } from '../services/ai-learning-note/ai-learning-note.entity';
import { parseBoolean } from '../utils';

/**
 * AI 业务库（命名连接 `ai`）
 * - 永不 synchronize，防止误改产品表结构
 * - 仅注册管理台需要的实体子集
 */
@Injectable()
export class TypeOrmAiConfigService implements TypeOrmOptionsFactory {
	private readonly logger = new Logger(TypeOrmAiConfigService.name);

	constructor(private readonly configService: ConfigService) {}

	createTypeOrmOptions(): TypeOrmModuleOptions {
		const enabled = parseBoolean(
			this.configService.get(AiDbEnum.AI_DB_ENABLED),
			true,
		);
		// 从环境变量读取 AI 业务库连接池大小（AI_DB_POOL_SIZE）
		// - 未配置时回退为 5，避免连接数过大拖垮对端 MySQL
		// - Number(...) 将字符串配置统一转为数值，供 mysql2 的 connectionLimit 使用
		// - 该值最终写入下方 extra.connectionLimit，控制命名连接 `ai` 的并发连接上限
		const poolSize = Number(
			this.configService.get(AiDbEnum.AI_DB_POOL_SIZE) ?? 5,
		);

		if (!enabled) {
			this.logger.warn('AI 业务库已禁用（AI_DB_ENABLED=false）');
		}

		return {
			name: 'ai',
			type: 'mysql',
			host: this.configService.get<string>(AiDbEnum.AI_DB_HOST) || '127.0.0.1',
			port: Number(this.configService.get(AiDbEnum.AI_DB_PORT) || 3090),
			username:
				this.configService.get<string>(AiDbEnum.AI_DB_USERNAME) || 'root',
			password: this.configService.get<string>(AiDbEnum.AI_DB_PASSWORD) || '',
			database:
				this.configService.get<string>(AiDbEnum.AI_DB_DATABASE) ||
				'dnhyxc_ai_db',
			timezone: 'Z',
			entities: [
				AiUser,
				AiRole,
				AiLog,
				AiEbookBook,
				AiKnowledge,
				AiKnowledgeTrash,
				AiLearningNote,
			],
			// 企业级硬约束：业务库禁止自动同步
			synchronize: false,
			logging: false,
			// 启动时业务库可不可用都不阻断 Admin 主流程；模块内懒判断
			retryAttempts: enabled ? 2 : 0,
			retryDelay: 2000,
			autoLoadEntities: false,
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
