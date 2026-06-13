/**
 * Vitest stub for the `server-only` package.
 *
 * Next.js ships `server-only` as a built-in that throws when imported in a
 * non-server runtime. Vitest runs in jsdom (not a Node.js server context from
 * Next.js's perspective), so importing any module that contains
 * `import "server-only"` fails. This empty stub satisfies the import without
 * the runtime guard, letting tests mock the actual I/O (Supabase, auth) as
 * they do for other server modules.
 *
 * Resolution configured in vitest.config.ts:
 *   alias: { "server-only": "<root>/tests/__mocks__/server-only.ts" }
 */
// Empty - the import is a side-effect-only guard with no exports.
export {}
