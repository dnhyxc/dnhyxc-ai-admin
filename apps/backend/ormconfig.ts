import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigEnum } from './src/enum/config.enum';
import { getEnvConfig, parseBoolean } from './src/utils';

const entitiesDir =
	process.env.NODE_ENV === 'test'
		? [`${__dirname}/src/services/**/*.entity.ts`]
		: [`${__dirname}/src/services/**/*.entity.{ts,js}`];

const config = getEnvConfig();

/** Admin 主库 CLI / 默认连接配置 */
export const typeOrmConfig = {
	type: (config[ConfigEnum.DB_TYPE] || 'mysql') as 'mysql',
	port: Number(config[ConfigEnum.DB_PORT] || 3093),
	host: config[ConfigEnum.DB_HOST] || '127.0.0.1',
	username: config[ConfigEnum.DB_USERNAME],
	password: config[ConfigEnum.DB_PASSWORD],
	database: config[ConfigEnum.DB_DATABASE],
	timezone: 'Z',
	extra: {
		timezone: 'Z',
		connectionLimit: Number(config[ConfigEnum.DB_POOL_SIZE] || 10),
		waitForConnections: true,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0,
	},
	entities: entitiesDir,
	synchronize: parseBoolean(config[ConfigEnum.DB_SYNC], false),
	logging: false,
};

export const connectionOptions: TypeOrmModuleOptions = {
	...typeOrmConfig,
};

export default new DataSource({
	...connectionOptions,
	migrations: [`${__dirname}/src/migrations/**/*.{ts,js}`],
	subscribers: [],
} as DataSourceOptions);
