import { Controller, Get, Inject, Optional, UseInterceptors } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';

@Controller('health')
@UseInterceptors(ResponseInterceptor)
export class HealthController {
	constructor(
		@InjectDataSource()
		private readonly adminDb: DataSource,
		@Inject('TYPEORM_CONNECTIONS')
		private readonly connections: Map<string, DataSource>,
		@Optional()
		@Inject('AI_DB_ENABLED')
		private readonly aiDbEnabled?: boolean,
	) {}

	@Get()
	async check() {
		const admin = await this.ping(this.adminDb);
		const aiDs = this.connections.get(DB_CONNECTIONS.AI);
		const ai = this.aiDbEnabled
			? await this.ping(aiDs)
			: { connected: false, message: '未启用' };

		return {
			status: admin.connected ? 'ok' : 'degraded',
			adminDb: admin,
			aiDb: ai,
			uptime: process.uptime(),
		};
	}

	private async ping(ds?: DataSource) {
		try {
			if (!ds?.isInitialized) {
				return { connected: false, message: '未初始化' };
			}
			await ds.query('SELECT 1');
			return { connected: true, message: 'ok' };
		} catch (e: any) {
			return { connected: false, message: e?.message || '失败' };
		}
	}
}
