import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Post,
	Req,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../../guards/jwt.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { CaptchaDto } from './dto/captcha.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { LoginUserDTO } from './dto/login-user.dto';
import { RegisterUserDTO } from './dto/register-user.dto';
import { SendChangePasswordCodeDTO } from './dto/send-change-password-code.dto';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor, ResponseInterceptor)
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly userService: UserService,
	) {}

	@Post('/login')
	login(@Body() dto: LoginUserDTO) {
		return this.authService.login(dto);
	}

	@Post('/register')
	register(@Body() dto: RegisterUserDTO) {
		return this.authService.register(dto);
	}

	@Post('/createVerifyCode')
	createVerifyCode(@Body() dto: CaptchaDto) {
		return this.authService.createVerifyCode(dto);
	}

	@Post('/sendChangePasswordCode')
	sendChangePasswordCode(@Body() dto: SendChangePasswordCodeDTO) {
		return this.authService.sendChangePasswordCode(dto);
	}

	@Post('/changePassword')
	changePassword(@Body() dto: ChangePasswordDTO) {
		return this.authService.changePassword(dto);
	}

	@Get('/profile')
	@UseGuards(JwtGuard)
	async profile(@Req() req: Request & { user?: { userId?: number } }) {
		const userId = req.user?.userId;
		if (!userId) return null;
		return this.userService.findOne(userId);
	}
}
