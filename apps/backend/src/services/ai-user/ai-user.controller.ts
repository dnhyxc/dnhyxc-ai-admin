import {
	Body,
	Controller,
	Get,
	Post,
	Query,
	Req,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { AiUserService } from './ai-user.service';
import { BindAiUserDTO } from './dto/bind-ai-user.dto';
import { RebindAiUserDTO } from './dto/rebind-ai-user.dto';

class GetAiUserDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageNo?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageSize?: number = 10;

	@IsOptional()
	@IsString()
	username?: string;
}

@Controller('ai-user')
@UseGuards(JwtGuard, RoleGuard)
@UseInterceptors(ResponseInterceptor)
export class AiUserController {
	constructor(private readonly aiUserService: AiUserService) {}

	@Get('/getUsers')
	@Roles(Role.ADMIN)
	getUsers(@Query() query: GetAiUserDto) {
		return this.aiUserService.findAll(query);
	}

	/** 当前登录用户自助绑定前台账号 */
	@Post('/bind')
	@Roles(Role.ADMIN, Role.USER)
	bind(
		@Req() req: Request & { user?: { userId?: number } },
		@Body() dto: BindAiUserDTO,
	) {
		const userId = req.user?.userId;
		if (!userId) return null;
		return this.aiUserService.bindForAdminUser(userId, dto);
	}

	/** 当前登录用户查询自身的前台账号绑定信息 */
	@Get('/current-bind')
	@Roles(Role.ADMIN, Role.USER)
	currentBind(@Req() req: Request & { user?: { userId?: number } }) {
		const userId = req.user?.userId;
		if (!userId) return null;
		return this.aiUserService.getCurrentBind(userId);
	}

	/** 当前登录用户换绑前台账号 */
	@Post('/rebind')
	@Roles(Role.ADMIN, Role.USER)
	rebind(
		@Req() req: Request & { user?: { userId?: number } },
		@Body() dto: RebindAiUserDTO,
	) {
		const userId = req.user?.userId;
		if (!userId) return null;
		return this.aiUserService.rebindForAdminUser(userId, dto);
	}
}
