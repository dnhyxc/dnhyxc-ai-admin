import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AI_DB_ENABLED, DatabaseModule } from './database/database.module';
import { appConfig } from './factorys/app-config.factory';
import { RedisConfigFactory } from './factorys/redis-config.factory';
import { AiEbookModule } from './services/ai-ebook/ai-ebook.module';
import { AiKnowledgeModule } from './services/ai-knowledge/ai-knowledge.module';
import { AiLogsModule } from './services/ai-logs/ai-logs.module';
import { AiUserModule } from './services/ai-user/ai-user.module';
import { AuthModule } from './services/auth/auth.module';
import { DashboardModule } from './services/dashboard/dashboard.module';
import { HealthModule } from './services/health/health.module';
import { LogsModule } from './services/logs/logs.module';
import { MailModule } from './services/mail/mail.module';
import { MenusModule } from './services/menus/menus.module';
import { RolesModule } from './services/roles/roles.module';
import { SeedModule } from './services/seed/seed.module';
import { UserModule } from './services/user/user.module';

@Global()
@Module({
	imports: [
		ConfigModule.forRoot(appConfig()),
		DatabaseModule,
		NestCacheModule.registerAsync({
			isGlobal: true,
			useClass: RedisConfigFactory,
		}),
		LogsModule,
		UserModule,
		RolesModule,
		MenusModule,
		MailModule,
		AuthModule,
		SeedModule,
		HealthModule,
		DashboardModule,
		...(AI_DB_ENABLED
			? [AiUserModule, AiLogsModule, AiEbookModule, AiKnowledgeModule]
			: []),
	],
	providers: [Logger],
	exports: [Logger],
})
export class AppModule {}
