import { createContext, useContext } from 'react';
import { AuthStore } from './auth';
import { ThemeStore } from './theme';

class RootStore {
	authStore = new AuthStore();
	themeStore = new ThemeStore();
}

export const store = new RootStore();
export const StoreContext = createContext(store);
export const useStore = () => useContext(StoreContext);
