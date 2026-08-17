import { IsNotEmpty, IsString, Length } from 'class-validator';

export class BindAiUserDTO {
	@IsString({ message: '前台用户名必须是字符串' })
	@IsNotEmpty({ message: '前台用户名不能为空' })
	@Length(2, 64, { message: '前台用户名长度不正确' })
	username: string;

	@IsString({ message: '前台邮箱必须是字符串' })
	@IsNotEmpty({ message: '前台邮箱不能为空' })
	email: string;
}
