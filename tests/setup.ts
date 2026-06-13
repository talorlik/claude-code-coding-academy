/**
 * Shared Vitest setup, loaded once per test file via `setupFiles` in
 * vitest.config.ts. Registers the jest-dom matchers (toBeInTheDocument,
 * toHaveAccessibleName, ...) on Vitest's `expect` so component tests can
 * assert on DOM state without per-file imports.
 */
import "@testing-library/jest-dom/vitest"
