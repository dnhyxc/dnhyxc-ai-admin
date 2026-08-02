import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export type ThemeMode = 'light' | 'dark';

/** 品牌色预设，可在顶栏切换 */
export const colorPresets = [
	{ key: 'teal', label: '青石', color: '#0f3d3e' },
	{ key: 'blue', label: '霁蓝', color: '#1677ff' },
	{ key: 'purple', label: '暮紫', color: '#722ed1' },
	{ key: 'orange', label: '琥珀', color: '#d46b08' },
] as const;

export type ColorPresetKey = (typeof colorPresets)[number]['key'];

export function getPresetColor(key: ColorPresetKey): string {
	return colorPresets.find((p) => p.key === key)?.color ?? colorPresets[0].color;
}

export function buildThemeConfig(
	mode: ThemeMode,
	primaryColor: string,
): ThemeConfig {
	const isDark = mode === 'dark';

	return {
		algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
		cssVar: { key: 'dnhyxc-admin' },
		token: {
			colorPrimary: primaryColor,
			colorInfo: primaryColor,
			borderRadius: 8,
			fontFamily:
				'"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			...(isDark
				? {
						colorBgLayout: '#0f1419',
						colorBgContainer: '#161b22',
					}
				: {
						colorBgLayout: '#f3efe6',
						colorBgContainer: '#fffaf2',
					}),
		},
		components: {
			Layout: {
				headerBg: isDark ? '#161b22' : '#fffaf2',
				siderBg: isDark ? '#0c1216' : '#102a2b',
				triggerBg: isDark ? '#161b22' : '#0f3d3e',
			},
			Menu: {
				darkItemBg: 'transparent',
				darkSubMenuItemBg: 'transparent',
				darkItemSelectedBg: 'rgba(255,255,255,0.12)',
			},
		},
	};
}
