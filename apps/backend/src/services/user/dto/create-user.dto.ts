import {
	IsArray,
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator';

export class CreateUserDTO {
	@IsString()
	@IsNotEmpty({ message: '用户名不能为空' })
	@Length(2, 20, { message: '用户名长度必须在 2 到 20 个字符之间' })
	username: string;

	@IsString()
	@IsNotEmpty({ message: '密码不能为空' })
	@Length(6, 32, { message: '密码长度必须在 6 到 32 个字符之间' })
	password: string;

	@IsEmail({}, { message: '邮箱格式错误' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email: string;

	@IsOptional()
	@IsArray()
	roleIds?: number[];
}
