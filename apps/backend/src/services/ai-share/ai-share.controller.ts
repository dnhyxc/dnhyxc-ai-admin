import {
	Controller,
	Get,
	Param,
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
import { AiShareService } from './ai-share.service';

class GetAiShareQuery {
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
	shareType?: string;

	@IsOptional()
	@IsString()
	title?: string;
}

@Controller('ai-share')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class AiShareController {
	constructor(
		private readonly shareService: AiShareService,
		private readonly userService: UserService,
	) {}

	private async resolveScope(req: Request & { user?: { userId?: number } }) {
		const adminUser = req.user?.userId
			? await this.userService.findOne(req.user.userId)
			: null;
		const isAdmin = Boolean(
			adminUser?.roles?.some(
				(r) => r.id === Role.ADMIN || r.name === '超级管理员',
			),
		);
		return {
			isAdmin,
			scopeAiUserId: isAdmin ? undefined : (adminUser?.aiUserId ?? null),
		};
	}

	@Get('/getShares')
	async getShares(
		@Req() req: Request & { user?: { userId?: number } },
		@Query() query: GetAiShareQuery,
	) {
		const { scopeAiUserId } = await this.resolveScope(req);
		return this.shareService.findPage({ ...query, scopeAiUserId });
	}

	@Get('/getShare/:shareId')
	async getShare(
		@Req() req: Request & { user?: { userId?: number } },
		@Param('shareId') shareId: string,
	) {
		const { scopeAiUserId } = await this.resolveScope(req);
		return this.shareService.findOne(shareId, scopeAiUserId);
	}
}
