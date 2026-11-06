import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { AiUser } from '../ai-user/ai-user.entity';
import { UserModule } from '../user/user.module';
import { AiShareController } from './ai-share.controller';
import { AiShare } from './ai-share.entity';
import { AiShareService } from './ai-share.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([AiShare, AiUser], DB_CONNECTIONS.AI),
		UserModule,
	],
	controllers: [AiShareController],
	providers: [AiShareService, RoleGuard],
	exports: [AiShareService],
})
export class AiShareModule {}
