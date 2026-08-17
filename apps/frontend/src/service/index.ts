import { http } from '@/utils/fetch';
import { API } from './api';

export const loginApi = (data: {
	username: string;
	password: string;
	captchaId: string;
	captchaText: string;
}) => http.post(API.login, { data });

export const registerApi = (data: {
	username: string;
	password: string;
	email: string;
	captchaId: string;
	captchaText: string;
}) => http.post(API.register, { data });

export const captchaApi = () => http.post(API.captcha, { data: {} });

export const profileApi = () => http.get(API.profile);

export const overviewApi = () => http.get(API.overview);

export const getUsersApi = (querys?: Record<string, any>) =>
	http.get(API.users, { querys });

export const addUserApi = (data: Record<string, any>) =>
	http.post(API.addUser, { data });

export const updateUserApi = (id: number, data: Record<string, any>) =>
	http.put(API.updateUser, { params: [id], data });

export const deleteUserApi = (id: number) =>
	http.delete(API.deleteUser, { params: [id] });

export const getRolesApi = () => http.get(API.roles);

export const createRoleApi = (data: Record<string, any>) =>
	http.post(API.createRole, { data });

export const updateRoleApi = (id: number, data: Record<string, any>) =>
	http.put(API.updateRole, { params: [id], data });

export const deleteRoleApi = (id: number) =>
	http.delete(API.deleteRole, { params: [id] });

export const getMenusApi = () => http.get(API.menus);

export const createMenuApi = (data: Record<string, any>) =>
	http.post(API.createMenu, { data });

export const updateMenuApi = (id: number, data: Record<string, any>) =>
	http.put(API.updateMenu, { params: [id], data });

export const deleteMenuApi = (id: number) =>
	http.delete(API.deleteMenu, { params: [id] });

export const getLogsApi = (querys?: Record<string, any>) =>
	http.get(API.logs, { querys });

export const deleteLogApi = (id: number) =>
	http.delete(API.deleteLog, { params: [id] });

export const deleteLogsApi = (ids: number[]) =>
	http.delete(API.deleteLogs, { data: { ids } });

export const getAiUsersApi = (querys?: Record<string, any>) =>
	http.get(API.aiUsers, { querys, silent: true });

export const getAiLogsApi = (querys?: Record<string, any>) =>
	http.get(API.aiLogs, { querys, silent: true });

export const deleteAiLogApi = (id: number) =>
	http.delete(API.deleteAiLog, { params: [id] });

export const deleteAiLogsApi = (ids: number[]) =>
	http.delete(API.deleteAiLogs, { data: { ids } });

export const getAiEbooksApi = (querys?: Record<string, any>) =>
	http.get(API.aiEbooks, { querys, silent: true });
