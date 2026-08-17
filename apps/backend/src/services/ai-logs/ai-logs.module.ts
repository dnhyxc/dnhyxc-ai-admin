import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { AiUser } from '../ai-user/ai-user.entity';
import { UserModule } from '../user/user.module';
import { AiLog } from './ai-log.entity';
import { AiLogsController } from './ai-logs.controller';
import { AiLogsService } from './ai-logs.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([AiLog, AiUser], DB_CONNECTIONS.AI),
		UserModule,
	],
	controllers: [AiLogsController],
	providers: [AiLogsService, RoleGuard],
	exports: [AiLogsService],
})
export class AiLogsModule {}
