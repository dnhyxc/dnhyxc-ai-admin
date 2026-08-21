import { createContext, useContext } from 'react';
import { AuthStore } from './auth';
import { NoticeStore } from './notice';
import { ThemeStore } from './theme';

export type { UserInfo } from './auth';

class RootStore {
	authStore = new AuthStore();
	themeStore = new ThemeStore();
	noticeStore = new NoticeStore();
}

export const store = new RootStore();
export const StoreContext = createContext(store);
export const useStore = () => useContext(StoreContext);
