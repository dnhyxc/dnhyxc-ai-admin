import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export class JwtGuard extends AuthGuard('jwt') {
	handleRequest(err: any, user: any) {
		if (err || !user) {
			throw new UnauthorizedException('请先登录后再试');
		}
		return user;
	}
}
