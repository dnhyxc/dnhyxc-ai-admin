import {
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiUser } from '../ai-user/ai-user.entity';
import { AiShare } from './ai-share.entity';

@Injectable()
export class AiShareService {
	constructor(
		@InjectRepository(AiShare, DB_CONNECTIONS.AI)
		private readonly shareRepo: Repository<AiShare>,
		@InjectRepository(AiUser, DB_CONNECTIONS.AI)
		private readonly aiUserRepo: Repository<AiUser>,
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

	private async resolveAuthors(
		rows: AiShare[],
	): Promise<Array<AiShare & { author: string }>> {
		if (!rows.length) return [];
		const ids = [
			...new Set(
				rows.map((r) => r.createdBy).filter((id): id is number => id != null),
			),
		];
		const map = new Map<number, string>();
		if (ids.length) {
			const users = await this.aiUserRepo
				.createQueryBuilder('u')
				.where('u.id IN (:...ids)', { ids })
				.getMany();
			for (const u of users) map.set(u.id, u.username);
		}
		return rows.map((r) => ({
			...r,
			author:
				r.createdBy != null
					? (map.get(r.createdBy) ?? `用户${r.createdBy}`)
					: '—',
		}));
	}

	async findPage(query: {
		pageNo?: number;
		pageSize?: number;
		shareType?: string;
		title?: string;
		scopeAiUserId?: number | null;
	}) {
		this.assertReady();
		if (query.scopeAiUserId === null) {
			return { list: [], total: 0 };
		}

		const pageNo = query.pageNo || 1;
		const pageSize = query.pageSize || 20;

		const qb = this.shareRepo
			.createQueryBuilder('s')
			.select([
				's.shareId',
				's.chatSessionId',
				's.shareType',
				's.sessionType',
				's.title',
				's.snapshotTruncated',
				's.createdBy',
				's.createdAt',
				's.expiresAt',
				's.revokedAt',
				's.viewCount',
			])
			.orderBy('s.createdAt', 'DESC')
			.skip((pageNo - 1) * pageSize)
			.take(pageSize);

		if (query.scopeAiUserId != null) {
			qb.andWhere('s.createdBy = :uid', { uid: query.scopeAiUserId });
		}
		if (query.shareType) {
			qb.andWhere('s.shareType = :t', { t: query.shareType });
		}
		if (query.title) {
			qb.andWhere('s.title LIKE :title', { title: `%${query.title}%` });
		}

		const [list, total] = await qb.getManyAndCount();
		return { list: await this.resolveAuthors(list), total };
	}

	async findOne(shareId: string, scopeAiUserId?: number | null) {
		this.assertReady();
		if (scopeAiUserId === null) {
			throw new NotFoundException('分享不存在');
		}
		const qb = this.shareRepo
			.createQueryBuilder('s')
			.where('s.shareId = :shareId', { shareId });
		if (scopeAiUserId != null) {
			qb.andWhere('s.createdBy = :uid', { uid: scopeAiUserId });
		}
		const row = await qb.getOne();
		if (!row) throw new NotFoundException('分享不存在');
		const [withAuthor] = await this.resolveAuthors([row]);
		return withAuthor;
	}

	async delete(shareId: string, scopeAiUserId?: number | null) {
		this.assertReady();
		if (scopeAiUserId === null) {
			throw new NotFoundException('分享不存在');
		}
		const qb = this.shareRepo
			.createQueryBuilder('s')
			.where('s.shareId = :shareId', { shareId });
		if (scopeAiUserId != null) {
			qb.andWhere('s.createdBy = :uid', { uid: scopeAiUserId });
		}
		const target = await qb.getOne();
		if (!target) throw new NotFoundException('分享不存在');
		await this.shareRepo.delete({ shareId: target.shareId });
	}
}
