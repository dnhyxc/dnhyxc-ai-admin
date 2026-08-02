import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 映射 dnhyxc-ai 业务库 `user` 表（只读管理子集）
 * 字段与产品侧保持兼容；不声明复杂关联，避免跨库关系误用。
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
}
