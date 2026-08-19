import {
	Controller,
	Delete,
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
import { AiKnowledgeService } from './ai-knowledge.service';

class GetAiKnowledgeQuery {
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
	author?: string;
}

@Controller('ai-knowledge')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class AiKnowledgeController {
	constructor(
		private readonly aiKnowledgeService: AiKnowledgeService,
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

	@Get('/getKnowledgeBases')
	async getKnowledgeBases(
		@Req() req: Request & { user?: { userId?: number } },
		@Query() query: GetAiKnowledgeQuery,
	) {
		const { isAdmin, scopeAiUserId } = await this.resolveScope(req);
		return this.aiKnowledgeService.findAll({
			...query,
			scopeAiUserId,
			author: isAdmin ? query.author : undefined,
		});
	}

	@Get('/getKnowledgeTrash')
	async getKnowledgeTrash(
		@Req() req: Request & { user?: { userId?: number } },
		@Query() query: GetAiKnowledgeQuery,
	) {
		const { isAdmin, scopeAiUserId } = await this.resolveScope(req);
		return this.aiKnowledgeService.findAllTrash({
			...query,
			scopeAiUserId,
			author: isAdmin ? query.author : undefined,
		});
	}

	@Delete('/deleteKnowledge/:id')
	@Roles(Role.ADMIN, Role.USER)
	async deleteKnowledge(
		@Req() req: Request & { user?: { userId?: number } },
		@Param('id') id: string,
	) {
		const { isAdmin, scopeAiUserId } = await this.resolveScope(req);
		return this.aiKnowledgeService.softDelete(
			id,
			isAdmin ? undefined : scopeAiUserId,
		);
	}

	@Delete('/deleteKnowledgeTrash/:id')
	@Roles(Role.ADMIN, Role.USER)
	async deleteKnowledgeTrash(
		@Req() req: Request & { user?: { userId?: number } },
		@Param('id') id: string,
	) {
		const { isAdmin, scopeAiUserId } = await this.resolveScope(req);
		return this.aiKnowledgeService.hardDeleteTrash(
			id,
			isAdmin ? undefined : scopeAiUserId,
		);
	}
}
