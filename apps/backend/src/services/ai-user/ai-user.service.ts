import {
	BadRequestException,
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, MoreThanOrEqual, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { comparePassword } from '../../utils';
import { UserService } from '../user/user.service';
import { AiUser } from './ai-user.entity';
import { BindAiUserDTO } from './dto/bind-ai-user.dto';
import { RebindAiUserDTO } from './dto/rebind-ai-user.dto';

@Injectable()
export class AiUserService {
	constructor(
		@InjectRepository(AiUser, DB_CONNECTIONS.AI)
		private readonly aiUserRepository: Repository<AiUser>,
		@InjectDataSource(DB_CONNECTIONS.AI)
		private readonly aiDataSource: DataSource,
		private readonly userService: UserService,
	) {}

	private assertReady() {
		if (!this.aiDataSource?.isInitialized) {
			throw new ServiceUnavailableException(
				'AI 业务库未连接，请确认 dnhyxc-ai MySQL 已启动且 AI_DB_* 配置正确',
			);
		}
	}

	findByUsername(username: string): Promise<AiUser | null> {
		this.assertReady();
		return this.aiUserRepository.findOne({
			where: { username },
			select: {
				id: true,
				username: true,
				email: true,
				createTime: true,
				isMember: true,
				membershipType: true,
				memberExpiresAt: true,
			},
		});
	}

	/**
	 * 普通用户自助绑定前台账号：用户名 + 邮箱须与前台账号一致。
	 * 绑定后书籍等数据按 aiUserId（前台 user.id）过滤。
	 */
	async bindForAdminUser(adminUserId: number, dto: BindAiUserDTO) {
		this.assertReady();
		const adminUser = await this.userService.findOne(adminUserId);
		if (!adminUser) {
			throw new BadRequestException('用户不存在');
		}

		const aiUser = await this.findByUsername(dto.username.trim());
		if (!aiUser) {
			throw new BadRequestException('前台账号不存在，请检查用户名');
		}
		if (aiUser.email.toLowerCase() !== dto.email.trim().toLowerCase()) {
			throw new BadRequestException('前台用户名与邮箱不匹配');
		}

		const occupied = await this.userService.findByAiUserId(
			aiUser.id,
			adminUserId,
		);
		if (occupied) {
			throw new BadRequestException('该前台账号已被其他后台用户绑定');
		}

		await this.userService.update(adminUserId, { aiUserId: aiUser.id });
		const updated = await this.userService.findOne(adminUserId);
		if (!updated) {
			throw new BadRequestException('绑定失败');
		}
		const { password: _, ...userInfo } = updated;
		return {
			ok: true,
			aiUsername: aiUser.username,
			...userInfo,
		};
	}

	/**
	 * 查询当前登录后台用户的前台账号绑定信息，便于个人中心展示。
	 * AI 业务库不可用或记录缺失时仅返回 id，不中断个人中心页。
	 */
	async getCurrentBind(adminUserId: number) {
		const adminUser = await this.userService.findOne(adminUserId);
		if (!adminUser) {
			throw new BadRequestException('用户不存在');
		}
		if (!adminUser.aiUserId) {
			return { aiUserId: null, aiUsername: null, aiEmail: null };
		}
		let aiUser: Pick<AiUser, 'id' | 'username' | 'email'> | null = null;
		try {
			aiUser = await this.aiUserRepository.findOne({
				where: { id: adminUser.aiUserId },
				select: { id: true, username: true, email: true },
			});
		} catch {
			aiUser = null;
		}
		return {
			aiUserId: adminUser.aiUserId,
			aiUsername: aiUser?.username ?? null,
			aiEmail: aiUser?.email ?? null,
		};
	}

	/**
	 * 普通用户换绑前台账号：需校验当前后台账号密码，再按
	 * 「存在性 → 邮箱一致 → 未被他人占用 → 写回 aiUserId」完成换绑。
	 * 换绑后书籍等数据按新的 aiUserId（前台 user.id）过滤。
	 */
	async rebindForAdminUser(adminUserId: number, dto: RebindAiUserDTO) {
		this.assertReady();
		const adminUser = await this.userService.findOne(adminUserId);
		if (!adminUser) {
			throw new BadRequestException('用户不存在');
		}

		// 安全校验：输入当前后台账号密码，防止他人替绑
		const isPasswordValid = await comparePassword(
			dto.password,
			adminUser.password,
		);
		if (!isPasswordValid) {
			throw new BadRequestException('当前账号密码错误');
		}

		const aiUser = await this.findByUsername(dto.username.trim());
		if (!aiUser) {
			throw new BadRequestException('前台账号不存在，请检查用户名');
		}
		if (aiUser.email.toLowerCase() !== dto.email.trim().toLowerCase()) {
			throw new BadRequestException('前台用户名与邮箱不匹配');
		}

		const occupied = await this.userService.findByAiUserId(
			aiUser.id,
			adminUserId,
		);
		if (occupied) {
			throw new BadRequestException('该前台账号已被其他后台用户绑定');
		}

		await this.userService.update(adminUserId, { aiUserId: aiUser.id });
		const updated = await this.userService.findOne(adminUserId);
		if (!updated) {
			throw new BadRequestException('换绑失败');
		}
		const { password: _, ...userInfo } = updated;
		return {
			ok: true,
			aiUsername: aiUser.username,
			...userInfo,
		};
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

		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const [
			activeUsersToday,
			totalEbooks,
			totalChats,
			totalRevenue,
			newUsersThisWeek,
			recentUsers,
			memberRows,
			moduleRows,
		] = await Promise.all([
			scalar(
				`SELECT COUNT(DISTINCT userId) AS c FROM logs
         WHERE userId IS NOT NULL AND createTime >= CURDATE()`,
			),
			scalar(
				'SELECT COUNT(*) AS c FROM ebook_book WHERE source_book_id IS NULL',
			),
			scalar('SELECT COUNT(*) AS c FROM chat_sessions'),
			scalar('SELECT COUNT(*) AS c FROM membership_payment_grant'),
			scalar(
				`SELECT COUNT(*) AS c FROM user
         WHERE createTime >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
			),
			this.aiUserRepository
				.find({
					where: { createTime: MoreThanOrEqual(sevenDaysAgo) },
					select: { createTime: true },
				})
				.catch((err) => {
					console.error('[AiUserService] recentUsers query failed:', err);
					return [];
				}),
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
			usersGrowth: (() => {
				const growthMap = new Map<string, number>();
				for (const user of recentUsers as AiUser[]) {
					if (!user.createTime) continue;
					const d = new Date(user.createTime);
					const mm = String(d.getMonth() + 1).padStart(2, '0');
					const dd = String(d.getDate()).padStart(2, '0');
					const key = `${mm}-${dd}`;
					growthMap.set(key, (growthMap.get(key) || 0) + 1);
				}
				return Array.from(growthMap.entries())
					.map(([date, count]) => ({ date, count }))
					.sort((a, b) => a.date.localeCompare(b.date));
			})(),
			membershipDistribution: (memberRows as any[]).map((r) => {
				const rawName = String(r.name);
				const nameMap: Record<string, string> = {
					premium: '高级会员',
					basic: '基础会员',
					vip: 'VIP会员',
					svip: 'SVIP会员',
					trial: '试用会员',
				};
				const name = nameMap[rawName] ?? rawName;
				return { name, value: Number(r.value) || 0 };
			}),
			moduleUsage: (moduleRows as any[]).map((r) => ({
				name: String(r.name),
				count: Number(r.count) || 0,
			})),
		};
	}
}
