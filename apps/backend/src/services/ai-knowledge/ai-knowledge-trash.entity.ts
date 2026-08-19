import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'knowledge_trash' })
export class AiKnowledgeTrash {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('uuid', { name: 'original_id' })
	originalId: string;

	@Column('text', { nullable: true })
	title: string | null;

	@Column({ type: 'longtext', nullable: true })
	content: string | null;

	@Column('varchar', { nullable: true })
	author: string | null;

	@Column('int', { nullable: true })
	authorId: number | null;

	@Column('timestamp', { name: 'source_created_at', nullable: true })
	sourceCreatedAt: Date | null;

	@Column('timestamp', { name: 'source_updated_at', nullable: true })
	sourceUpdatedAt: Date | null;

	@CreateDateColumn({ name: 'deleted_at', type: 'timestamp' })
	deletedAt: Date;
}
