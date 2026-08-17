import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { AiUser } from '../ai-user/ai-user.entity';
import { UserModule } from '../user/user.module';
import { AiEbookController } from './ai-ebook.controller';
import { AiEbookService } from './ai-ebook.service';
import { AiEbookBook } from './ai-ebook-book.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([AiEbookBook, AiUser], DB_CONNECTIONS.AI),
		UserModule,
	],
	controllers: [AiEbookController],
	providers: [AiEbookService, RoleGuard],
	exports: [AiEbookService],
})
export class AiEbookModule {}
