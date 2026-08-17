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
	Min,
} from 'class-validator';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { LogsService } from './logs.service';

class GetLogsQuery {
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
}

class DeleteLogsDto {
	@IsArray()
	@ArrayNotEmpty()
	@Type(() => Number)
	@IsInt({ each: true })
	ids: number[];
}

@Controller('logs')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN)
@UseInterceptors(ResponseInterceptor)
export class LogsController {
	constructor(private readonly logsService: LogsService) {}

	@Get('/getLogs')
	getLogs(@Query() query: GetLogsQuery) {
		return this.logsService.findAll(query.pageNo, query.pageSize);
	}

	@Delete('/deleteLog/:id')
	@Roles(Role.ADMIN)
	deleteLog(@Param('id', ParseIntPipe) id: number) {
		return this.logsService.remove([id]);
	}

	@Delete('/deleteLogs')
	@Roles(Role.ADMIN)
	deleteLogs(@Body() dto: DeleteLogsDto) {
		return this.logsService.remove(dto.ids);
	}
}
