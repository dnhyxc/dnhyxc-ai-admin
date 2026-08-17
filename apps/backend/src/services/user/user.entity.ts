import { Exclude } from 'class-transformer';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinTable,
	ManyToMany,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';
import { Profile } from './profile.entity';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	username: string;

	@Column()
	@Exclude()
	password: string;

	@Column({ unique: true })
	email: string;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	/** 关联的前台（AI 库）用户 id；普通用户书籍数据按此隔离 */
	@Column({ type: 'int', nullable: true })
	aiUserId: number | null;

	@CreateDateColumn({ type: 'timestamp' })
	createTime: Date;

	@UpdateDateColumn({ type: 'timestamp' })
	updateTime: Date;

	@OneToMany(
		() => Logs,
		(logs) => logs.user,
	)
	logs: Logs[];

	@ManyToMany(
		() => Roles,
		(roles) => roles.users,
	)
	@JoinTable({ name: 'user_roles' })
	roles: Roles[];

	@OneToOne(
		() => Profile,
		(profile) => profile.user,
		{ cascade: true },
	)
	profile: Profile;
}
