import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiUser } from '../ai-user/ai-user.entity';
import { AiLearningNote } from './ai-learning-note.entity';

export interface AiLearningNoteView extends AiLearningNote {
	author: string;
}

@Injectable()
export class AiLearningNoteService {
	constructor(
		@InjectRepository(AiLearningNote, DB_CONNECTIONS.AI)
		private readonly noteRepository: Repository<AiLearningNote>,
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

	private async resolveAuthors(
		notes: AiLearningNote[],
	): Promise<AiLearningNoteView[]> {
		if (notes.length === 0) return [];
		const userIds = [...new Set(notes.map((n) => n.userId))];
		const users = await this.aiUserRepository
			.createQueryBuilder('u')
			.where('u.id IN (:...ids)', { ids: userIds })
			.getMany();
		const map = new Map<number, string>();
		for (const u of users) {
			map.set(u.id, u.username);
		}
		return notes.map((n) => ({
			...n,
			author: map.get(n.userId) ?? `用户${n.userId}`,
		}));
	}

	async findAll(query: {
		pageNo?: number;
		pageSize?: number;
		title?: string;
		scopeAiUserId?: number | null;
	}) {
		this.assertReady();

		if (query.scopeAiUserId === null) {
			return { list: [], total: 0 };
		}

		const pageNo = query.pageNo || 1;
		const pageSize = query.pageSize || 20;

		const qb = this.noteRepository
			.createQueryBuilder('eln')
			.orderBy('eln.updatedAt', 'DESC')
			.take(pageSize)
			.skip((pageNo - 1) * pageSize);

		if (query.scopeAiUserId != null) {
			qb.andWhere('eln.userId = :aiUserId', {
				aiUserId: query.scopeAiUserId,
			});
		}
		if (query.title) {
			qb.andWhere('eln.title LIKE :title', { title: `%${query.title}%` });
		}

		const [list, total] = await qb.getManyAndCount();
		const viewList = await this.resolveAuthors(list);
		return { list: viewList, total };
	}

	async delete(id: string, scopeAiUserId?: number | null) {
		this.assertReady();
		const qb = this.noteRepository
			.createQueryBuilder('eln')
			.where('eln.id = :id', { id });
		if (scopeAiUserId != null) {
			qb.andWhere('eln.userId = :aiUserId', { aiUserId: scopeAiUserId });
		}
		const target = await qb.getOne();
		if (!target) return;
		await this.noteRepository.delete(target.id);
	}
}
