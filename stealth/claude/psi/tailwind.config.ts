import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class', // PRD: dark mode nativo via <html class="dark">
	theme: {
		extend: {
			colors: {
				// Paleta earthy do IDEA.md
				bg: {
					DEFAULT: '#FDFBF7',
					dark: '#1A1815'
				},
				primary: {
					DEFAULT: '#5B7B7A', // verde sálvia
					50: '#F2F5F5',
					100: '#E0E7E7',
					200: '#C2CFCE',
					400: '#7A9998',
					600: '#4A6968',
					700: '#3A5453',
					900: '#1F2E2D'
				},
				secondary: {
					DEFAULT: '#D4A373', // terracota
					50: '#FAF3EB',
					100: '#F4E7D4',
					400: '#DDB38A',
					600: '#B88659',
					900: '#6B4A2D'
				},
				ink: {
					DEFAULT: '#2A2825',
					muted: '#6E675E'
				}
			},
			fontFamily: {
				sans: ['Figtree', 'system-ui', 'sans-serif'],
				heading: ['Manrope', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				xl: '0.875rem'
			}
		}
	},
	plugins: []
} satisfies Config;
