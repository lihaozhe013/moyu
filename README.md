# Professional Canvas Desktop App

Professional Canvas Desktop App is a planned cross-platform Electron shell for a single, predefined web workspace. It is designed to feel like a focused creative desktop application, not a general-purpose browser.

> **Project status:** Phase 0 bootstrap complete. The strict TypeScript/toolchain scaffold builds successfully; the secure desktop runtime and feature phases are still in progress.

The normative implementation requirements live in [`SPEC.md`](./SPEC.md). The documents in [`docs/`](./docs/) explain those requirements as architecture, security, user-experience, delivery, and verification guidance. If a secondary document conflicts with `SPEC.md`, `SPEC.md` takes precedence until the conflict is deliberately resolved.

## Product scope

The application will provide:

- one native desktop window with locally bundled application chrome;
- one isolated `WebContentsView` containing a configured trusted web application;
- a dense, dark, professional workspace with title, tool, inspector, and status regions;
- normal, maximized, and native fullscreen presentation modes;
- restricted navigation, permissions, popups, downloads, and IPC;
- controlled reload, zoom, diagnostics, and recovery behavior; and
- a foundation suitable for future WebGL2, WebGPU, Three.js, and other GPU-heavy content.

The application will not provide tabs, an address bar, bookmarks, browser history UI, extensions, or unrestricted web browsing.

## Architecture at a glance

```text
Electron main process
├── Local shell renderer
│   └── React application chrome
└── Isolated WebContentsView
    └── Configured trusted web application
```

The main process owns native resources and policy. The shell renderer owns visible desktop chrome. The remote content surface receives no desktop privileges and cannot control its native bounds.

See [`docs/architecture.md`](./docs/architecture.md) for component boundaries and runtime flows.

## Documentation

| Document                                                       | Purpose                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`SPEC.md`](./SPEC.md)                                         | Normative implementation specification and source of truth                            |
| [`docs/product-experience.md`](./docs/product-experience.md)   | Visible behavior, interaction model, platform conventions, and UX acceptance criteria |
| [`docs/architecture.md`](./docs/architecture.md)               | Trust domains, module ownership, state, configuration, and runtime flows              |
| [`docs/security.md`](./docs/security.md)                       | Threat model, security invariants, and review checklist                               |
| [`docs/development.md`](./docs/development.md)                 | Pre-bootstrap decisions, intended toolchain, coding rules, and contributor workflow   |
| [`docs/testing.md`](./docs/testing.md)                         | Unit, integration, E2E, fixture, GPU, and platform validation strategy                |
| [`docs/release.md`](./docs/release.md)                         | CI, packaging, signing, artifact, and release requirements                            |
| [`docs/implementation-plan.md`](./docs/implementation-plan.md) | Sequenced implementation phases, gates, risks, and unresolved inputs                  |
| [`docs/traceability.md`](./docs/traceability.md)               | Mapping from every `SPEC.md` section to supporting documentation and verification     |

## Required inputs before the relevant phase

The specification intentionally does not define several deployment-specific values. They must be decided before their corresponding implementation phase:

| Input                               | Why it is required                                           | Latest decision point               |
| ----------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| Product name and branding assets    | Window title, package metadata, menus, installers, and icons | Before packaging configuration      |
| Initial content URL                 | Defines the only initial remote workspace                    | Before content-view integration     |
| Allowed application origins         | Enforces the navigation boundary                             | Before any remote content is loaded |
| Authentication origins and flows    | Determines deliberate exceptions to same-origin navigation   | Before authentication testing       |
| Session persistence requirement     | Determines whether a named persistent partition is needed    | Before session configuration        |
| Required web permissions            | Determines explicit, origin-scoped permission grants         | Before production security review   |
| Download requirements               | Determines whether the default deny policy can remain        | Before production acceptance        |
| Supported macOS deployment range    | Drives the Electron choice and release matrix                | Before dependency pinning           |
| Signing and notarization identities | Required for trusted distributable artifacts                 | Before a signed release             |

Unknown values must fail closed where security is affected. Placeholder production origins must not be silently accepted.

## Intended toolchain

The implementation uses Electron, TypeScript, Vite, electron-vite, React, Vitest, Playwright, ESLint, Prettier, electron-builder, and pnpm. The Phase 0 compatibility set is pinned exactly in `package.json` and `pnpm-lock.yaml`; future upgrades must follow the compatibility procedure in [`docs/development.md`](./docs/development.md).

## Intended commands

Once the bootstrap phase is complete, the repository is expected to expose:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm package
pnpm package:win
pnpm package:mac
```

The bootstrap commands are now available. Commands that require later runtime features may remain intentionally minimal until their implementation phase is complete.

## Definition of done

Version 1 is complete only when:

- the application passes the functional, security, accessibility, and no-browser-leakage criteria in `SPEC.md`;
- the local shell and remote content remain separate trust domains;
- navigation, popups, permissions, downloads, IPC, and configuration fail closed;
- startup, loading, failure, crash, resize, maximize, restore, fullscreen, and zoom flows are verified;
- required Windows 11 and macOS architecture/platform checks pass;
- typecheck, lint, unit tests, build, applicable E2E tests, and packaging succeed from a frozen lockfile; and
- release artifacts are produced with the required platform signing controls or are clearly labeled as non-release development artifacts.

The current repository contains the Phase 0 bootstrap scaffold only. Later implementation phases remain pending.
