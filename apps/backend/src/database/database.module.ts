import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AiDbEnum } from '../enum/config.enum';
import { getEnvConfig, parseBoolean } from '../utils';
import { DB_CONNECTIONS } from './constants';
import { TypeOrmAdminConfigService } from './typeorm-admin.config';
import { TypeOrmAiConfigService } from './typeorm-ai.config';
import { TypeOrmDestroyService } from './typeorm-destroy.service';

const connections = new Map<string, DataSource>();
const logger = new Logger('DatabaseModule');

/** 启动前同步读 env，决定是否挂载 AI 业务库连接 */
const env = getEnvConfig();
export const AI_DB_ENABLED = parseBoolean(env[AiDbEnum.AI_DB_ENABLED], false);

const aiConnectionImports = AI_DB_ENABLED
	? [
			TypeOrmModule.forRootAsync({
				name: DB_CONNECTIONS.AI,
				imports: [ConfigModule],
				inject: [ConfigService],
				useClass: TypeOrmAiConfigService,
				dataSourceFactory: async (options) => {
					const existing = connections.get(DB_CONNECTIONS.AI);
					if (existing?.isInitialized) return existing;
					const dataSource = await new DataSource(options!).initialize();
					connections.set(DB_CONNECTIONS.AI, dataSource);
					logger.log('AI 业务库连接已建立');
					return dataSource;
				},
			}),
		]
	: [];

@Global()
@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useClass: TypeOrmAdminConfigService,
			dataSourceFactory: async (options) => {
				const existing = connections.get(DB_CONNECTIONS.ADMIN);
				if (existing?.isInitialized) return existing;
				const dataSource = await new DataSource(options!).initialize();
				connections.set(DB_CONNECTIONS.ADMIN, dataSource);
				logger.log('Admin 主库连接已建立');
				return dataSource;
			},
		}),
		...aiConnectionImports,
	],
	providers: [
		TypeOrmDestroyService,
		{
			provide: 'TYPEORM_CONNECTIONS',
			useValue: connections,
		},
		{
			provide: 'AI_DB_ENABLED',
			useValue: AI_DB_ENABLED,
		},
	],
	exports: ['TYPEORM_CONNECTIONS', 'AI_DB_ENABLED'],
})
export class DatabaseModule {}
