import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGuard } from '../../guards/role.guard';
import { UserModule } from '../user/user.module';
import { MenusController } from './menus.controller';
import { Menus } from './menus.entity';
import { MenusService } from './menus.service';

@Module({
	imports: [TypeOrmModule.forFeature([Menus]), UserModule],
	controllers: [MenusController],
	providers: [MenusService, RoleGuard],
	exports: [MenusService],
})
export class MenusModule {}
