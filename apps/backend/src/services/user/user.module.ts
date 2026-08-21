import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { RoleGuard } from '../../guards/role.guard';
import { AiUser } from '../ai-user/ai-user.entity';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';
import { Profile } from './profile.entity';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([User, Profile, Roles, Logs]),
		TypeOrmModule.forFeature([AiUser], DB_CONNECTIONS.AI),
	],
	controllers: [UserController],
	providers: [UserService, RoleGuard],
	exports: [UserService],
})
export class UserModule {}
