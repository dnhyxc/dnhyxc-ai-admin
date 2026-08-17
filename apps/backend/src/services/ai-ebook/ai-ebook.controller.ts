import {
	Controller,
	Get,
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
import { UserService } from '../user/user.service';
import { AiEbookService } from './ai-ebook.service';

class GetAiEbooksQuery {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageNo?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageSize?: number = 20;

	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsString()
	username?: string;
}

@Controller('ai-ebook')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class AiEbookController {
	constructor(
		private readonly aiEbookService: AiEbookService,
		private readonly userService: UserService,
	) {}

	@Get('/getBooks')
	async getBooks(
		@Req() req: Request & { user?: { userId?: number } },
		@Query() query: GetAiEbooksQuery,
	) {
		const adminUser = req.user?.userId
			? await this.userService.findOne(req.user.userId)
			: null;
		const isAdmin = Boolean(
			adminUser?.roles?.some(
				(r) => r.id === Role.ADMIN || r.name === '超级管理员',
			),
		);

		return this.aiEbookService.findAll({
			...query,
			// 超管看全量；普通用户仅看关联前台账号（未绑定则空）
			scopeAiUserId: isAdmin ? undefined : (adminUser?.aiUserId ?? null),
			// 普通用户禁止按他人 username 搜全库
			username: isAdmin ? query.username : undefined,
		});
	}
}
