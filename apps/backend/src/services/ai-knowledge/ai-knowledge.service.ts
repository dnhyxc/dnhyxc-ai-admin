import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiKnowledge } from './ai-knowledge.entity';
import { AiKnowledgeTrash } from './ai-knowledge-trash.entity';

@Injectable()
export class AiKnowledgeService {
	constructor(
		@InjectRepository(AiKnowledge, DB_CONNECTIONS.AI)
		private readonly knowledgeRepository: Repository<AiKnowledge>,
		@InjectRepository(AiKnowledgeTrash, DB_CONNECTIONS.AI)
		private readonly knowledgeTrashRepository: Repository<AiKnowledgeTrash>,
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

	private async queryList<T extends { authorId: number | null }>(
		repo: Repository<T>,
		query: {
			pageNo?: number;
			pageSize?: number;
			title?: string;
			author?: string;
			scopeAiUserId?: number | null;
		},
		orderByField: string = 'createdAt',
	) {
		if (query.scopeAiUserId === null) {
			return { list: [], total: 0 };
		}

		const pageNo = query.pageNo || 1;
		const pageSize = query.pageSize || 20;

		const qb = repo
			.createQueryBuilder('kb')
			.orderBy(`kb.${orderByField}`, 'DESC')
			.take(pageSize)
			.skip((pageNo - 1) * pageSize);

		if (query.scopeAiUserId != null) {
			qb.andWhere('kb.authorId = :aiUserId', {
				aiUserId: query.scopeAiUserId,
			});
		}
		if (query.title) {
			qb.andWhere('kb.title LIKE :title', { title: `%${query.title}%` });
		}
		if (query.author) {
			qb.andWhere('kb.author LIKE :author', { author: `%${query.author}%` });
		}

		const [list, total] = await qb.getManyAndCount();
		return { list, total };
	}

	async findAll(query: {
		pageNo?: number;
		pageSize?: number;
		title?: string;
		author?: string;
		scopeAiUserId?: number | null;
	}) {
		this.assertReady();
		return this.queryList(this.knowledgeRepository, query);
	}

	async findAllTrash(query: {
		pageNo?: number;
		pageSize?: number;
		title?: string;
		author?: string;
		scopeAiUserId?: number | null;
	}) {
		this.assertReady();
		return this.queryList(this.knowledgeTrashRepository, query, 'deletedAt');
	}

	async count() {
		this.assertReady();
		return this.knowledgeRepository.count();
	}

	async softDelete(id: string, scopeAiUserId?: number | null) {
		this.assertReady();
		await this.aiDataSource.transaction(async (manager) => {
			const kbRepo = manager.getRepository(AiKnowledge);
			const trashRepo = manager.getRepository(AiKnowledgeTrash);

			const qb = kbRepo.createQueryBuilder('kb').where('kb.id = :id', { id });
			if (scopeAiUserId != null) {
				qb.andWhere('kb.authorId = :aiUserId', { aiUserId: scopeAiUserId });
			}
			const target = await qb.getOne();
			if (!target) return;

			await trashRepo.insert({
				originalId: target.id,
				title: target.title,
				content: target.content,
				author: target.author,
				authorId: target.authorId,
				sourceCreatedAt: target.createdAt,
				sourceUpdatedAt: target.updatedAt,
			});
			await kbRepo.delete(target.id);
		});
	}

	/**
	 * 永久删除回收站中的知识库条目
	 * @param id - 回收站中条目的ID
	 * @param scopeAiUserId - 可选，限制操作权限的用户ID，仅允许删除该用户创建的条目
	 */
	async hardDeleteTrash(id: string, scopeAiUserId?: number | null) {
		// 检查数据库连接是否就绪
		this.assertReady();
		// 创建查询构建器，查询回收站条目
		const qb = this.knowledgeTrashRepository
			.createQueryBuilder('kb')
			.where('kb.id = :id', { id });
		// 如果指定了用户ID，追加用户ID过滤条件，确保只能删除自己的条目
		if (scopeAiUserId != null) {
			qb.andWhere('kb.authorId = :aiUserId', { aiUserId: scopeAiUserId });
		}
		// 执行查询获取目标条目
		const target = await qb.getOne();
		// 如果条目不存在，直接返回
		if (!target) return;
		// 从回收站中永久删除该条目
		await this.knowledgeTrashRepository.delete(target.id);
	}
}
