import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { utilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { Console } from 'winston/lib/winston/transports';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogEnum } from '../../enum/config.enum';
import { RoleGuard } from '../../guards/role.guard';
import { UserModule } from '../user/user.module';
import { LogsController } from './logs.controller';
import { Logs } from './logs.entity';
import { LogsService } from './logs.service';

const createDailyRotateTransport = (
	level: string,
	fileName: string,
): DailyRotateFile => {
	return new DailyRotateFile({
		level,
		dirname: 'logs',
		filename: `${fileName}-%DATE%.log`,
		datePattern: 'YYYY-MM-DD-HH',
		zippedArchive: true,
		maxSize: '20m',
		maxFiles: '14d',
		format: winston.format.combine(
			winston.format.timestamp(),
			winston.format.simple(),
		),
	});
};

@Module({
	imports: [
		TypeOrmModule.forFeature([Logs]),
		UserModule,
		WinstonModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const consoleTransports = new Console({
					level: 'info',
					format: winston.format.combine(
						winston.format.timestamp(),
						utilities.format.nestLike(),
					),
				});

				return {
					transports: [
						consoleTransports,
						...(configService.get(LogEnum.LOG_ON)
							? [
									createDailyRotateTransport('info', 'application'),
									createDailyRotateTransport('warn', 'error'),
								]
							: []),
					],
				};
			},
		}),
	],
	controllers: [LogsController],
	providers: [LogsService, RoleGuard],
	exports: [LogsService],
})
export class LogsModule {}
