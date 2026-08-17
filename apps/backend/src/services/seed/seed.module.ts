import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menus } from '../menus/menus.entity';
import { Roles } from '../roles/roles.entity';
import { SeedService } from './seed.service';

@Module({
	imports: [TypeOrmModule.forFeature([Roles, Menus])],
	providers: [SeedService],
})
export class SeedModule {}
