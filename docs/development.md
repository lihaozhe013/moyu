# Development Guide

This is the contributor contract for the implementation. The repository now includes the strict TypeScript configuration, hardened Electron/Vite runtime, isolated React shell/content architecture, deterministic fixtures, GPU diagnostics, linting, formatting, tests, and reproducible packaging workflows. Product-specific signing and deployment inputs remain release work.

## Before bootstrap

Do not choose dependency versions from examples in blog posts or old Electron templates. At the start of implementation, record the current stable toolchain candidates with:

```bash
pnpm view electron version
pnpm view typescript version
pnpm view vite@8 version
pnpm view electron-vite@beta version
```

Then verify mutual compatibility among Electron, Node, TypeScript 7.x, Vite 8.x, electron-vite 6.x prerelease, React, Vitest, Playwright, ESLint, Prettier, and electron-builder. The newest individual release is not useful if the complete toolchain is incompatible.

After a successful clean build and smoke test:

1. Pin exact dependency versions in `package.json`.
2. Commit `pnpm-lock.yaml`.
3. Use frozen-lockfile installation in CI.
4. Record any non-obvious compatibility constraint in this document.
5. Do not upgrade merely to make the version numbers newer.

## Required local tooling

The eventual development environment requires:

- pnpm;
- the Node.js version supported by the selected Electron/electron-vite toolchain;
- platform build prerequisites for electron-builder;
- Git; and
- access to both target operating systems for release-grade verification.

The project targets Windows 11 x64 and macOS arm64/x64. Development on one platform does not replace packaging and behavior checks on the other.

## Intended repository layout

```text
build/                    application icons and packaging assets
resources/                packaged runtime resources
src/
├── main/
│   ├── app/              lifecycle and single-instance composition
│   ├── window/           BrowserWindow, WebContentsView, layout, state
│   ├── navigation/       allowed origins, navigation, and popup policy
│   ├── security/         permissions, session, CSP, IPC validation
│   ├── shortcuts/        application-scoped shortcuts
│   └── ipc/              channel definitions and handlers
├── preload/              narrow shell API
├── renderer/             local React shell
└── shared/               serializable types and pure utilities
tests/
├── unit/
├── e2e/
└── fixtures/             deterministic local content server/page
docs/                     project documentation
```

Directories should be introduced as they gain a concrete responsibility. Empty placeholder modules are unnecessary.

## TypeScript policy

The project uses ESM-first TypeScript with maximum practical strictness. The baseline compiler behavior is:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

Module resolution may differ between main/preload and renderer configurations according to the selected electron-vite and TypeScript versions.

Source rules:

- Do not use `any` without a code comment explaining the unavoidable boundary.
- Use `unknown` at untrusted boundaries and narrow it explicitly.
- Give every IPC payload an explicit compile-time type and runtime validator.
- Prefer discriminated unions and `as const` objects over TypeScript enums.
- Prefer immutable inputs and outputs where practical.
- Use CommonJS only for a dependency boundary that cannot support ESM.
- Keep serialization contracts free of functions, Electron objects, and class instances.
- Avoid comments that restate the code; document non-obvious constraints and decisions.

All repository-facing documentation, code comments, changelogs, and commit messages are written in English.

## Module ownership

Dependencies should generally point inward toward shared types and pure policy:

```text
main composition ──► main subsystems ──► shared contracts
preload bridge ────────────────────────► shared contracts
renderer shell ────────────────────────► shared contracts
```

The renderer must not import main-process modules. The main process must not depend on React components. Shared modules must not import Electron unless a type-only boundary is demonstrably safe and useful.

The main entry point wires lifecycle and subsystem factories. It must not become a monolithic implementation. Before adding responsibilities to any source file over 1,000 lines, split the work into focused modules as required by [`../AGENTS.md`](../AGENTS.md); substantially smaller boundaries are preferred for security-critical policy.

## Configuration workflow

Runtime configuration is resolved once and validated before creating remote content. Conceptual inputs include:

