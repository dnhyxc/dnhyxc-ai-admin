import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TypeOrmDestroyService implements OnApplicationShutdown {
	constructor(
		@Inject('TYPEORM_CONNECTIONS')
		private readonly connections: Map<string, DataSource>,
	) {}

	async onApplicationShutdown() {
		for (const [name, ds] of this.connections.entries()) {
			if (ds?.isInitialized) {
				await ds.destroy();
				this.connections.delete(name);
			}
		}
	}
}
