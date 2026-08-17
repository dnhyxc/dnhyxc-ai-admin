import {
	IsEmail,
	IsNotEmpty,
	IsNumber,
	IsString,
	Length,
} from 'class-validator';

export class ChangePasswordDTO {
	@IsEmail({}, { message: '邮箱格式错误' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email: string;

	@IsNumber({}, { message: '验证码必须为数字' })
	@IsNotEmpty({ message: '验证码不能为空' })
	verifyCode: number;

	@IsString({ message: '验证码 Key 必须为字符串' })
	@IsNotEmpty({ message: '验证码 Key 不能为空' })
	verifyCodeKey: string;

	@IsString({ message: '原密码必须是字符串' })
	@IsNotEmpty({ message: '原密码不能为空' })
	@Length(6, 32, { message: '原密码长度必须在 6 到 32 个字符之间' })
	oldPassword: string;

	@IsString({ message: '新密码必须是字符串' })
	@IsNotEmpty({ message: '新密码不能为空' })
	@Length(6, 32, { message: '新密码长度必须在 6 到 32 个字符之间' })
	newPassword: string;
}
