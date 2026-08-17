import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { AiUser } from '../ai-user/ai-user.entity';

/**
 * 映射 dnhyxc-ai 业务库 `ebook_book`（只读管理子集）
 */
@Entity({ name: 'ebook_book' })
export class AiEbookBook {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'int', name: 'user_id' })
	userId: number;

	@Column({ type: 'varchar', length: 8 })
	fmt: string;

	@Column({ type: 'varchar', length: 512 })
	title: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	author: string | null;

	@Column({ type: 'varchar', length: 16, name: 'src_kind' })
	srcKind: string;

	@Column({ type: 'bigint', nullable: true })
	size: string | null;

	@Column({ name: 'is_public', type: 'boolean', default: false })
	isPublic: boolean;

	@Column({ type: 'uuid', name: 'source_book_id', nullable: true })
	sourceBookId: string | null;

	@Column({
		type: 'varchar',
		length: 16,
		name: 'parse_status',
		nullable: true,
	})
	parseStatus: string | null;

	@Column({ type: 'int', name: 'total_word_count', nullable: true })
	totalWordCount: number | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamp' })
	createdAt: Date;

	@ManyToOne(() => AiUser, { nullable: true })
	@JoinColumn({ name: 'user_id' })
	user: AiUser | null;
}
