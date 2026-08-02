/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DEV_API_DOMAIN: string;
	readonly VITE_PROD_API_DOMAIN: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
