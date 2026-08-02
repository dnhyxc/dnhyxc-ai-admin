import {
	Column,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Profile {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int', default: 0 })
	gender: number;

	@Column({ type: 'varchar', length: 512, default: '' })
	avatar: string;

	@Column({ type: 'varchar', length: 255, default: '' })
	address: string;

	@OneToOne(() => User)
	@JoinColumn()
	user: User;
}