| Input                  | Development                                             | Test                                   | Production                      |
| ---------------------- | ------------------------------------------------------- | -------------------------------------- | ------------------------------- |
| Initial content URL    | Explicit configured URL; localhost allowed deliberately | Local fixture URL                      | Required approved HTTPS URL     |
| Allowed origins        | Explicit list                                           | Fixture origins                        | Required approved HTTPS origins |
| Authentication origins | Explicit list if needed                                 | Fixture cases                          | Reviewed provider origins only  |
| DevTools               | Allowed                                                 | Normally off unless a test requires it | Off by default                  |
| Arbitrary navigation   | Optional explicit opt-in                                | Controlled by test case                | Off                             |
| Logging                | Verbose, sanitized                                      | Deterministic                          | Minimal, sanitized              |
| Session persistence    | According to integration need                           | Isolated/deterministic                 | Explicit product decision       |

The bootstrap defines the environment variables shown in [`.env.example`](../.env.example). It contains no secrets. Boolean values are parsed explicitly; non-empty strings must not automatically mean `true`.

No feature module reads `process.env` directly. Tests may construct validated configuration objects without mutating ambient global state.

## Dependency policy

Every dependency requires a clear purpose. Prefer platform and language capabilities over packages for small utilities.

Avoid by default:

- component frameworks for the small shell surface;
- client routers when there is no local multi-page application;
- global state libraries before React built-ins prove insufficient;
- generic utility bundles;
- legacy Electron helper libraries that duplicate current APIs; and
- runtime schema libraries solely for a handful of simple payloads unless the consistency benefit is demonstrated.

Development dependencies remain subject to the same maintenance and supply-chain review as runtime dependencies.

## Intended scripts

The implementation should expose stable command names even if underlying tool syntax changes:

| Command            | Contract                                                    |
| ------------------ | ----------------------------------------------------------- |
| `pnpm dev`         | Start the electron-vite development workflow                |
| `pnpm build`       | Produce compiled application output without packaging       |
| `pnpm preview`     | Preview built output using the supported electron-vite flow |
| `pnpm typecheck`   | Typecheck main/preload and renderer projects                |
| `pnpm lint`        | Run ESLint without modifying files                          |
| `pnpm lint:fix`    | Apply safe lint fixes                                       |
| `pnpm test`        | Run deterministic unit tests once                           |
| `pnpm test:watch`  | Run unit tests in watch mode                                |
| `pnpm test:e2e`    | Run Playwright Electron tests and the local fixture         |
| `pnpm package`     | Package for the current platform                            |
| `pnpm package:win` | Produce configured Windows artifacts                        |
| `pnpm package:mac` | Produce configured macOS artifacts                          |

These scripts are available from the Phase 0 bootstrap. Commands that depend on later runtime features may remain minimal until their implementation phase is complete. They must use commands documented by the installed versions; obsolete template commands must not be copied without verification.

## Contributor workflow

Once implementation exists, a normal change should follow this sequence:

1. Read `SPEC.md` and the relevant focused document.
2. Confirm the change belongs to the shell, main process, preload, remote-policy layer, or tests.
3. Add or update tests at the policy boundary before broad integration changes when practical.
4. Implement the smallest cohesive change without weakening defaults.
5. Run focused tests during iteration.
6. Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before handoff.
7. Run the applicable E2E and build checks for cross-process or UI changes.
8. Update documentation when behavior, configuration, commands, or release requirements change.

Use Conventional Commits in English, for example:

```text
feat(window): add explicit fullscreen state transitions
fix(security): reject malformed navigation targets
test(layout): cover fractional content bounds
docs(architecture): clarify session ownership
```

## Development and production separation

Development convenience must not silently alter production behavior.

- Vite development URLs are selected only in development mode.
- Packaged production loads local compiled shell assets and has no localhost dependency.
- DevTools and inspection commands are guarded by validated configuration.
- Development navigation exceptions never expand the production allowlist.
- Production menu and context-menu behavior is tested from packaged or production-mode output.
- CSP differences are explicit and reviewable.

## Performance discipline

The shell should be idle when nothing changes:

- subscribe to Electron and DOM events instead of polling;
- coalesce layout changes to one update per animation frame;
- compare bounds before sending IPC;
- avoid storing high-frequency geometry in broad React context;
- do not intercept the remote content animation loop; and
- measure before changing GPU flags or background throttling.

Performance claims must be backed by a reproducible scenario and observable data, not subjective impressions alone.

## Documentation maintenance

- `SPEC.md` records normative requirements.
- Focused documents explain how requirements fit together and how they are verified.
- Behavior-changing decisions update `SPEC.md`, the relevant focused document, and `traceability.md` in the same change.
- Temporary implementation notes do not override committed requirements.
- New security exceptions include rationale, scope, tests, and a review owner in the change record.
