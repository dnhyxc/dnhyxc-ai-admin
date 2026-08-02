import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Menus } from './menus.entity';

@Injectable()
export class MenusService {
	constructor(
		@InjectRepository(Menus)
		private readonly menusRepository: Repository<Menus>,
	) {}

	create(dto: CreateMenuDto) {
		const menu = this.menusRepository.create({
			name: dto.name,
			path: dto.path,
			order: dto.order ?? 0,
			acl: dto.acl || '',
			icon: dto.icon || '',
		});
		return this.menusRepository.save(menu);
	}

	findAll() {
		return this.menusRepository.find({ order: { order: 'ASC', id: 'ASC' } });
	}

	findOne(id: number) {
		return this.menusRepository.findOne({ where: { id } });
	}

	async update(id: number, dto: UpdateMenuDto) {
		const menu = await this.findOne(id);
		if (!menu) throw new NotFoundException('菜单不存在');
		Object.assign(menu, dto);
		return this.menusRepository.save(menu);
	}

	async delete(id: number) {
		const menu = await this.findOne(id);
		if (!menu) throw new NotFoundException('菜单不存在');
		return this.menusRepository.remove(menu);
	}

	count(): Promise<number> {
		return this.menusRepository.count();
	}
}
