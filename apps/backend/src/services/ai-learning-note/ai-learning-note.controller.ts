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
import { AiLearningNoteService } from './ai-learning-note.service';

class GetLearningNoteQuery {
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
}

@Controller('ai-learning-note')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class AiLearningNoteController {
	constructor(
		private readonly noteService: AiLearningNoteService,
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

	@Get('/getNotes')
	async getNotes(
		@Req() req: Request & { user?: { userId?: number } },
		@Query() query: GetLearningNoteQuery,
	) {
		const { scopeAiUserId } = await this.resolveScope(req);
		return this.noteService.findAll({ ...query, scopeAiUserId });
	}

	@Delete('/deleteNote/:id')
	async deleteNote(
		@Req() req: Request & { user?: { userId?: number } },
		@Param('id') id: string,
	) {
		const { isAdmin, scopeAiUserId } = await this.resolveScope(req);
		return this.noteService.delete(id, isAdmin ? undefined : scopeAiUserId);
	}
}
