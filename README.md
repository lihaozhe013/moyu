# Professional Canvas Desktop App

Professional Canvas is a cross-platform Electron shell for one configured web
workspace. It is a keyboard-first, canvas-first desktop application rather
than a general-purpose browser.

The normative constraints live in [`SPEC.md`](./SPEC.md). Architecture,
security, UX, testing, development, release, and traceability notes are in
[`docs/`](./docs/).

## Current implementation

The repository includes:

- a frameless main window with no native or custom close/minimize/maximize
  controls, persistent title bar, toolbar, inspector, or status bar;
- a 12 px drag strip, one isolated `WebContentsView`, and local transient
  overlays;
- a separate single-instance frameless Settings window for workspace URL and
  shortcut preferences;
- a main-process command registry with platform defaults, physical-key capture,
  conflict validation, dynamic macOS menu accelerators, and right-click
  Settings entry;
- versioned atomic preferences with legacy `window-state.json` migration;
- exact-origin navigation, popup/permission/download denial, secure preload
  boundaries, generation-safe URL replacement, zoom, fullscreen, and crash
  recovery; and
- deterministic loopback fixtures, required public HTTPS smoke coverage, 51
  unit tests, and 20 Electron E2E tests.

Product branding, signed artifacts, notarization, and clean Windows/macOS
release evidence remain deployment inputs.

## Product boundary

The application displays one user-configured remote workspace and does not
provide tabs, an address bar, browser history, bookmarks, extensions,
unrestricted navigation, or uncontrolled popups. The only URL editor is in the
local Settings window. In production, saved workspace URLs must use HTTPS and
contain a valid host without credentials. A reachable public HTTPS workspace
must load normally; this network capability does not expand the product into a
general-purpose browser.

## Architecture at a glance

```text
Electron main process
├── local workspace renderer (minimal shell)
├── local settings renderer (URL + shortcut editor)
└── one isolated remote WebContentsView (no preload)
```

The main process owns native resources, security policy, command dispatch,
preference persistence, and IPC validation. The two local renderers receive
only capability-specific preload APIs. Remote content receives no application
API.

## Documentation

| Document                                                       | Purpose                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| [`SPEC.md`](./SPEC.md)                                         | Normative constraints for agents and releases            |
| [`docs/product-experience.md`](./docs/product-experience.md)   | Visible shell, settings, keyboard, and recovery behavior |
| [`docs/architecture.md`](./docs/architecture.md)               | Trust domains, flows, and module ownership               |
| [`docs/security.md`](./docs/security.md)                       | Threat model and fail-closed controls                    |
| [`docs/development.md`](./docs/development.md)                 | Toolchain, commands, boundaries, and workflow            |
| [`docs/testing.md`](./docs/testing.md)                         | Unit, E2E, fixture, GPU, and platform checks             |
| [`docs/release.md`](./docs/release.md)                         | Packaging, signing, and release evidence                 |
| [`docs/implementation-plan.md`](./docs/implementation-plan.md) | Historical phase record and remaining release inputs     |
| [`docs/traceability.md`](./docs/traceability.md)               | Requirement-to-document-to-test matrix                   |

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm build:mac:arm64
pnpm build:win:x64
pnpm package
```

`pnpm package:win` and `pnpm package:mac` remain compatibility aliases for the
platform-specific build scripts. The macOS script produces a DMG and the
Windows script produces an x64 NSIS EXE installer. Unsigned artifacts are
development outputs until product signing and notarization credentials are
available. Pushing to `publish` runs the nightly platform workflow.

## Environment

Copy [`.env.example`](./.env.example) for a local configuration. Runtime
configuration is validated once at startup. `APP_CONTENT_URL` is optional; an
explicit empty value starts the local first-run state. User preferences take
precedence on later launches. `APP_ALLOWED_ORIGINS` is retained for legacy
compatibility and does not expand the active workspace origin.

## Definition of done

A release candidate must pass the gates in [`SPEC.md`](./SPEC.md) and
[`docs/testing.md`](./docs/testing.md), preserve all four trust domains, show
no browser or window-button leakage, and include platform/signing evidence or
be clearly labeled as release-input pending.
