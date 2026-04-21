/** Toggle de dark mode (persiste em localStorage e reflete a classe `dark` no <html>). */
export type Theme = 'light' | 'dark';

const KEY = 'psi-theme';

export function getTheme(): Theme {
	if (typeof window === 'undefined') return 'light';
	const stored = localStorage.getItem(KEY) as Theme | null;
	if (stored) return stored;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('dark', theme === 'dark');
	localStorage.setItem(KEY, theme);
}

export function toggleTheme(): Theme {
	const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	return next;
}
