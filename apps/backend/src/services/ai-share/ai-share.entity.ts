import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** 映射 dnhyxc-ai `shares` 表（只读台账） */
@Entity({ name: 'shares' })
@Index('IDX_shares_expires_at', ['expiresAt'])
@Index('IDX_shares_created_by', ['createdBy'])
export class AiShare {
	@PrimaryColumn({ name: 'share_id', type: 'varchar', length: 64 })
	shareId!: string;

	@Column({ name: 'chat_session_id', type: 'varchar', length: 64 })
	chatSessionId!: string;

	@Column({
		name: 'share_type',
		type: 'varchar',
		length: 32,
		default: 'session',
	})
	shareType!: string;

	@Column({ name: 'session_type', type: 'varchar', length: 32, nullable: true })
	sessionType!: string | null;

	@Column({ name: 'message_ids', type: 'json', nullable: true })
	messageIds!: string[] | null;

	@Column({ type: 'varchar', length: 500, nullable: true })
	title!: string | null;

	@Column({ name: 'content_snapshot', type: 'json', nullable: true })
	contentSnapshot!: Record<string, unknown> | null;

	@Column({ name: 'snapshot_truncated', type: 'boolean', default: false })
	snapshotTruncated!: boolean;

	@Column({ name: 'created_by', type: 'int', nullable: true })
	createdBy!: number | null;

	@Column({ name: 'created_at_ms', type: 'bigint' })
	createdAt!: string;

	@Column({ name: 'expires_at_ms', type: 'bigint' })
	expiresAt!: string;

	@Column({ name: 'revoked_at_ms', type: 'bigint', nullable: true })
	revokedAt!: string | null;

	@Column({ name: 'view_count', type: 'int', default: 0 })
	viewCount!: number;
}
