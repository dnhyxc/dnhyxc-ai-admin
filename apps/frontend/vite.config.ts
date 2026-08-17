import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const devApiProxyTarget = (
		env.VITE_DEV_API_DOMAIN || 'http://localhost:9113/api'
	).replace(/\/api\/?$/, '');

	return {
		plugins: [react(), tailwindcss()],
		resolve: {
			alias: {
				'@': '/src',
			},
		},
		/**
		 * antd 6 按需导入说明：
		 * - 使用 `import { Button } from 'antd'` 命名导入，Vite/ESM 会 tree-shake 未用组件
		 * - CSS-in-JS 运行时只注入用到的组件样式，无需 babel-plugin-import / unplugin-vue-components
		 */
		optimizeDeps: {
			include: ['antd', '@ant-design/icons', 'dayjs'],
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						antd: ['antd', '@ant-design/icons'],
					},
				},
			},
		},
		server: {
			port: 9005,
			strictPort: true,
			proxy: {
				'/api': {
					target: devApiProxyTarget,
					changeOrigin: true,
				},
			},
		},
	};
});
