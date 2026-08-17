import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { AiUser } from '../ai-user/ai-user.entity';

/**
 * 映射 dnhyxc-ai 业务库 `logs` 表（只读）
 * 字段以产品库为准：无 action
 */
@Entity({ name: 'logs' })
export class AiLog {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	path: string;

	@Column()
	method: string;

	@Column({ type: 'text' })
	data: string;

	@Column({ name: 'responseData', type: 'text', nullable: true })
	responseData: string | null;

	@Column({ type: 'int' })
	result: number;

	@Column({ name: 'createTime', type: 'timestamp' })
	createTime: Date;

	@ManyToOne(() => AiUser, { nullable: true })
	@JoinColumn({ name: 'userId' })
	user: AiUser | null;
}
