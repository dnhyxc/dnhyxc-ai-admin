import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { AiUser } from '../ai-user/ai-user.entity';
import { UserModule } from '../user/user.module';
import { AiLearningNoteController } from './ai-learning-note.controller';
import { AiLearningNote } from './ai-learning-note.entity';
import { AiLearningNoteService } from './ai-learning-note.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([AiLearningNote, AiUser], DB_CONNECTIONS.AI),
		UserModule,
	],
	controllers: [AiLearningNoteController],
	providers: [AiLearningNoteService, RoleGuard],
	exports: [AiLearningNoteService],
})
export class AiLearningNoteModule {}
