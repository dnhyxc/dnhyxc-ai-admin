import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AiUser } from './ai-user.entity';

/**
 * 映射 dnhyxc-ai 业务库 `roles` 表（只读子集，仅展示用）
 */
@Entity({ name: 'roles' })
export class AiRole {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column({ default: '' })
	description: string;

	@ManyToMany(
		() => AiUser,
		(user) => user.roles,
	)
	users: AiUser[];
}
