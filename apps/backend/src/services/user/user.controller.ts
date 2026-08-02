import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { CreateUserDTO } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN, Role.USER)
@UseInterceptors(ClassSerializerInterceptor, ResponseInterceptor)
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post('/addUser')
	@Roles(Role.ADMIN)
	addUser(@Body() dto: CreateUserDTO) {
		return this.userService.create(dto);
	}

	@Get('/getUsers')
	getUsers(@Query() query: GetUserDto) {
		return this.userService.findAll(query);
	}

	@Get('/getUserById/:id')
	getUserById(@Param('id', ParseIntPipe) id: number) {
		return this.userService.findOne(id);
	}

	@Put('/updateUser/:id')
	@Roles(Role.ADMIN)
	updateUser(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateUserDTO,
	) {
		return this.userService.update(id, dto);
	}

	@Delete('/deleteUser/:id')
	@Roles(Role.ADMIN)
	deleteUser(@Param('id', ParseIntPipe) id: number) {
		return this.userService.remove(id);
	}
}
