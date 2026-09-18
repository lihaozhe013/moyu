# Development Guide

Moyu is optimized for quick iteration and broad compatibility with pages made
by the project user. Keep the implementation small and direct. Do not add
security-browser abstractions to solve problems this project does not claim to
solve.

## Toolchain and commands

The pinned toolchain is Electron, TypeScript, React, Vite/electron-vite,
Vitest, Playwright, ESLint, Prettier, electron-builder, and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm dev` starts the local renderer development server and HMR. The remote
content view uses the same preferences and session behavior in this mode as it
does in a packaged build.

## Source ownership

- `src/main/index.ts` coordinates startup, windows, commands, and content
  creation.
- `src/main/window/content-view.ts` owns the workspace `WebContentsView`, URL
  replacement, loading state, popup configuration, and native bounds.
- `src/main/window/window-drag.ts` owns temporary whole-window drag state and
  synchronizes drag styling across local, remote, and Settings surfaces.
- `src/main/shortcuts/shortcuts.ts` owns main-process key-down matching and
  shortcut cleanup.
- `src/main/security/config.ts` owns runtime configuration parsing.
- `src/main/security/session.ts` owns the content session.
- `src/main/security/preferences-validation.ts` owns the minimum URL and
  Settings boundary validation.
- `src/renderer/` contains only local application UI.
- `tests/fixtures/` contains deterministic self-hosted pages for E2E checks.

Keep responsibilities focused. Before adding a new responsibility to a source
file over 1,000 lines, split it into a focused module.

## Runtime configuration

Supported application variables are:

| Variable                | Meaning                                              |
| ----------------------- | ---------------------------------------------------- |
| `NODE_ENV`              | `development`, `test`, or `production` mode          |
| `APP_CONTENT_URL`       | Optional initial URL; empty means first-run Settings |
| `APP_ENABLE_DEVTOOLS`   | Local development-tools preference                   |
| `APP_PERSIST_SESSION`   | Persist the named content session                    |
| `APP_SESSION_NAME`      | Content-session partition name                       |
| `ELECTRON_RENDERER_URL` | Development-only local shell server URL              |

`APP_ALLOWED_ORIGINS`, `APP_AUTHENTICATION_ORIGINS`, and
`APP_ALLOW_ARBITRARY_NAVIGATION` were removed. Do not reintroduce their
runtime dependencies. The application does not derive a content policy from
environment variables.

Workspace URL validation only needs the platform URL parser. It must not add
HTTPS, hostname, credential, origin, scheme, or port restrictions.

## Development and release parity

The content WebPreferences are deliberately identical in development, test,
and production. Mode-specific branches are acceptable for local shell tooling
such as HMR or DevTools, but not for navigation, permissions, popups,
certificates, downloads, or web compatibility.

When debugging a page, prefer a loopback or LAN fixture that reproduces the
actual page behavior. The project is intended for self-authored pages, so
testing should exercise HTTP, HTTPS, cross-origin requests, redirects,
credentials, mixed content, media, permissions, popups, and downloads where a
fixture needs them.

## Change workflow

1. Read `SPEC.md` and the relevant document in `docs/`.
2. Make the smallest direct code change that matches the runtime contract.
3. Update focused unit or E2E tests.
4. Update English documentation when behavior or configuration changes.
5. Run typecheck, lint, unit tests, build, and the relevant E2E tests.

When changing window-drag behavior or frameless-window behavior, include the
Settings toggle round-trip, snapshot and push-event state sync, content
reload/navigation, URL-change cleanup, and manual native-window movement and
resizing in the verification record.

Do not add allowlists, denial fallbacks, origin branches, HTTPS-only checks,
permission gates, popup gates, download interception, or other defensive
layers. If a page fails, first inspect the Electron load error and the page
itself.

## Performance discipline

Keep the existing frame-coalesced bounds updates, generation checks, and
explicit lifecycle cleanup. These are resource and UI correctness mechanisms,
not remote-page security controls. Avoid polling, screenshot proxies, or
extra renderer layers around the content view.

## Documentation maintenance

All repository-facing text is English. Update `README.md`, `SPEC.md`, and the
focused `docs/` page together when changing the content runtime. Keep the
documentation honest about the intentional lack of protection for untrusted
pages.
