import {
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../enum/roles.enum';
import { JwtGuard } from '../../guards/jwt.guard';
import { RoleGuard } from '../../guards/role.guard';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { AiDailyReadingService } from './ai-daily-reading.service';

@Controller('ai-daily-reading')
@UseGuards(JwtGuard, RoleGuard)
@Roles(Role.ADMIN)
@UseInterceptors(ResponseInterceptor)
export class AiDailyReadingController {
	constructor(private readonly dailyReading: AiDailyReadingService) {}

	@Get()
	list(@Query('kind') kind?: string) {
		return kind === 'ready'
			? this.dailyReading.listReady()
			: this.dailyReading.listGaps();
	}

	@Get(':publishDate')
	detail(@Param('publishDate') publishDate: string) {
		return this.dailyReading.getDay(publishDate);
	}

	@Delete(':publishDate')
	remove(@Param('publishDate') publishDate: string) {
		return this.dailyReading.removeReady(publishDate);
	}

	@Post(':publishDate/backfill')
	backfill(@Param('publishDate') publishDate: string) {
		return this.dailyReading.backfill(publishDate);
	}
}
