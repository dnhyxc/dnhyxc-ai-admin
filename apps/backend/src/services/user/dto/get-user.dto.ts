import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetUserDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageNo?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageSize?: number = 10;

	@IsOptional()
	@IsString()
	username?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	role?: number;
}
