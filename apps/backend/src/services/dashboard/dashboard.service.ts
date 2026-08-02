import { Injectable, Optional } from '@nestjs/common';
import { AiUserService } from '../ai-user/ai-user.service';
import { LogsService } from '../logs/logs.service';
import { MenusService } from '../menus/menus.service';
import { RolesService } from '../roles/roles.service';
import { UserService } from '../user/user.service';

@Injectable()
export class DashboardService {
	constructor(
		private readonly userService: UserService,
		private readonly rolesService: RolesService,
		private readonly menusService: MenusService,
		private readonly logsService: LogsService,
		@Optional() private readonly aiUserService?: AiUserService,
	) {}

	async getOverview() {
		const [adminUsers, roles, menus, logs] = await Promise.all([
			this.userService.count(),
			this.rolesService.count(),
			this.menusService.count(),
			this.logsService.count(),
		]);

		let aiUsers: number | null = null;
		let aiDb = { connected: false, message: '未启用' };
		if (this.aiUserService) {
			aiDb = await this.aiUserService.getHealth();
			if (aiDb.connected) {
				try {
					aiUsers = await this.aiUserService.count();
				} catch {
					aiUsers = null;
				}
			}
		}

		return {
			adminUsers,
			roles,
			menus,
			logs,
			aiUsers,
			aiDb,
		};
	}
}
