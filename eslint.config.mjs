import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Full jsx-a11y recommended ruleset. The plugin ships with
  // eslint-config-next, so this adds no new dependency; it promotes the
  // accessibility checks from Next's curated subset to the plugin's complete
  // recommended set. Scoped to the JSX/TSX surface.
  //
  // eslint-config-next already registers the "jsx-a11y" plugin, so we must NOT
  // re-declare `plugins` here (ESLint forbids redefining a plugin). We pull in
  // only the recommended ruleset and apply its rules on top of Next's subset.
  // `components/ui/**` is vendored shadcn/Base UI source. The recommended
  // ruleset flags valid library patterns there (anchor-has-content,
  // label-has-associated-control, etc.) that we do not hand-edit, so the
  // a11y rules are scoped to skip that tree. Our own surface is enforced.
  {
    files: ["**/*.{jsx,tsx}"],
    ignores: ["components/ui/**"],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Per-branch worktrees live under .claude/worktrees/ and each contains a
    // full copy of the project (plus a symlinked node_modules). Without this,
    // a live worktree makes `npm run lint` on main scan thousands of duplicate
    // files. Ignore the whole tree so the gate only ever lints the real source.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
