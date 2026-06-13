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
      // `server-only` is a Next.js built-in that is not available in the
      // Vitest jsdom environment. The package only enforces an import-time
      // error in non-server runtimes; mocking it as an empty module lets
      // tests import server modules freely (they still mock the actual I/O).
      "server-only": import.meta.dirname + "/tests/__mocks__/server-only.ts",
    },
  },
})
