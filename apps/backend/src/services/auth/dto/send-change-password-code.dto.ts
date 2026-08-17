import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendChangePasswordCodeDTO {
	@IsEmail({}, { message: '邮箱格式错误' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email: string;
}
