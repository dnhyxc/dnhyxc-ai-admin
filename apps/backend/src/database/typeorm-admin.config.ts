import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigEnum } from '../enum/config.enum';
import { parseBoolean } from '../utils';

/**
 * Admin 主库（default 连接）
 * 实体：src/services 下除 ai-user 外的 *.entity.ts
 */
@Injectable()
export class TypeOrmAdminConfigService implements TypeOrmOptionsFactory {
	constructor(private readonly configService: ConfigService) {}

	createTypeOrmOptions(): TypeOrmModuleOptions {
		const poolSize = Number(
			this.configService.get(ConfigEnum.DB_POOL_SIZE) ?? 10,
		);

		return {
			type: (this.configService.get<string>(ConfigEnum.DB_TYPE) ||
				'mysql') as 'mysql',
			host: this.configService.get<string>(ConfigEnum.DB_HOST),
			port: Number(this.configService.get(ConfigEnum.DB_PORT)),
			username: this.configService.get<string>(ConfigEnum.DB_USERNAME),
			password: this.configService.get<string>(ConfigEnum.DB_PASSWORD),
			database: this.configService.get<string>(ConfigEnum.DB_DATABASE),
			timezone: 'Z',
			autoLoadEntities: true,
			synchronize: parseBoolean(
				this.configService.get(ConfigEnum.DB_SYNC),
				false,
			),
			logging: false,
			retryAttempts: 3,
			retryDelay: 3000,
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
