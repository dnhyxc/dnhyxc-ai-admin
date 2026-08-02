import {
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiUser } from './ai-user.entity';

@Injectable()
export class AiUserService {
	constructor(
		@InjectRepository(AiUser, DB_CONNECTIONS.AI)
		private readonly aiUserRepository: Repository<AiUser>,
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
		username?: string;
	}) {
		this.assertReady();
		const pageNo = query.pageNo || 1;
		const pageSize = query.pageSize || 10;
		const [list, total] = await this.aiUserRepository.findAndCount({
			where: query.username
				? { username: Like(`%${query.username}%`) }
				: undefined,
			take: pageSize,
			skip: (pageNo - 1) * pageSize,
			order: { id: 'DESC' },
		});
		return { list, total };
	}

	async count() {
		this.assertReady();
		return this.aiUserRepository.count();
	}

	async getHealth() {
		try {
			if (!this.aiDataSource?.isInitialized) {
				return { connected: false, message: '未初始化' };
			}
			await this.aiDataSource.query('SELECT 1');
			return { connected: true, message: 'ok' };
		} catch (e: any) {
			return { connected: false, message: e?.message || '连接失败' };
		}
	}
}
