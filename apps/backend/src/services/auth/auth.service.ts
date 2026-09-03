import { randomUUID } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import type { Cache } from 'cache-manager';
import * as svgCaptcha from 'svg-captcha';
import { Repository } from 'typeorm';
import { EmailEnum } from '../../enum/config.enum';
import { Role } from '../../enum/roles.enum';
import { comparePassword } from '../../utils';
import { LogsService } from '../logs/logs.service';
import { Roles } from '../roles/roles.entity';
import { UserService } from '../user/user.service';
import { CaptchaDto } from './dto/captcha.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { EmailOptionsDTO } from './dto/email.dto';
import { LoginUserDTO } from './dto/login-user.dto';
import { RegisterUserDTO } from './dto/register-user.dto';
import { SendChangePasswordCodeDTO } from './dto/send-change-password-code.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwt: JwtService,
		@Inject(CACHE_MANAGER) private readonly cache: Cache,
		private readonly logsService: LogsService,
		private readonly mailerService: MailerService,
		private readonly configService: ConfigService,
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

		// 首个注册用户成为超级管理员，后续为普通用户
		const isFirstUser = (await this.userService.count()) === 0;
		const role = isFirstUser
			? await this.ensureAdminRole()
			: await this.ensureUserRole();
		const user = await this.userService.create({
			username,
			password,
			email,
			roleIds: [role.id],
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

	/** 确保超级管理员角色存在（默认 Role.ADMIN = 1） */
	private async ensureAdminRole(): Promise<Roles> {
		let role =
			(await this.rolesRepository.findOne({
				where: { id: Role.ADMIN },
				relations: ['menus'],
			})) ||
			(await this.rolesRepository.findOne({
				where: { name: '超级管理员' },
				relations: ['menus'],
			}));
		if (!role) {
			role = await this.rolesRepository.save(
				this.rolesRepository.create({
					name: '超级管理员',
					description: '拥有全部后台权限',
					menus: [],
				}),
			);
		}
		return role;
	}

	/** 确保普通用户角色存在（默认 Role.USER = 2） */
	private async ensureUserRole(): Promise<Roles> {
		let role =
			(await this.rolesRepository.findOne({
				where: { id: Role.USER },
				relations: ['menus'],
			})) ||
			(await this.rolesRepository.findOne({
				where: { name: '普通用户' },
				relations: ['menus'],
			}));
		if (!role) {
			role = await this.rolesRepository.save(
				this.rolesRepository.create({
					name: '普通用户',
					description: '仅可查看关联前台账号的书籍列表',
					menus: [],
				}),
			);
		}
		return role;
	}

	/** 发送邮箱验证码（实现对齐 dnhyxc-ai AuthService.sendEmail） */
	async sendEmail(to: string, options?: EmailOptionsDTO) {
		const key = options?.key || 'EMAIL';
		const timeout = options?.timeout || 60 * 1000;
		try {
			const code = Math.floor(100000 + Math.random() * 900000).toString();
			await this.mailerService.sendMail({
				to,
				from: `"dnhyxc-ai-admin" <${this.configService.get(EmailEnum.EMAIL_FROM)}>`,
				subject: options?.subject || '验证码',
				html: `
					<div>
						<h1>${options?.title || 'dnhyxc-ai-admin 验证码'}</h1>
						<h3>接收验证码</h3>
						<p>验证码：<span style="font-size: 20px;">${code}</span></p>
						<p style="font-size: 14px;">此验证码只在 ${timeout / (60 * 1000)} 分钟内有效，请尽快使用，同时请勿泄露给其他人。</p>
					</div>
				`,
			});
			const REDIS_KEY = `${key}_${randomUUID()}_${to}`;
			await this.cache.set(REDIS_KEY, code, timeout);
			return { key: REDIS_KEY };
		} catch (error: any) {
			throw new HttpException(
				error?.message || '发送邮件失败',
				HttpStatus.BAD_REQUEST,
			);
		}
	}

	async verifyEmail(verifyCodeKey: string, verifyCode: number) {
		const codeInCache = await this.cache.get(verifyCodeKey);
		if (!codeInCache) {
			throw new HttpException(
				'验证码已过期，请重新获取',
				HttpStatus.BAD_REQUEST,
			);
		}
		if (Number(codeInCache) === Number(verifyCode)) {
			return true;
		}
		throw new HttpException('验证码错误', HttpStatus.BAD_REQUEST);
	}

	async sendChangePasswordCode(dto: SendChangePasswordCodeDTO) {
		const user = await this.userService.findByEmail(dto.email);
		if (!user) {
			throw new HttpException('该邮箱未绑定任何账号', HttpStatus.BAD_REQUEST);
		}
		if (!user.email) {
			throw new HttpException('账号未绑定邮箱', HttpStatus.BAD_REQUEST);
		}
		if (user.email.toLowerCase() !== dto.email.toLowerCase()) {
			throw new HttpException('当前用户未绑定该邮箱', HttpStatus.BAD_REQUEST);
		}
		return this.sendEmail(dto.email, {
			subject: '修改密码验证码',
			title: '修改登录密码',
			key: 'CHANGE_PASSWORD',
			timeout: 5 * 60 * 1000,
		});
	}

	async changePassword(dto: ChangePasswordDTO) {
		const { email, verifyCode, verifyCodeKey, oldPassword, newPassword } = dto;
		if (oldPassword && oldPassword === newPassword) {
			throw new HttpException('新密码不能与原密码相同', HttpStatus.BAD_REQUEST);
		}

		const user = await this.userService.findByEmail(email);
		if (!user) {
			throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
		}
		if (!user.email || user.email.toLowerCase() !== email.toLowerCase()) {
			throw new HttpException('邮箱不匹配', HttpStatus.BAD_REQUEST);
		}

		await this.verifyEmail(verifyCodeKey, verifyCode);

		// 有 oldPassword 时校验旧密码（登录态修改密码场景）；
		// 忘记密码场景不传 oldPassword，仅凭邮箱验证码完成身份验证。
		if (oldPassword) {
			const isPasswordValid = await comparePassword(oldPassword, user.password);
			if (!isPasswordValid) {
				throw new HttpException('原密码错误', HttpStatus.BAD_REQUEST);
			}
		}

		await this.userService.update(user.id, { password: newPassword });
		await this.cache.del(verifyCodeKey);

		await this.logsService.create({
			path: '/api/auth/changePassword',
			method: 'POST',
			data: JSON.stringify({ userId: user.id }),
			result: 200,
			action: 'changePassword',
			user,
		});

		return { ok: true };
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
