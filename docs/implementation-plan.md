# Implementation Plan and Phase Record

This is the historical execution record for the keyboard-first workspace
constraints in [`../SPEC.md`](../SPEC.md). The specification is normative;
this document records sequencing, commits, gates, and remaining deployment
inputs.

## Delivery principles

- Establish pure contracts and fail-closed policy before Electron wiring.
- Keep main, workspace renderer, settings renderer, and remote content as
  separate trust domains.
- Route all shell commands through one registry and all preferences through one
  versioned atomic store.
- Verify each phase with `pnpm typecheck`, `pnpm lint`, `pnpm test`, and
  `pnpm build`; cross-process phases also run `pnpm test:e2e`.
- Use English Conventional Commits and update focused documentation when a
  behavior or contract changes.

## Completed phases

### 1. Constraint baseline

`docs(spec): define keyboard-first workspace constraints`

Rewrote `SPEC.md` as an agent-facing constraint reference: four trust
domains, frameless no-button shell, keyboard-complete command model, separate
Settings window, dynamic URL/origin policy, versioned preferences, and
fail-closed security/verification requirements.

### 2. Contracts, preferences, and migration

`refactor(core): add command and preference contracts`

Added serializable command/shortcut/preferences types, URL and shortcut
validation, partial-field recovery, version 1 preference storage, atomic
temporary-file rename, concurrent patch merging, and migration from the
legacy window-state file without deleting it.

### 3. Command registry

`feat(commands): add customizable command registry`

Added platform defaults (including macOS Cmd+M/Cmd+Shift+M and Windows
Alt+M/Alt+Shift+M), physical-key matching, conflict rejection, dynamic menu
accelerators, surface-aware dispatch, and settings-capture pause behavior.

### 4. Settings and dynamic workspace URL

`feat(settings): add workspace and shortcut preferences`

Added the independent 760×640 frameless Settings window, minimal preload and
IPC boundary, searchable URL/shortcut form, physical-key capture, reset and
dirty-state flows, no-URL first-run behavior, immediate URL replacement, and
generation-safe content recreation.

### 5. Minimal keyboard-first shell

`feat(shell): adopt minimal keyboard-first workspace`

Removed persistent titlebar, menu bar, tool rail, inspector, status bar, and
custom window buttons. Added the 12 px drag strip, dynamic command palette,
overlay-aware native view visibility, unified right-click Settings menu,
macOS registry-backed application menu, and shell command IPC.

## Verification status

The current local gate passes:

```text
18 unit-test files / 51 tests
20 Electron E2E scenarios
pnpm typecheck
pnpm lint
pnpm build
```

E2E covers frameless shell composition, content bounds, command palette,
settings single-instance and URL switching, no-URL first run, shortcut capture,
navigation/popup/permission/download denial, zoom, fullscreen, GPU diagnostics,
load failure, and renderer crash recovery.

## Remaining release work

The implementation is complete for the requested keyboard-first design. The
remaining work is deployment-specific:

- approve final product name, identifiers, icon, and branding assets;
- provide production workspace and reviewed authentication/support origins;
- validate packaged Windows 11 x64 and macOS arm64/x64 behavior on clean
  machines and mixed-DPI displays;
- configure signing/notarization credentials and verify release artifacts; and
- collect manual native context-menu, frameless-resize, traffic-light, and
  platform-menu evidence.

No release input may weaken the origin, preload, permission, download, popup,
or keyboard constraints.
