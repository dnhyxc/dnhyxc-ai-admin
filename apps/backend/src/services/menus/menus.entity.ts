import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Roles } from '../roles/roles.entity';

@Entity()
export class Menus {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	path: string;

	@Column({ type: 'int', default: 0 })
	order: number;

	@Column({ default: '' })
	acl: string;

	@Column({ type: 'varchar', length: 64, default: '' })
	icon: string;

	@ManyToMany(
		() => Roles,
		(roles) => roles.menus,
	)
	roles: Roles[];
}
