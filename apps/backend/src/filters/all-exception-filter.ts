import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	type LoggerService,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as requestIp from 'request-ip';
import { QueryFailedError } from 'typeorm';
import { extractDuplicateValue } from '../utils';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	constructor(
		private readonly logger: LoggerService,
		private readonly httpAdapterHost: HttpAdapterHost,
	) {}

	catch(exception: HttpException, host: ArgumentsHost) {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		let message = '';

		const httpStatus =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		let exceptionResponse =
			exception instanceof HttpException
				? exception.getResponse()
				: 'Internal Server Error';

		if (exception instanceof QueryFailedError) {
			message =
				extractDuplicateValue(exception.driverError?.sqlMessage) ||
				'数据库操作失败';
			exceptionResponse =
				exception.driverError?.errno === 1062
					? '数据库唯一索引冲突，记录重复'
					: exception.message;
		}

		const responseBody = {
			headers: request.headers,
			query: request.query,
			body: request.body,
			params: request.params,
			method: request.method,
			ip: requestIp.getClientIp(request),
			timestamp: new Date().toLocaleString('zh-CN'),
			exception: exception?.name,
			path: httpAdapter.getRequestUrl(request),
			error: exceptionResponse,
			success: false,
			code: httpStatus,
			message: message || exception?.message || '服务器错误',
		};

		const status = exception?.getStatus?.() || httpStatus || 520;
		this.logger.error('[dnhyxc-admin]', responseBody);
		httpAdapter.reply(response, responseBody, status);
	}
}
