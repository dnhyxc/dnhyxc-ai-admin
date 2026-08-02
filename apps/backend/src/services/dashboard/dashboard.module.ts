import { Module } from '@nestjs/common';
import { AI_DB_ENABLED } from '../../database/database.module';
import { RoleGuard } from '../../guards/role.guard';
import { AiUserModule } from '../ai-user/ai-user.module';
import { LogsModule } from '../logs/logs.module';
import { MenusModule } from '../menus/menus.module';
import { RolesModule } from '../roles/roles.module';
import { UserModule } from '../user/user.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
	imports: [
		UserModule,
		RolesModule,
		MenusModule,
		LogsModule,
		...(AI_DB_ENABLED ? [AiUserModule] : []),
	],
	controllers: [DashboardController],
	providers: [DashboardService, RoleGuard],
})
export class DashboardModule {}
