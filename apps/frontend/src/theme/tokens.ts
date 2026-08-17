import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export type ThemeMode = 'light' | 'dark';

/** 与 dnhyxc-ai/apps/admin 对齐：默认 indigo */
export const colorPresets = [
	{ key: 'indigo', label: '靛蓝', color: '#6366f1' },
	{ key: 'blue', label: '霁蓝', color: '#1677ff' },
	{ key: 'purple', label: '暮紫', color: '#722ed1' },
	{ key: 'teal', label: '青石', color: '#0f3d3e' },
] as const;

export type ColorPresetKey = (typeof colorPresets)[number]['key'];

export function getPresetColor(key: ColorPresetKey): string {
	return (
		colorPresets.find((p) => p.key === key)?.color ?? colorPresets[0].color
	);
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
				'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			...(isDark
				? {
						colorBgLayout: '#0f172a',
						colorBgContainer: '#1e293b',
						colorBorder: '#334155',
					}
				: {
						colorBgLayout: '#f8fafc',
						colorBgContainer: '#ffffff',
						colorBorder: '#e2e8f0',
					}),
		},
		components: {
			Layout: {
				headerBg: isDark ? '#1e293b' : '#ffffff',
				siderBg: isDark ? '#020617' : '#1e293b',
			},
			Card: {
				borderRadiusLG: 12,
			},
			Table: {
				headerBg: isDark ? '#334155' : '#f8fafc',
			},
		},
	};
}
