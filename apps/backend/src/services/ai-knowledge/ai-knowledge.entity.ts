import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'knowledge' })
@Index('IDX_knowledge_public', ['isPublic'])
export class AiKnowledge {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('text', { nullable: true })
	title: string | null;

	@Column({ type: 'longtext', nullable: true })
	content: string;

	@Column('varchar', { nullable: true })
	author: string | null;

	@Column('int', { nullable: true })
	authorId: number | null;

	@Column({ name: 'is_public', type: 'boolean', default: false })
	isPublic!: boolean;

	@CreateDateColumn({ name: 'created_at', type: 'timestamp' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
	updatedAt: Date;
}
