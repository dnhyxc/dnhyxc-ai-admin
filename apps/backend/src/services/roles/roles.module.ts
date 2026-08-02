import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGuard } from '../../guards/role.guard';
import { Menus } from '../menus/menus.entity';
import { UserModule } from '../user/user.module';
import { RolesController } from './roles.controller';
import { Roles } from './roles.entity';
import { RolesService } from './roles.service';

@Module({
	imports: [TypeOrmModule.forFeature([Roles, Menus]), UserModule],
	controllers: [RolesController],
	providers: [RolesService, RoleGuard],
	exports: [RolesService],
})
export class RolesModule {}
