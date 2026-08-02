import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Menus } from '../menus/menus.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from './roles.entity';

@Injectable()
export class RolesService {
	constructor(
		@InjectRepository(Roles)
		private readonly rolesRepository: Repository<Roles>,
		@InjectRepository(Menus)
		private readonly menusRepository: Repository<Menus>,
	) {}

	async createRole(dto: CreateRoleDto) {
		const menus = dto.menuIds?.length
			? await this.menusRepository.findBy({ id: In(dto.menuIds) })
			: [];
		const role = this.rolesRepository.create({
			name: dto.name,
			description: dto.description || '',
			menus,
		});
		return this.rolesRepository.save(role);
	}

	findAll() {
		return this.rolesRepository.find({ relations: ['menus'] });
	}

	findOne(id: number) {
		return this.rolesRepository.findOne({
			where: { id },
			relations: ['menus'],
		});
	}

	async updateRole(id: number, dto: UpdateRoleDto) {
		const role = await this.findOne(id);
		if (!role) throw new NotFoundException('角色不存在');
		if (dto.menuIds) {
			role.menus = await this.menusRepository.findBy({ id: In(dto.menuIds) });
		}
		if (dto.name) role.name = dto.name;
		if (dto.description !== undefined) role.description = dto.description;
		return this.rolesRepository.save(role);
	}

	async remove(id: number) {
		const role = await this.findOne(id);
		if (!role) throw new NotFoundException('角色不存在');
		return this.rolesRepository.remove(role);
	}

	count(): Promise<number> {
		return this.rolesRepository.count();
	}
}
