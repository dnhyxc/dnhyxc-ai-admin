import {
	Controller,
	Get,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
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
	constructor(private readonly aiEbookService: AiEbookService) {}

	@Get('/getBooks')
	getBooks(@Query() query: GetAiEbooksQuery) {
		return this.aiEbookService.findAll(query);
	}
}
