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
}
