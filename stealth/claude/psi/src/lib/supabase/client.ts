import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { publicConfig } from '$lib/config';

export const supabase = createBrowserClient(
	publicConfig.PUBLIC_SUPABASE_URL,
	publicConfig.PUBLIC_SUPABASE_ANON_KEY,
	{
		cookies: {
			getAll: () =>
				isBrowser()
					? document.cookie.split('; ').map((c) => {
							const [name, ...rest] = c.split('=');
							return { name, value: rest.join('=') };
						})
					: []
		}
	}
);
