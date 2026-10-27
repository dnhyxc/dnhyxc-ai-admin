import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { UserModule } from '../user/user.module';
import { AiDailyReadingController } from './ai-daily-reading.controller';
import { AiDailyReading } from './ai-daily-reading.entity';
import { AiDailyReadingService } from './ai-daily-reading.service';
import { AiDailyReadingAttempt } from './ai-daily-reading-attempt.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature(
			[AiDailyReading, AiDailyReadingAttempt],
			DB_CONNECTIONS.AI,
		),
		UserModule,
	],
	controllers: [AiDailyReadingController],
	providers: [AiDailyReadingService, RoleGuard],
})
export class AiDailyReadingModule {}
