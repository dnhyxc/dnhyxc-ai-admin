import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import 'winston-daily-rotate-file';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './filters/all-exception-filter';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	app.useBodyParser('json', { limit: '2mb' });
	app.useBodyParser('urlencoded', { limit: '2mb', extended: true });
	app.setGlobalPrefix('api');

	const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
	app.useLogger(logger);

	const httpAdapter = app.get(HttpAdapterHost);
	app.useGlobalFilters(new AllExceptionFilter(logger, httpAdapter));

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: process.env.NODE_ENV !== 'development',
			transform: true,
		}),
	);

	app.use(
		helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' },
		}),
	);

	if (process.env.NODE_ENV === 'production') {
		app.set('trust proxy', 1);
	}

	app.use(
		rateLimit({
			windowMs: 1 * 60 * 1000,
			max: 300,
			standardHeaders: true,
			legacyHeaders: false,
		}),
	);

	app.enableShutdownHooks();

	const options = new DocumentBuilder()
		.addBearerAuth()
		.setTitle('dnhyxc-admin API')
		.setDescription('dnhyxc-ai 配套后台管理系统 API')
		.setVersion('1.0')
		.build();

	const document = SwaggerModule.createDocument(app, options);
	SwaggerModule.setup('/api-docs', app, document);

	const port = process.env.PORT ?? 9113;
	await app.listen(port);
	logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
