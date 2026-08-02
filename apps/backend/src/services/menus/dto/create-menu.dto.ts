import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuDto {
	@IsString()
	@IsNotEmpty({ message: '菜单名不能为空' })
	name: string;

	@IsString()
	@IsNotEmpty({ message: '路径不能为空' })
	path: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	order?: number;

	@IsOptional()
	@IsString()
	acl?: string;

	@IsOptional()
	@IsString()
	icon?: string;
}
