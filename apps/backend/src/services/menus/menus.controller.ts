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
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenusService } from './menus.service';

@Controller('menus')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ResponseInterceptor)
export class MenusController {
	constructor(private readonly menusService: MenusService) {}

	@Post('/createMenu')
	@Roles(Role.ADMIN)
	createMenu(@Body() dto: CreateMenuDto) {
		return this.menusService.create(dto);
	}

	@Get('/getMenus')
	getMenus() {
		return this.menusService.findAll();
	}

	@Get('/getMenuById/:id')
	getMenuById(@Param('id', ParseIntPipe) id: number) {
		return this.menusService.findOne(id);
	}

	@Put('/updateMenu/:id')
	@Roles(Role.ADMIN)
	updateMenu(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateMenuDto,
	) {
		return this.menusService.update(id, dto);
	}

	@Delete('/deleteMenu/:id')
	@Roles(Role.ADMIN)
	deleteMenu(@Param('id', ParseIntPipe) id: number) {
		return this.menusService.delete(id);
	}
}
