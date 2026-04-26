# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — start the Vite dev server with HMR
- `pnpm build` — typecheck (`tsc -b`) then produce a production bundle in `dist/`. The typecheck step runs first and will fail the build on type errors.
- `pnpm preview` — serve the built `dist/` locally to verify a production build

There is no separate lint or test command configured. Type errors from `tsc -b` are the only static check; running `pnpm build` (or `pnpm exec tsc -b`) is how you verify code.

## Architecture

Vite + Preact 10 + TypeScript 6, scaffolded from the official `@preact/preset-vite` template.

- Entry: `index.html` loads `src/main.tsx`, which calls `render(<App />, …)` (Preact's `render`, not React's `createRoot`) into `#app`.
- Root component: `src/app.tsx`. There is currently no router or state-management library — just `useState` from `preact/hooks`.
- Styles are plain CSS imported from components (`src/index.css`, `src/app.css`). The CSS uses native nesting and CSS custom properties; no preprocessor.
- Static assets in `public/` are served at the site root (e.g. `/icons.svg`); assets imported from `src/assets/` are processed by Vite and hashed.

### Preact-specific gotchas

- **JSX attributes use DOM names**: `class` (not `className`), `for` (not `htmlFor`), `onInput` not `onChange` for controlled inputs. The existing `src/app.tsx` follows this — match it.
- **`react`/`react-dom` are aliased to `preact/compat`** via `tsconfig.app.json` `compilerOptions.paths`. This lets you install React-ecosystem libraries; they will resolve to Preact's compat layer at typecheck and at bundle time (Vite respects the same alias through `@preact/preset-vite`). If you add a library that depends on React, no extra config is needed — but be aware that subtle React-only behavior (Suspense edge cases, concurrent features) may not be supported.
- Hooks come from `preact/hooks`, signals (if added) from `@preact/signals`. Do **not** import from `react`.
- JSX is configured via `"jsx": "react-jsx"` + `"jsxImportSource": "preact"` — no per-file JSX pragma is needed.

### TypeScript configuration

Uses project references: `tsconfig.json` is a solution file delegating to `tsconfig.app.json` (for `src/`) and `tsconfig.node.json` (for `vite.config.ts`). Build with `tsc -b`, not plain `tsc`.

Strict-ish settings worth knowing before writing code:
- `verbatimModuleSyntax: true` — type-only imports **must** use `import type { … }`. A regular `import` of a type-only symbol will fail to compile.
- `erasableSyntaxOnly: true` — disallows TS syntax that emits runtime code: `enum`, `namespace` with values, parameter properties (`constructor(private x: T)`), etc. Use `as const` objects or unions instead of enums.
- `noUnusedLocals` / `noUnusedParameters` are on — prefix intentionally unused params with `_`.
- `noEmit: true` — TypeScript only typechecks; Vite/esbuild does the actual transpile.
