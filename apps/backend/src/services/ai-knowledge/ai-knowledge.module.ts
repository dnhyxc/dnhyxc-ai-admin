import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { UserModule } from '../user/user.module';
import { AiKnowledgeController } from './ai-knowledge.controller';
import { AiKnowledge } from './ai-knowledge.entity';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiKnowledgeTrash } from './ai-knowledge-trash.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature(
			[AiKnowledge, AiKnowledgeTrash],
			DB_CONNECTIONS.AI,
		),
		UserModule,
	],
	controllers: [AiKnowledgeController],
	providers: [AiKnowledgeService, RoleGuard],
	exports: [AiKnowledgeService],
})
export class AiKnowledgeModule {}
