import { createKeyv } from '@keyv/redis';
import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import { RedisEnum } from '../enum/config.enum';

/**
 * Redis 可选：有 REDIS_URL 用 Redis，否则内存缓存。
 * 管理台本地开发不强制依赖外部 Redis。
 */
@Injectable()
export class RedisConfigFactory implements CacheOptionsFactory {
	private readonly logger = new Logger(RedisConfigFactory.name);

	constructor(private readonly configService: ConfigService) {}

	async createCacheOptions() {
		const redisUrl = this.configService.get<string>(RedisEnum.REDIS_URL);

		if (!redisUrl) {
			this.logger.warn('REDIS_URL 未配置，使用内存缓存');
			return {
				stores: [new Keyv()],
				ttl: 120000,
			} as CacheModuleOptions;
		}

		const store = createKeyv({
			url: redisUrl,
			password: this.configService.get<string>(RedisEnum.REDIS_PASSWORD),
			username: this.configService.get<string>(RedisEnum.REDIS_USERNAME),
			socket: {
				connectTimeout: 5000,
				keepAlive: true,
				keepAliveInitialDelay: 30000,
				reconnectStrategy: (times: number) => {
					if (times > 5) {
						return new Error('停止重试');
					}
					return Math.min(times * 100, 3000) + Math.random() * 500;
				},
			},
		});

		store.on('error', (err: Error) => {
			this.logger.error(`Redis Store Error: ${err.message}`);
		});

		this.logger.log(`Redis 缓存已启用: ${redisUrl}`);
		return {
			stores: [store],
			ttl: 120000,
		} as CacheModuleOptions;
	}
}
