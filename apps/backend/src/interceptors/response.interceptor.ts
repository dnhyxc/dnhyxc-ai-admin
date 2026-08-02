import {
	CallHandler,
	ExecutionContext,
	HttpStatus,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface Data<T> {
	data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<Data<T>> {
		const httpRes = context.switchToHttp().getResponse<{
			headersSent?: boolean;
			writableEnded?: boolean;
		}>();
		return next.handle().pipe(
			map((data) => {
				if (httpRes?.headersSent || httpRes?.writableEnded) {
					return data as Data<T>;
				}
				return {
					data,
					code: HttpStatus.OK,
					message: '请求成功',
					success: true,
				};
			}),
		);
	}
}
