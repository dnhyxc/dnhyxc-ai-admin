import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGuard } from '../../guards/role.guard';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';
import { Profile } from './profile.entity';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
	imports: [TypeOrmModule.forFeature([User, Profile, Roles, Logs])],
	controllers: [UserController],
	providers: [UserService, RoleGuard],
	exports: [UserService],
})
export class UserModule {}
