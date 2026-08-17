import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Logs {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	path: string;

	@Column()
	method: string;

	@Column({ type: 'text' })
	data: string;

	@Column({ type: 'int', default: 200 })
	result: number;

	@Column({ type: 'varchar', length: 64, default: '' })
	action: string;

	@CreateDateColumn({ type: 'timestamp' })
	createTime: Date;

	@ManyToOne(
		() => User,
		(user) => user.logs,
		{
			nullable: true,
			// 删除用户时保留操作日志，仅断开关联
			onDelete: 'SET NULL',
		},
	)
	@JoinColumn()
	user: User | null;
}
