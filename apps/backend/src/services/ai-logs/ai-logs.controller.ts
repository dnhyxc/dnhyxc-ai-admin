import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
	ArrayNotEmpty,
	IsArray,
	IsInt,
	IsOptional,
	IsString,
	Min,
} from 'class-validator';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { AiLogsService } from './ai-logs.service';

class GetAiLogsQuery {
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
	path?: string;

	@IsOptional()
	@IsString()
	username?: string;
}

class DeleteAiLogsDto {
	@IsArray()
	@ArrayNotEmpty()
	@Type(() => Number)
	@IsInt({ each: true })
	ids: number[];
}

@Controller('ai-logs')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class AiLogsController {
	constructor(private readonly aiLogsService: AiLogsService) {}

	@Get('/getLogs')
	getLogs(@Query() query: GetAiLogsQuery) {
		return this.aiLogsService.findAll(query);
	}

	@Delete('/deleteLog/:id')
	@Roles(Role.ADMIN)
	deleteLog(@Param('id', ParseIntPipe) id: number) {
		return this.aiLogsService.remove([id]);
	}

	@Delete('/deleteLogs')
	@Roles(Role.ADMIN)
	deleteLogs(@Body() dto: DeleteAiLogsDto) {
		return this.aiLogsService.remove(dto.ids);
	}
}
