import {
	IsArray,
	IsBoolean,
	IsEmail,
	IsOptional,
	IsString,
	Length,
} from 'class-validator';

export class UpdateUserDTO {
	@IsOptional()
	@IsEmail({}, { message: '邮箱格式错误' })
	email?: string;

	@IsOptional()
	@IsString()
	@Length(6, 32, { message: '密码长度必须在 6 到 32 个字符之间' })
	password?: string;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@IsOptional()
	@IsArray()
	roleIds?: number[];
}
