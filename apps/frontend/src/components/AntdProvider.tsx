import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { observer } from 'mobx-react';
import type { ReactNode } from 'react';
import { useStore } from '@/store';
import { buildThemeConfig } from '@/theme/tokens';

/**
 * antd 6：CSS-in-JS 天然按需注入样式；组件请用 `import { Button } from 'antd'` 命名导入以便 tree-shaking。
 */
export const AntdProvider = observer(function AntdProvider({
	children,
}: {
	children: ReactNode;
}) {
	const { themeStore } = useStore();
	const themeConfig = buildThemeConfig(
		themeStore.mode,
		themeStore.primaryColor,
	);

	return (
		<ConfigProvider locale={zhCN} theme={themeConfig}>
			<App>{children}</App>
		</ConfigProvider>
	);
});
