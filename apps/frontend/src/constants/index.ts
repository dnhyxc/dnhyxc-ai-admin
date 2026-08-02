const isProd = import.meta.env.PROD;

export const BASE_URL = isProd
	? import.meta.env.VITE_PROD_API_DOMAIN || '/api'
	: import.meta.env.VITE_DEV_API_DOMAIN || '/api';

export const TOKEN_KEY = 'token';
export const USER_INFO_KEY = 'userInfo';
