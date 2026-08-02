/**
 * TypeORM 命名连接
 * - default：Admin 主库
 * - ai：dnhyxc-ai 业务库（只读管理）
 */
export const DB_CONNECTIONS = {
	ADMIN: 'default',
	AI: 'ai',
} as const;

export type DbConnectionName =
	(typeof DB_CONNECTIONS)[keyof typeof DB_CONNECTIONS];
