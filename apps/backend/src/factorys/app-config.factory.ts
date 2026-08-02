import * as dotenv from 'dotenv';
import * as Joi from 'joi';

const getEnvFilePath = () => {
	return `.env.${process.env.NODE_ENV || 'development'}`;
};

export const appConfig = () => ({
	isGlobal: true,
	envFilePath: getEnvFilePath(),
	load: [() => dotenv.config({ path: '.env' })],
	validationSchema: Joi.object({
		NODE_ENV: Joi.string()
			.valid('development', 'production', 'test')
			.default('development'),
		PORT: Joi.number().default(9113),
		// Admin 主库
		DB_PORT: Joi.number().default(3093),
		DB_HOST: Joi.alternatives()
			.try(Joi.string().ip(), Joi.string().hostname())
			.required(),
		DB_TYPE: Joi.string().valid('mysql', 'postgres').default('mysql'),
		DB_USERNAME: Joi.string().required(),
		DB_PASSWORD: Joi.string().required(),
		DB_DATABASE: Joi.string().required(),
		DB_SYNC: Joi.boolean().default(false),
		DB_POOL_SIZE: Joi.number().default(10),
		// AI 业务库
		AI_DB_ENABLED: Joi.boolean().default(true),
		AI_DB_HOST: Joi.alternatives()
			.try(Joi.string().ip(), Joi.string().hostname())
			.optional(),
		AI_DB_PORT: Joi.number().default(3090),
		AI_DB_USERNAME: Joi.string().optional().allow(''),
		AI_DB_PASSWORD: Joi.string().optional().allow(''),
		AI_DB_DATABASE: Joi.string().optional().allow(''),
		AI_DB_POOL_SIZE: Joi.number().default(5),
		SECRET: Joi.string().required(),
		LOG_LEVEL: Joi.string().optional(),
		LOG_ON: Joi.boolean().optional(),
		REDIS_URL: Joi.string().uri().optional().allow(''),
		REDIS_PASSWORD: Joi.string().optional().allow(''),
		REDIS_USERNAME: Joi.string().optional().allow(''),
		SEED_ADMIN_USERNAME: Joi.string().default('admin'),
		SEED_ADMIN_PASSWORD: Joi.string().default('admin123'),
		SEED_ADMIN_EMAIL: Joi.string().email().default('admin@dnhyxc.cn'),
	}),
});

export default appConfig;
