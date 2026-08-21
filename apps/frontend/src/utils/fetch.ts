import { message } from 'antd';
import { BASE_URL, TOKEN_KEY, USER_INFO_KEY } from '@/constants';
import { store } from '@/store';

export interface RequestConfig {
	params?: Array<string | number>;
	querys?: Record<string, any>;
	data?: any;
	headers?: Record<string, string>;
	silent?: boolean;
}

export interface ResponseData<T = any> {
	code: number;
	data: T;
	success: boolean;
	message: string;
}

message.config({ maxCount: 1, duration: 2.5 });

const recentToasts = new Map<string, number>();
const TOAST_DEDUP_MS = 2000;

function toastError(msg: string) {
	const now = Date.now();
	const last = recentToasts.get(msg) || 0;
	if (now - last < TOAST_DEDUP_MS) return;
	recentToasts.set(msg, now);
	message.error(msg);
}

function showPermissionAlert(msg: string) {
	store.noticeStore.show(msg);
}

function readToken() {
	return localStorage.getItem(TOKEN_KEY) || '';
}

function buildUrl(path: string, config?: RequestConfig) {
	let url = `${BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
	if (config?.params?.length) {
		url += `/${config.params.map(encodeURIComponent).join('/')}`;
	}
	if (config?.querys) {
		const qs = new URLSearchParams();
		for (const [k, v] of Object.entries(config.querys)) {
			if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
		}
		const s = qs.toString();
		if (s) url += `?${s}`;
	}
	return url;
}

async function request<T>(
	method: string,
	path: string,
	config?: RequestConfig,
): Promise<ResponseData<T>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(config?.headers || {}),
	};
	const token = readToken();
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(buildUrl(path, config), {
		method,
		headers,
		body: config?.data !== undefined ? JSON.stringify(config.data) : undefined,
	});

	const json = (await res.json().catch(() => null)) as ResponseData<T> | null;

	if (res.status === 401) {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_INFO_KEY);
		if (!config?.silent) toastError(json?.message || '请先登录后再试');
		if (!location.pathname.startsWith('/login')) {
			location.href = '/login';
		}
		throw new Error(json?.message || 'Unauthorized');
	}

	if (res.status === 403) {
		const msg = json?.message || '无权操作';
		if (!config?.silent) showPermissionAlert(msg);
		throw new Error(msg);
	}

	if (!json || json.success === false || !res.ok) {
		const msg = json?.message || `请求失败 (${res.status})`;
		if (!config?.silent) toastError(msg);
		throw new Error(msg);
	}

	return json;
}

export const http = {
	get: <T>(path: string, config?: RequestConfig) =>
		request<T>('GET', path, config),
	post: <T>(path: string, config?: RequestConfig) =>
		request<T>('POST', path, config),
	put: <T>(path: string, config?: RequestConfig) =>
		request<T>('PUT', path, config),
	delete: <T>(path: string, config?: RequestConfig) =>
		request<T>('DELETE', path, config),
};
