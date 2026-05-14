import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		globals: true
	},
	server: {
		port: Number(process.env.PORT ?? 5173),
		strictPort: false,
		/**
		 * Pre-transform the heaviest routes when the dev server starts so the
		 * first browser request is fast. Without this, Vite lazily bundles all
		 * deps on the first visit (~22 s), blocking /@vite/client and the HMR
		 * WebSocket and producing "Failed to fetch" in the browser console.
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
