import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
	@IsString()
	@IsNotEmpty({ message: '角色名不能为空' })
	name: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsArray()
	menuIds?: number[];
}
