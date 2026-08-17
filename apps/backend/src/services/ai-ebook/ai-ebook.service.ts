import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiEbookBook } from './ai-ebook-book.entity';

@Injectable()
export class AiEbookService {
	constructor(
		@InjectRepository(AiEbookBook, DB_CONNECTIONS.AI)
		private readonly ebookRepository: Repository<AiEbookBook>,
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
		title?: string;
		username?: string;
		/** 普通用户：仅查该前台用户的书；未绑定传 null 返回空 */
		scopeAiUserId?: number | null;
	}) {
		this.assertReady();

		// 普通用户未关联前台账号：直接空结果
		if (query.scopeAiUserId === null) {
			return { list: [], total: 0 };
		}

		const pageNo = query.pageNo || 1;
		const pageSize = query.pageSize || 20;

		const qb = this.ebookRepository
			.createQueryBuilder('book')
			.leftJoinAndSelect('book.user', 'user')
			// 只列主书（排除读者副本）
			.where('book.sourceBookId IS NULL')
			.orderBy('book.createdAt', 'DESC')
			.take(pageSize)
			.skip((pageNo - 1) * pageSize);

		if (query.scopeAiUserId != null) {
			qb.andWhere('book.userId = :aiUserId', {
				aiUserId: query.scopeAiUserId,
			});
		}
		if (query.title) {
			qb.andWhere('book.title LIKE :title', { title: `%${query.title}%` });
		}
		if (query.username) {
			qb.andWhere('user.username LIKE :username', {
				username: `%${query.username}%`,
			});
		}

		const [list, total] = await qb.getManyAndCount();
		return { list, total };
	}

	async count() {
		this.assertReady();
		return this.ebookRepository.count({
			where: { sourceBookId: IsNull() },
		});
	}
}
