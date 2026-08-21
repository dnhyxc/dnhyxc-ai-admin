import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RebindAiUserDTO {
	@IsString({ message: '前台用户名必须是字符串' })
	@IsNotEmpty({ message: '前台用户名不能为空' })
	@Length(2, 64, { message: '前台用户名长度不正确' })
	username: string;

	@IsString({ message: '前台邮箱必须是字符串' })
	@IsNotEmpty({ message: '前台邮箱不能为空' })
	email: string;

	@IsString({ message: '当前账号密码必须是字符串' })
	@IsNotEmpty({ message: '请输入当前账号密码' })
	@Length(6, 32, { message: '当前账号密码长度不正确' })
	password: string;
}
