import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
			relations: { roles: true },
			select: {
				id: true,
				username: true,
				email: true,
				createTime: true,
				isMember: true,
				membershipType: true,
				memberExpiresAt: true,
				roles: { id: true, name: true },
			},
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

	/** 仪表盘业务指标（读 AI 库） */
	async getDashboardStats(totalUsers: number) {
		this.assertReady();
		const ds = this.aiDataSource;
		const scalar = async (sql: string) => {
			try {
				const rows = await ds.query(sql);
				const v = rows?.[0]?.c ?? rows?.[0]?.count ?? 0;
				return Number(v) || 0;
			} catch {
				return 0;
			}
		};

		const [
			activeUsersToday,
			totalEbooks,
			totalChats,
			totalRevenue,
			newUsersThisWeek,
			growthRows,
			memberRows,
			moduleRows,
		] = await Promise.all([
			scalar(
				`SELECT COUNT(DISTINCT userId) AS c FROM logs
         WHERE userId IS NOT NULL AND createTime >= CURDATE()`,
			),
			// 与书籍列表一致：只统计主书，排除读者副本
			scalar(
				'SELECT COUNT(*) AS c FROM ebook_book WHERE source_book_id IS NULL',
			),
			scalar('SELECT COUNT(*) AS c FROM chat_sessions'),
			scalar('SELECT COUNT(*) AS c FROM membership_payment_grant'),
			scalar(
				`SELECT COUNT(*) AS c FROM user
         WHERE createTime >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
			),
			ds
				.query(
					`SELECT DATE_FORMAT(createTime, '%m-%d') AS date, COUNT(*) AS count
           FROM user
           WHERE createTime >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           GROUP BY DATE(createTime)
           ORDER BY DATE(createTime)`,
				)
				.catch(() => []),
			ds
				.query(
					`SELECT
             CASE
               WHEN isMember = 1 AND membershipType IS NOT NULL AND membershipType != ''
                 THEN membershipType
               WHEN isMember = 1 THEN '会员'
               ELSE '免费用户'
             END AS name,
             COUNT(*) AS value
           FROM user
           GROUP BY name
           ORDER BY value DESC`,
				)
				.catch(() => []),
			ds
				.query(
					`SELECT
             CASE
               WHEN path LIKE '/api/ebook%' THEN '电子书'
               WHEN path LIKE '/api/chat%' OR path LIKE '/api/assistant%'
                 OR path LIKE '/api/agent%' THEN '对话'
               WHEN path LIKE '/api/knowledge%' THEN '知识库'
               WHEN path LIKE '/api/english%' THEN '英语学习'
               WHEN path LIKE '/api/auth%' THEN '认证'
               ELSE '其他'
             END AS name,
             COUNT(*) AS count
           FROM logs
           GROUP BY name
           ORDER BY count DESC
           LIMIT 8`,
				)
				.catch(() => []),
		]);

		return {
			totalUsers,
			activeUsersToday,
			totalEbooks,
			totalChats,
			totalRevenue,
			newUsersThisWeek,
			usersGrowth: (growthRows as any[]).map((r) => ({
				date: String(r.date),
				count: Number(r.count) || 0,
			})),
			membershipDistribution: (memberRows as any[]).map((r) => ({
				name: String(r.name),
				value: Number(r.value) || 0,
			})),
			moduleUsage: (moduleRows as any[]).map((r) => ({
				name: String(r.name),
				count: Number(r.count) || 0,
			})),
		};
	}
}
