import * as fs from 'node:fs';
import * as dotenv from 'dotenv';

export * from './bcrypt';

export const getEnv = (env: string): Record<string, unknown> => {
	if (fs.existsSync(env)) {
		return dotenv.parse(fs.readFileSync(env));
	}
	return {};
};

export const getEnvConfig = (): Record<string, any> => {
	const defaultConfig = getEnv('.env');
	const envConfig = getEnv(`.env.${process.env.NODE_ENV || 'development'}`);
	return {
		...defaultConfig,
		...envConfig,
	};
};

export const extractDuplicateValue = (errorMessage: string) => {
	const match = errorMessage.match(/Duplicate entry '([^']+)' for key/);
	return match ? `${match[1]} 重复` : null;
};

export const parseBoolean = (value: unknown, fallback = false): boolean => {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		return value === 'true' || value === '1';
	}
	return fallback;
};
