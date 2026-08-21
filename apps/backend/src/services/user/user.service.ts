import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, Not, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { hashPassword } from '../../utils';
import { AiUser } from '../ai-user/ai-user.entity';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';
import { CreateUserDTO } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { Profile } from './profile.entity';
import { User } from './user.entity';

export interface UserView extends User {
	aiUsername?: string | null;
}

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
		@InjectRepository(AiUser, DB_CONNECTIONS.AI)
		private readonly aiUserRepository: Repository<AiUser>,
		@InjectDataSource(DB_CONNECTIONS.AI)
		private readonly aiDataSource: DataSource,
	) {}

	async findAll(
		query: GetUserDto,
	): Promise<{ list: UserView[]; total: number }> {
		const { pageSize = 10, pageNo = 1, username, role } = query;
		const take = pageSize;
		const skip = (pageNo - 1) * take;

		const [list, total] = await this.userRepository.findAndCount({
			select: {
				id: true,
				username: true,
				email: true,
				isActive: true,
				aiUserId: true,
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

		// 批量查询关联的前台账号用户名
		const aiUsernameMap = new Map<number, string>();
		if (this.aiDataSource?.isInitialized && list.length > 0) {
			const userIds = list
				.map((u) => u.aiUserId)
				.filter((id): id is number => id != null);
			if (userIds.length > 0) {
				const aiUsers = await this.aiUserRepository
					.createQueryBuilder('u')
					.where('u.id IN (:...ids)', { ids: userIds })
					.getMany();
				for (const au of aiUsers) {
					aiUsernameMap.set(au.id, au.username);
				}
			}
		}

		const viewList: UserView[] = list.map((u) => ({
			...u,
			aiUsername:
				u.aiUserId != null ? (aiUsernameMap.get(u.aiUserId) ?? null) : null,
		}));

		return { list: viewList, total };
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
		if (dto.aiUserId !== undefined) user.aiUserId = dto.aiUserId;
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

	/** 查找已绑定该前台账号的后台用户（可排除自身） */
	findByAiUserId(
		aiUserId: number,
		excludeUserId?: number,
	): Promise<User | null> {
		return this.userRepository.findOne({
			where: excludeUserId
				? { aiUserId, id: Not(excludeUserId) }
				: { aiUserId },
		});
	}
}
