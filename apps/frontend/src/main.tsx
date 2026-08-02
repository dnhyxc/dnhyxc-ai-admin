import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AntdProvider } from '@/components/AntdProvider';
import { router } from '@/router';
import { store, StoreContext } from '@/store';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<StoreContext.Provider value={store}>
			<AntdProvider>
				<RouterProvider router={router} />
			</AntdProvider>
		</StoreContext.Provider>
	</StrictMode>,
);
