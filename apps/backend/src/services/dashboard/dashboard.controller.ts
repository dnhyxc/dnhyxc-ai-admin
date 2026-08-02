import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get('/overview')
	overview() {
		return this.dashboardService.getOverview();
	}
}
