import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Menus } from '../menus/menus.entity';
import { User } from '../user/user.entity';

@Entity()
export class Roles {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column({ default: '' })
	description: string;

	@ManyToMany(
		() => User,
		(user) => user.roles,
	)
	users: User[];

	@ManyToMany(
		() => Menus,
		(menus) => menus.roles,
		{ onDelete: 'CASCADE' },
	)
	@JoinTable({ name: 'roles_menus' })
	menus: Menus[];
}
