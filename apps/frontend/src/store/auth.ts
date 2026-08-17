import { makeAutoObservable } from 'mobx';
import { TOKEN_KEY, USER_INFO_KEY } from '@/constants';

export type UserMenu = {
	id?: number;
	path: string;
	name?: string;
};

export type UserInfo = {
	id: number;
	username: string;
	email: string;
	aiUserId?: number | null;
	roles?: Array<{
		id: number;
		name: string;
		menus?: UserMenu[];
	}>;
	access_token?: string;
};

export class AuthStore {
	token = localStorage.getItem(TOKEN_KEY) || '';
	userInfo: UserInfo | null = (() => {
		try {
			const raw = localStorage.getItem(USER_INFO_KEY);
			return raw ? (JSON.parse(raw) as UserInfo) : null;
		} catch {
			return null;
		}
	})();

	constructor() {
		makeAutoObservable(this);
	}

	get isAuthed() {
		return Boolean(this.token);
	}

	/** 超级管理员：role.id === 1 或名称为「超级管理员」 */
	get isSuperAdmin() {
		return Boolean(
			this.userInfo?.roles?.some((r) => r.id === 1 || r.name === '超级管理员'),
		);
	}

	/** 普通用户且尚未绑定前台账号 */
	get needsAiBind() {
		return this.isAuthed && !this.isSuperAdmin && !this.userInfo?.aiUserId;
	}

	setSession(payload: UserInfo & { access_token: string }) {
		const { access_token, ...user } = payload;
		this.token = access_token;
		this.userInfo = user;
		localStorage.setItem(TOKEN_KEY, access_token);
		localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
	}

	patchUserInfo(partial: Partial<UserInfo>) {
		if (!this.userInfo) return;
		this.userInfo = { ...this.userInfo, ...partial };
		localStorage.setItem(USER_INFO_KEY, JSON.stringify(this.userInfo));
	}

	logout() {
		this.token = '';
		this.userInfo = null;
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_INFO_KEY);
	}
}
