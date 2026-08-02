import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CaptchaDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(4)
	@Max(6)
	size?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(80)
	@Max(240)
	width?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(30)
	@Max(80)
	height?: number;
}
