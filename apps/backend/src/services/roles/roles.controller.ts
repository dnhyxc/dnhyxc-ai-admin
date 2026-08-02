import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@Post('/createRole')
	@Roles(Role.ADMIN)
	createRole(@Body() dto: CreateRoleDto) {
		return this.rolesService.createRole(dto);
	}

	@Get('/getRoles')
	getRoles() {
		return this.rolesService.findAll();
	}

	@Get('/getRoleById/:id')
	getRoleById(@Param('id', ParseIntPipe) id: number) {
		return this.rolesService.findOne(id);
	}

	@Put('/updateRole/:id')
	@Roles(Role.ADMIN)
	updateRole(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateRoleDto,
	) {
		return this.rolesService.updateRole(id, dto);
	}

	@Delete('/deleteRole/:id')
	@Roles(Role.ADMIN)
	deleteRole(@Param('id', ParseIntPipe) id: number) {
		return this.rolesService.remove(id);
	}
}
