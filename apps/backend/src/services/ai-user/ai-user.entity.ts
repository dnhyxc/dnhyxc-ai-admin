import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { AiRole } from './ai-role.entity';

/**
 * 映射 dnhyxc-ai 业务库 `user` 表（只读管理子集）
 */
@Entity({ name: 'user' })
export class AiUser {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	username: string;

	@Column()
	email: string;

	@Column({ name: 'createTime', type: 'timestamp', nullable: true })
	createTime: Date | null;

	@Column({ type: 'boolean', default: false })
	isMember: boolean;

	@Column({ type: 'varchar', length: 32, default: 'free' })
	membershipType: string;

	@Column({ type: 'timestamp', nullable: true })
	memberExpiresAt: Date | null;

	@ManyToMany(
		() => AiRole,
		(role) => role.users,
	)
	@JoinTable({
		name: 'user_roles',
		joinColumn: { name: 'userId', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'rolesId', referencedColumnName: 'id' },
	})
	roles: AiRole[];
}
