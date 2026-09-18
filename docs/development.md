# Development Guide

Read [`../SPEC.md`](../SPEC.md) before changing runtime, security, window,
preference, IPC, packaging, or test behavior. Focused documents explain the
current implementation; the specification is normative.

## Toolchain and commands

The repository pins Electron, TypeScript, Vite, electron-vite, React, Vitest,
Playwright, ESLint, Prettier, electron-builder, and pnpm in `package.json` and
`pnpm-lock.yaml`. Do not add dependencies or upgrade versions without a
compatibility check and full evidence.

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

Before handoff, run typecheck, lint, unit tests, and build. Cross-process or UI
changes also require E2E coverage. Packaging remains unsigned until product
identifiers and signing/notarization inputs are supplied.

## Source ownership

```text
src/main/
├── commands/             command definitions, binding validation, registry
├── ipc/                  sender and payload validation
├── navigation/          exact-origin and popup policy
├── preferences/          versioned atomic preference store
├── security/             environment config, CSP, session, validators
├── shortcuts/            main-process before-input dispatch
└── window/               main/settings/content/context-menu controllers
src/preload/              capability-specific workspace and settings bridges
src/renderer/src/         minimal workspace renderer
src/renderer/settings/    independent settings renderer
src/shared/               serializable contracts and pure helpers
tests/unit/               pure policy and boundary tests
tests/e2e/                Playwright Electron acceptance tests
```

The main process is the only authority for native effects. Renderers never
import main implementation modules. Remote content has no preload. Before
adding responsibility to a file over 1,000 lines, evaluate a focused module
split as required by [`../AGENTS.md`](../AGENTS.md).

## TypeScript and boundary rules

Use strict ESM-first TypeScript, `unknown` for untrusted values, discriminated
unions, immutable serializable contracts, and runtime validation at every IPC,
configuration, URL, preference, and shortcut boundary. Avoid `any`; if an
external Electron type forces it, keep the cast narrow and explain the
boundary in code.

The workspace preload exposes only named window/content/layout/command/overlay
and diagnostic methods. The settings preload exposes only snapshot/save,
capture-mode, close, and main-request events. Neither bridge exposes generic
IPC, Node, filesystem, process, shell, or executable code. Keep the two
preload bundles self-contained; Electron's sandboxed loader must not depend on
an unresolved shared preload chunk.

## Runtime configuration

Environment variables are parsed once by `resolveAppConfigFromEnvironment`.
Feature modules must not read `process.env` directly. `APP_CONTENT_URL` is an
optional first-run default; an explicit empty value means no initial workspace.
The user preference wins after validation. `APP_ALLOWED_ORIGINS` is retained
only as a legacy input name and must not broaden the active exact origin;
current configuration derives the sole workspace origin from the URL.

| Input                  | Development                 | Test                               | Production                                      |
| ---------------------- | --------------------------- | ---------------------------------- | ----------------------------------------------- |
| Workspace URL          | HTTP(S), explicit or absent | loopback fixture or explicit empty | HTTPS when saved; may start empty for first run |
| Authentication origins | explicit reviewed values    | fixture values                     | explicit HTTPS values                           |
| DevTools               | opt-in                      | opt-in for diagnostics             | disabled                                        |
| Arbitrary navigation   | explicit opt-in             | controlled fixture only            | disabled                                        |
| Session persistence    | explicit                    | isolated by test                   | product decision                                |

Do not place credentials or secrets in `.env.example`, preferences, logs, or
fixtures.

## Change workflow

1. Identify the affected trust boundary and read the relevant document.
2. Update or add a pure test before broad wiring when practical.
3. Route new commands through `CommandId`, the command registry, and the
   settings snapshot; do not duplicate labels or bindings in a renderer.
4. Route preference changes through versioned validation and atomic patching.
5. Keep production default-deny navigation, permissions, downloads, popups,
   DevTools, and context-menu behavior intact.
6. Run focused checks, then the full applicable quality gates.
7. Update docs and traceability for behavior or contract changes.

All repository-facing text and Conventional Commit messages are English, for
example:

```text
feat(commands): add customizable command registry
fix(security): reject credentials in workspace URLs
test(settings): cover conflicting shortcut capture
docs(architecture): document content generations
```

## Performance discipline

Use events rather than polling, frame-coalesce and deduplicate bounds updates,
avoid broad React rerender loops, and never proxy remote animation through
screenshots. Measure idle and resize behavior before changing Chromium/GPU
flags or throttling.

## Documentation maintenance

`SPEC.md` records constraints. Architecture, security, UX, testing, release,
and traceability documents explain and verify them. Any behavior-changing
decision updates the relevant docs and matrix in the same commit. Temporary
notes never override the specification.
