import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { UserModule } from '../user/user.module';
import { AiRole } from './ai-role.entity';
import { AiUserController } from './ai-user.controller';
import { AiUser } from './ai-user.entity';
import { AiUserService } from './ai-user.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([AiUser, AiRole], DB_CONNECTIONS.AI),
		UserModule,
	],
	controllers: [AiUserController],
	providers: [AiUserService, RoleGuard],
	exports: [AiUserService],
})
export class AiUserModule {}
