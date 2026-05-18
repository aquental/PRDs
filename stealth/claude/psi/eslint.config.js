import js from "@eslint/js";
import globals from "globals";

/**
 * ESLint v9 flat config.
 *
 * Scope: plain JS / MJS config and script files only.
 * TypeScript and Svelte files are handled by svelte-check (npm run check)
 * which already has full type awareness.
 *
 * To add TypeScript linting later:
 *   npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
 */

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Global ignores ────────────────────────────────────────────────────────
  {
    ignores: [
      ".svelte-kit/**",
      ".vercel/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      // TS and Svelte files need additional parsers/plugins
      "**/*.ts",
      "**/*.svelte",
    ],
  },
  // ── JS files (config scripts, etc.) ──────────────────────────────────────
  {
    ...js.configs.recommended,
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
  },
  // ── Node.js scripts ───────────────────────────────────────────────────────
  {
    files: ["scripts/**/*.js"],
    languageOptions: { globals: globals.node },
  },
];
