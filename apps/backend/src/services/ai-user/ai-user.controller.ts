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
import { AiUserService } from './ai-user.service';

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
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class AiUserController {
	constructor(private readonly aiUserService: AiUserService) {}

	@Get('/getUsers')
	getUsers(@Query() query: GetAiUserDto) {
		return this.aiUserService.findAll(query);
	}
}
