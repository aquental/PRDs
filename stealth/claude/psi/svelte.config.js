import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// 12-factor V (Build/Release/Run) — Vercel separates build and runtime.
		adapter: adapter({ runtime: 'nodejs20.x' }),
		alias: {
			$lib: 'src/lib',
			$components: 'src/lib/ui',
			$core: 'src/lib/core'
		},
		csrf: { trustedOrigins: [] }
	},
	compilerOptions: {
		runes: true // Svelte 5 runes mode
	}
};

export default config;
