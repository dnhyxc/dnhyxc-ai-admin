import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 只映射列表和详情要用的列。业务库禁止 synchronize。 */
@Entity('english_daily_readings')
@Index('uq_english_daily_readings_publish_slot', ['publishDate', 'slot'], {
	unique: true,
})
export class AiDailyReading {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ name: 'publish_date', type: 'varchar', length: 10 })
	publishDate!: string;

	@Column({ type: 'varchar', length: 36, default: 'day' })
	slot!: string;

	@Column({ type: 'varchar', length: 16 })
	status!: string;

	@Column({ name: 'started_at', type: 'datetime', precision: 6 })
	startedAt!: Date;

	@Column({ type: 'varchar', length: 32, default: '' })
	theme!: string;

	@Column({ name: 'attempt_count', type: 'int', default: 0 })
	attemptCount!: number;

	@Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
	lastError!: string | null;

	@Column({ name: 'title_en', type: 'varchar', length: 80, default: '' })
	titleEn!: string;

	@Column({ name: 'title_zh', type: 'varchar', length: 80, default: '' })
	titleZh!: string;

	@Column({ name: 'body_en', type: 'text' })
	bodyEn!: string;

	@Column({ name: 'body_zh', type: 'text' })
	bodyZh!: string;

	@Column({ name: 'source_kind', type: 'varchar', length: 8, default: 'llm' })
	sourceKind!: string;

	@Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
	sourceUrl!: string | null;

	@Column({
		name: 'source_title',
		type: 'varchar',
		length: 200,
		nullable: true,
	})
	sourceTitle!: string | null;

	@Column({ type: 'json', nullable: true })
	extras!: Record<string, unknown> | null;

	@Column({ name: 'created_at', type: 'datetime', precision: 6 })
	createdAt!: Date;
}
