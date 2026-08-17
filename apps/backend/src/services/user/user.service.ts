import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { hashPassword } from '../../utils';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';
import { CreateUserDTO } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { Profile } from './profile.entity';
import { User } from './user.entity';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@InjectRepository(Roles)
		private readonly rolesRepository: Repository<Roles>,
		@InjectRepository(Profile)
		private readonly profileRepository: Repository<Profile>,
		@InjectRepository(Logs)
		private readonly logsRepository: Repository<Logs>,
	) {}

	async findAll(query: GetUserDto): Promise<{ list: User[]; total: number }> {
		const { pageSize = 10, pageNo = 1, username, role } = query;
		const take = pageSize;
		const skip = (pageNo - 1) * take;

		const [list, total] = await this.userRepository.findAndCount({
			select: {
				id: true,
				username: true,
				email: true,
				isActive: true,
				createTime: true,
				updateTime: true,
			},
			relations: { profile: true, roles: true },
			where: {
				username: username ? Like(`%${username}%`) : undefined,
				roles: role ? { id: Number(role) } : undefined,
			},
			take,
			skip,
			order: { id: 'DESC' },
		});

		return { list, total };
	}

	findByUsername(username: string): Promise<User | null> {
		return this.userRepository.findOne({
			where: { username },
			relations: ['roles', 'roles.menus', 'profile'],
		});
	}

	findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({
			where: { email },
			relations: ['roles', 'roles.menus', 'profile'],
		});
	}

	findOne(id: number): Promise<User | null> {
		return this.userRepository.findOne({
			where: { id },
			relations: ['profile', 'roles', 'roles.menus'],
		});
	}

	async create(dto: CreateUserDTO): Promise<User> {
		const roles = dto.roleIds?.length
			? await this.rolesRepository.findBy({ id: In(dto.roleIds) })
			: [];

		const user = this.userRepository.create({
			username: dto.username,
			email: dto.email,
			password: await hashPassword(dto.password),
			roles,
			profile: this.profileRepository.create({
				gender: 0,
				avatar: '',
				address: '',
			}),
		});

		return this.userRepository.save(user);
	}

	async update(id: number, dto: UpdateUserDTO): Promise<User> {
		const user = await this.findOne(id);
		if (!user) throw new NotFoundException('用户不存在');

		if (dto.email) user.email = dto.email;
		if (typeof dto.isActive === 'boolean') user.isActive = dto.isActive;
		if (dto.password) user.password = await hashPassword(dto.password);
		if (dto.roleIds !== undefined) {
			user.roles = dto.roleIds.length
				? await this.rolesRepository.findBy({ id: In(dto.roleIds) })
				: [];
		}

		return this.userRepository.save(user);
	}

	async remove(id: number) {
		if (id === 1) {
			throw new BadRequestException('不能删除默认超级管理员账号');
		}

		const user = await this.findOne(id);
		if (!user) throw new NotFoundException('用户不存在');

		// 先解绑角色中间表
		user.roles = [];
		await this.userRepository.save(user);

		// 操作日志保留，仅断开用户外键（避免 FK 约束失败）
		await this.logsRepository.query(
			'UPDATE logs SET userId = NULL WHERE userId = ?',
			[id],
		);

		// Profile 拥有外键，需先删
		if (user.profile) {
			await this.profileRepository.remove(user.profile);
		} else {
			const profile = await this.profileRepository.findOne({
				where: { user: { id } },
			});
			if (profile) await this.profileRepository.remove(profile);
		}

		await this.userRepository.delete(id);
		return { id };
	}

	count(): Promise<number> {
		return this.userRepository.count();
	}
}
