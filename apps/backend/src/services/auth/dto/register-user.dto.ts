import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RegisterUserDTO {
	@IsString({ message: '用户名必须为字符串' })
	@IsNotEmpty({ message: '用户名不能为空' })
	@Length(2, 20, { message: '用户名长度必须在 2 到 20 个字符之间' })
	username: string;

	@IsString({ message: '密码必须是字符串' })
	@IsNotEmpty({ message: '密码不能为空' })
	@Length(6, 32, { message: '密码长度必须在 6 到 32 个字符之间' })
	password: string;

	@IsEmail({}, { message: '邮箱格式错误' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email: string;

	@IsString({ message: '验证码必须是字符串' })
	@IsNotEmpty({ message: '验证码不能为空' })
	@Length(4, 4, { message: '验证码长度必须为 4 个字符' })
	captchaText: string;

	@IsString({ message: '验证码 id 必须是字符串' })
	@IsNotEmpty({ message: '验证码 id 不能为空' })
	captchaId: string;
}
