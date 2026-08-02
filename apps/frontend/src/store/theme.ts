import { makeAutoObservable } from 'mobx';
import {
	type ColorPresetKey,
	getPresetColor,
	type ThemeMode,
} from '@/theme/tokens';

const MODE_KEY = 'themeMode';
const PRESET_KEY = 'themePreset';

function readMode(): ThemeMode {
	const v = localStorage.getItem(MODE_KEY);
	return v === 'dark' ? 'dark' : 'light';
}

function readPreset(): ColorPresetKey {
	const v = localStorage.getItem(PRESET_KEY);
	if (v === 'blue' || v === 'purple' || v === 'orange' || v === 'teal') {
		return v;
	}
	return 'teal';
}

export class ThemeStore {
	mode: ThemeMode = readMode();
	preset: ColorPresetKey = readPreset();

	constructor() {
		makeAutoObservable(this);
		this.applyDomClass();
	}

	get primaryColor() {
		return getPresetColor(this.preset);
	}

	get isDark() {
		return this.mode === 'dark';
	}

	setMode(mode: ThemeMode) {
		this.mode = mode;
		localStorage.setItem(MODE_KEY, mode);
		this.applyDomClass();
	}

	toggleMode() {
		this.setMode(this.mode === 'dark' ? 'light' : 'dark');
	}

	setPreset(preset: ColorPresetKey) {
		this.preset = preset;
		localStorage.setItem(PRESET_KEY, preset);
	}

	private applyDomClass() {
		document.documentElement.classList.toggle('dark', this.mode === 'dark');
		document.documentElement.dataset.theme = this.mode;
	}
}
