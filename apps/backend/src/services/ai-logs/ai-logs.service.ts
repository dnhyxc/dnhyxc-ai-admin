import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiLog } from './ai-log.entity';

@Injectable()
export class AiLogsService {
	constructor(
		@InjectRepository(AiLog, DB_CONNECTIONS.AI)
		private readonly aiLogRepository: Repository<AiLog>,
		@InjectDataSource(DB_CONNECTIONS.AI)
		private readonly aiDataSource: DataSource,
	) {}

	private assertReady() {
		if (!this.aiDataSource?.isInitialized) {
			throw new ServiceUnavailableException(
				'AI 业务库未连接，请确认 dnhyxc-ai MySQL 已启动且 AI_DB_* 配置正确',
			);
		}
	}

	async findAll(query: {
		pageNo?: number;
		pageSize?: number;
		path?: string;
		username?: string;
	}) {
		this.assertReady();
		const pageNo = query.pageNo || 1;
		const pageSize = query.pageSize || 20;

		const qb = this.aiLogRepository
			.createQueryBuilder('log')
			.leftJoinAndSelect('log.user', 'user')
			.orderBy('log.id', 'DESC')
			.take(pageSize)
			.skip((pageNo - 1) * pageSize);

		if (query.path) {
			qb.andWhere('log.path LIKE :path', { path: `%${query.path}%` });
		}
		if (query.username) {
			qb.andWhere('user.username LIKE :username', {
				username: `%${query.username}%`,
			});
		}

		const [list, total] = await qb.getManyAndCount();
		return { list, total };
	}

	async remove(ids: number[]) {
		this.assertReady();
		if (!ids.length) return { affected: 0 };
		const result = await this.aiLogRepository.delete({ id: In(ids) });
		return { affected: result.affected ?? 0 };
	}

	async count() {
		this.assertReady();
		return this.aiLogRepository.count();
	}
}
