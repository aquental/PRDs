import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		globals: true
	},
	/**
	 * Pre-bundle the largest node_modules packages so esbuild finishes before
	 * the server reports "ready". Without this, dep-optimization runs lazily on
	 * the first browser visit, blocking /@vite/client and the HMR WebSocket
	 * and producing "Failed to fetch" in the browser console (~22 s cold start).
	 */
	optimizeDeps: {
		include: ['@supabase/supabase-js', '@supabase/ssr']
	},
	server: {
		port: Number(process.env.PORT ?? 5173),
		strictPort: false,
		/**
		 * Pre-transform the source files that are slowest to compile (Svelte
		 * components, heavy imports) so the first route render is instant once
		 * dep-optimization has finished.
		 */
		warmup: {
			clientFiles: [
				'./src/routes/+layout.svelte',
				'./src/routes/login/+page.svelte',
				'./src/routes/app/+layout.svelte'
			],
			ssrFiles: [
				'./src/lib/supabase/client.ts',
				'./src/lib/supabase/server.ts',
				'./src/hooks.server.ts'
			]
		}
	}
});
