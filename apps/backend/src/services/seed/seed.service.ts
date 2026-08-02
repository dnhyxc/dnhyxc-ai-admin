import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeedEnum } from '../../enum/config.enum';
import { hashPassword } from '../../utils';
import { Menus } from '../menus/menus.entity';
import { Roles } from '../roles/roles.entity';
import { Profile } from '../user/profile.entity';
import { User } from '../user/user.entity';

const DEFAULT_MENUS = [
	{ name: '仪表盘', path: '/', order: 1, acl: 'dashboard', icon: 'LayoutDashboard' },
	{ name: '管理员', path: '/users', order: 2, acl: 'user', icon: 'Users' },
	{ name: '角色管理', path: '/roles', order: 3, acl: 'roles', icon: 'Shield' },
	{ name: '菜单管理', path: '/menus', order: 4, acl: 'menus', icon: 'Menu' },
	{ name: 'AI 用户', path: '/ai-users', order: 5, acl: 'ai-user', icon: 'Bot' },
	{ name: '操作日志', path: '/logs', order: 6, acl: 'logs', icon: 'ScrollText' },
];

@Injectable()
export class SeedService implements OnModuleInit {
	private readonly logger = new Logger(SeedService.name);

	constructor(
		@InjectRepository(User) private readonly userRepo: Repository<User>,
		@InjectRepository(Roles) private readonly rolesRepo: Repository<Roles>,
		@InjectRepository(Menus) private readonly menusRepo: Repository<Menus>,
		@InjectRepository(Profile)
		private readonly profileRepo: Repository<Profile>,
		private readonly configService: ConfigService,
	) {}

	async onModuleInit() {
		await this.ensureMenus();
		await this.ensureAdminRoleAndUser();
	}

	private async ensureMenus() {
		const count = await this.menusRepo.count();
		if (count > 0) return;
		await this.menusRepo.save(DEFAULT_MENUS.map((m) => this.menusRepo.create(m)));
		this.logger.log(`已种子 ${DEFAULT_MENUS.length} 条菜单`);
	}

	private async ensureAdminRoleAndUser() {
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
		} else if (!adminRole.menus?.length && menus.length) {
			adminRole.menus = menus;
			await this.rolesRepo.save(adminRole);
		}

		const userCount = await this.userRepo.count();
		if (userCount > 0) return;

		const username =
			this.configService.get(SeedEnum.SEED_ADMIN_USERNAME) || 'admin';
		const password =
			this.configService.get(SeedEnum.SEED_ADMIN_PASSWORD) || 'admin123';
		const email =
			this.configService.get(SeedEnum.SEED_ADMIN_EMAIL) || 'admin@dnhyxc.cn';

		const user = this.userRepo.create({
			username,
			email,
			password: await hashPassword(password),
			isActive: true,
			roles: [adminRole],
			profile: this.profileRepo.create({
				gender: 0,
				avatar: '',
				address: '',
			}),
		});
		await this.userRepo.save(user);
		this.logger.log(`已种子管理员账号: ${username} / ${password}`);
	}
}
