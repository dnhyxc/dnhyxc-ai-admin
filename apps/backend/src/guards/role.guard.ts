import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enum/roles.enum';
import { UserService } from '../services/user/user.service';

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private userService: UserService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requireRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!requireRoles?.length) {
			return true;
		}

		const req = context.switchToHttp().getRequest();
		const user = await this.userService.findByUsername(req?.user?.username);
		if (!user) {
			throw new ForbiddenException('无权操作');
		}

		const roles = user.roles || [];
		const isAdmin = roles.some(
			(r) => r.id === Role.ADMIN || r.name === '超级管理员',
		);
		// 普通用户：不依赖写死的 id（库中可能不是 2），有任意角色即可
		const isStaff = roles.length > 0;

		const ok = requireRoles.some((required) => {
			if (required === Role.ADMIN) return isAdmin;
			if (required === Role.USER) return isStaff;
			return roles.some((r) => r.id === required);
		});

		if (ok) return true;
		// 403：已登录但无权限；勿用 401，否则前端会清 token 踢回登录页
		throw new ForbiddenException('无权操作');
	}
}
