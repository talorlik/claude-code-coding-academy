import react from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from "vitest/config"

/**
 * Vitest config for unit and integration tests under tests/**.
 *
 * Playwright owns the root e2e/ directory via playwright.config.ts; the
 * exclude list keeps those specs out of the Vitest run (configDefaults
 * already covers node_modules). The `@` alias mirrors the tsconfig
 * `@/*` -> project-root path mapping so test files resolve imports the same
 * way application code does.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
})
