import { createBrowserClient, isBrowser, type CookieOptions } from '@supabase/ssr';
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
					: [],
			setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
				if (isBrowser()) {
					cookies.forEach(({ name, value, options }) => {
						let cookieString = `${name}=${value}`;
						if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
						if (options?.path) cookieString += `; path=${options.path}`;
						if (options?.domain) cookieString += `; domain=${options.domain}`;
						if (options?.secure) cookieString += '; secure';
						if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
						document.cookie = cookieString;
					});
				}
			},
			remove: (names: string | string[]) => {
				if (isBrowser()) {
					const cookieNames = Array.isArray(names) ? names : [names];
					cookieNames.forEach((name) => {
						document.cookie = `${name}=; max-age=0; path=/`;
					});
				}
			}
		}
	}
);
