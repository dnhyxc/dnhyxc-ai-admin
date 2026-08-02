import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMenuDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	path?: string;

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
