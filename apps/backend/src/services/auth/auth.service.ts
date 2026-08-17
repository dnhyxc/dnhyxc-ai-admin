import { randomUUID } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import * as svgCaptcha from 'svg-captcha';
import { Repository } from 'typeorm';
import { Role } from '../../enum/roles.enum';
import { comparePassword } from '../../utils';
import { LogsService } from '../logs/logs.service';
import { Roles } from '../roles/roles.entity';
import { UserService } from '../user/user.service';
import { CaptchaDto } from './dto/captcha.dto';
import { LoginUserDTO } from './dto/login-user.dto';
import { RegisterUserDTO } from './dto/register-user.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwt: JwtService,
		@Inject(CACHE_MANAGER) private readonly cache: Cache,
		private readonly logsService: LogsService,
		@InjectRepository(Roles)
		private readonly rolesRepository: Repository<Roles>,
	) {}

	async login(dto: LoginUserDTO) {
		const { username, password, captchaId, captchaText } = dto;
		const isCaptchaValid = await this.verifyCaptcha(captchaId, captchaText);
		if (!isCaptchaValid) {
			throw new HttpException('验证码错误', HttpStatus.BAD_REQUEST);
		}

		const user = await this.userService.findByUsername(username);
		if (!user) {
			throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
		}
		if (!user.isActive) {
			throw new HttpException('账号已被禁用', HttpStatus.FORBIDDEN);
		}

		const isPasswordValid = await comparePassword(password, user.password);
		if (!isPasswordValid) {
			throw new HttpException('用户名或密码错误', HttpStatus.BAD_REQUEST);
		}

		const { password: _, ...userInfo } = user;
		const token = await this.jwt.signAsync({
			username: userInfo.username,
			sub: userInfo.id,
		});

		await this.logsService.create({
			path: '/api/auth/login',
			method: 'POST',
			data: JSON.stringify({ username }),
			result: 200,
			action: 'login',
			user,
		});

		return {
			access_token: token,
			...userInfo,
		};
	}

	async register(dto: RegisterUserDTO) {
		const { username, password, email, captchaId, captchaText } = dto;
		const isCaptchaValid = await this.verifyCaptcha(captchaId, captchaText);
		if (!isCaptchaValid) {
			throw new HttpException('验证码错误', HttpStatus.BAD_REQUEST);
		}

		if (await this.userService.findByUsername(username)) {
			throw new HttpException('用户名已存在', HttpStatus.BAD_REQUEST);
		}
		if (await this.userService.findByEmail(email)) {
			throw new HttpException('邮箱已被注册', HttpStatus.BAD_REQUEST);
		}

		const userRole = await this.ensureUserRole();
		const user = await this.userService.create({
			username,
			password,
			email,
			roleIds: [userRole.id],
		});

		await this.logsService.create({
			path: '/api/auth/register',
			method: 'POST',
			data: JSON.stringify({ username, email }),
			result: 200,
			action: 'register',
			user,
		});

		const { password: _, ...userInfo } = user;
		return userInfo;
	}

	/** 确保普通用户角色存在（默认 Role.USER = 2） */
	private async ensureUserRole(): Promise<Roles> {
		let role =
			(await this.rolesRepository.findOne({ where: { id: Role.USER } })) ||
			(await this.rolesRepository.findOne({ where: { name: '普通用户' } }));
		if (!role) {
			role = await this.rolesRepository.save(
				this.rolesRepository.create({
					name: '普通用户',
					description: '自助注册用户，需管理员分配后台权限',
					menus: [],
				}),
			);
		}
		return role;
	}

	async createVerifyCode(dto?: CaptchaDto) {
		const { size = 4, width = 120, height = 40 } = dto || {};
		const captcha = svgCaptcha.create({
			size,
			ignoreChars: '0oO1ilI',
			noise: 2,
			color: true,
			width,
			height,
		});
		const captchaId = randomUUID();
		const captchaText = captcha.text.toLowerCase();
		await this.cache.set(`captcha:${captchaId}`, captchaText, 120000);
		return {
			captchaId,
			captchaSvg: captcha.data,
			// ponytail: 仅开发环境回传明文，便于联调；生产绝不返回
			...(process.env.NODE_ENV === 'development' ? { captchaText } : {}),
		};
	}

	private async verifyCaptcha(captchaId: string, captchaText: string) {
		const key = `captcha:${captchaId}`;
		const cached = await this.cache.get<string>(key);
		await this.cache.del(key);
		if (!cached) return false;
		return cached === captchaText.toLowerCase();
	}
}
