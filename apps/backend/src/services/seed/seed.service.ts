import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menus } from '../menus/menus.entity';
import { Roles } from '../roles/roles.entity';

const DEFAULT_MENUS = [
	{
		name: '仪表盘',
		path: '/',
		order: 1,
		acl: 'dashboard',
		icon: 'LayoutDashboard',
	},
	{ name: '管理员', path: '/users', order: 2, acl: 'user', icon: 'Users' },
	{ name: '角色管理', path: '/roles', order: 3, acl: 'roles', icon: 'Shield' },
	{ name: '菜单管理', path: '/menus', order: 4, acl: 'menus', icon: 'Menu' },
	{ name: 'AI 用户', path: '/ai-users', order: 5, acl: 'ai-user', icon: 'Bot' },
	{
		name: '书籍列表',
		path: '/ai-ebooks',
		order: 6,
		acl: 'ai-ebook',
		icon: 'BookOpen',
	},
	{
		name: '知识库列表',
		path: '/ai-knowledge',
		order: 7,
		acl: 'ai-knowledge',
		icon: 'Database',
	},
	{
		name: '学习笔记',
		path: '/ai-learning-note',
		order: 8,
		acl: 'ai-learning-note',
		icon: 'NotebookPen',
	},
	{
		name: 'AI 日志',
		path: '/ai-logs',
		order: 9,
		acl: 'ai-logs',
		icon: 'FileText',
	},
	{
		name: '后台日志',
		path: '/logs',
		order: 10,
		acl: 'logs',
		icon: 'ScrollText',
	},
];

/** 普通用户默认可见菜单 path */
const USER_MENU_PATHS = ['/ai-ebooks', '/ai-knowledge', '/ai-learning-note'];

@Injectable()
export class SeedService implements OnModuleInit {
	private readonly logger = new Logger(SeedService.name);

	constructor(
		@InjectRepository(Roles) private readonly rolesRepo: Repository<Roles>,
		@InjectRepository(Menus) private readonly menusRepo: Repository<Menus>,
	) {}

	async onModuleInit() {
		await this.ensureMenus();
		await this.ensureAdminRole();
		await this.ensureUserRole();
	}

	private async ensureMenus() {
		let added = 0;
		for (const item of DEFAULT_MENUS) {
			const exists = await this.menusRepo.findOne({
				where: { path: item.path },
			});
			if (exists) {
				if (
					exists.name !== item.name ||
					exists.order !== item.order ||
					exists.acl !== item.acl ||
					exists.icon !== item.icon
				) {
					exists.name = item.name;
					exists.order = item.order;
					exists.acl = item.acl;
					exists.icon = item.icon;
					await this.menusRepo.save(exists);
				}
				continue;
			}
			await this.menusRepo.save(this.menusRepo.create(item));
			added += 1;
		}
		if (added) this.logger.log(`已补种 ${added} 条菜单`);
	}

	/** 仅种子超级管理员角色与菜单绑定，不创建默认登录账号 */
	private async ensureAdminRole() {
		let adminRole = await this.rolesRepo.findOne({
			where: { id: 1 },
			relations: ['menus'],
		});

		const menus = await this.menusRepo.find();

		if (!adminRole) {
			adminRole = await this.rolesRepo.save(
				this.rolesRepo.create({
					name: '超级管理员',
					description: '拥有全部后台权限',
					menus,
				}),
			);
			this.logger.log('已种子超级管理员角色');
		} else if (menus.length) {
			const have = new Set((adminRole.menus || []).map((m) => m.id));
			const missing = menus.filter((m) => !have.has(m.id));
			if (missing.length || !adminRole.menus?.length) {
				adminRole.menus = menus;
				await this.rolesRepo.save(adminRole);
			}
		}
	}

	/** 普通用户：仅「书籍列表」菜单 */
	private async ensureUserRole() {
		const userMenus = await this.menusRepo
			.createQueryBuilder('m')
			.where('m.path IN (:...paths)', { paths: USER_MENU_PATHS })
			.getMany();

		let userRole =
			(await this.rolesRepo.findOne({
				where: { id: 2 },
				relations: ['menus'],
			})) ||
			(await this.rolesRepo.findOne({
				where: { name: '普通用户' },
				relations: ['menus'],
			}));

		if (!userRole) {
			userRole = await this.rolesRepo.save(
				this.rolesRepo.create({
					name: '普通用户',
					description: '仅可查看关联前台账号的书籍、知识库与学习笔记',
					menus: userMenus,
				}),
			);
			this.logger.log('已种子普通用户角色');
			return;
		}

		const want = new Set(userMenus.map((m) => m.id));
		const have = new Set((userRole.menus || []).map((m) => m.id));
		const same =
			want.size === have.size && [...want].every((id) => have.has(id));
		if (!same) {
			userRole.menus = userMenus;
			userRole.description = '仅可查看关联前台账号的书籍与知识库';
			await this.rolesRepo.save(userRole);
			this.logger.log('已同步普通用户角色菜单');
		}
	}
}
