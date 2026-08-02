import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menus } from '../menus/menus.entity';
import { Roles } from '../roles/roles.entity';
import { Profile } from '../user/profile.entity';
import { User } from '../user/user.entity';
import { SeedService } from './seed.service';

@Module({
	imports: [TypeOrmModule.forFeature([User, Roles, Menus, Profile])],
	providers: [SeedService],
})
export class SeedModule {}
