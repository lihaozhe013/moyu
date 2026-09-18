# Architecture

[`../SPEC.md`](../SPEC.md) is normative. This document describes the current
runtime boundaries and the implementation seams agents should preserve.

## Trust domains

```text
Electron main process
├── local workspace BrowserWindow renderer
├── local settings BrowserWindow renderer
└── one isolated remote WebContentsView
```

The main process owns lifecycle, windows, content generations, command
registry, shortcut dispatch, menus, navigation, session policy, persistence,
IPC validation, diagnostics, and crash handling.

The workspace renderer owns the 12 px drag strip, content-host measurement,
local overlays, command palette, and visual state. The settings renderer is a
separate local entry point with its own minimal preload and owns only the URL
and shortcut editor. Neither local renderer receives Node.js or generic IPC.

The remote view is created with no preload and with Node integration disabled,
context isolation, sandbox, web security, and insecure-content blocking. It
cannot access local APIs, settings storage, command registration, or native
bounds.

## Window composition

```text
Main BrowserWindow (frame: false)
┌──────────────────────────────────────────────────────────┐
│ 12 px drag strip                                         │
├──────────────────────────────────────────────────────────┤
│ one native WebContentsView / transient local overlay     │
└──────────────────────────────────────────────────────────┘

Settings BrowserWindow (frame: false)
┌──────────────────────────────────────────────────────────┐
│ 12 px drag strip                                         │
├── URL editor                                              │
├── searchable shortcut editor                              │
└── keyboard-operable footer and decisions                  │
```

No persistent title bar, toolbar, tool rail, inspector, status bar, or custom
window controls are part of the current shell.

## Startup and preference flow

1. Acquire the single-instance lock.
2. Validate environment configuration once.
3. Load versioned `preferences.json`, migrating valid legacy window state from
   `window-state.json` without deleting the legacy file.
4. Resolve the effective URL as valid user preference, environment first-run
   default, or no URL.
5. Restore safe window placement and create the frameless main window.
6. Create the command registry from platform defaults and validated overrides.
7. Load the local shell and install validated IPC, menu, context-menu, and
   shortcut handlers.
8. Create one remote generation only when a URL exists; otherwise open the
   settings window and focus the URL field.

`PreferencesStore.update` merges patches in memory, serializes writes, writes a
temporary file, and atomically renames it. URL and shortcut writes therefore
cannot erase a concurrent window-state patch.

## Command and shortcut registry

`src/shared/commands.ts` defines stable `CommandId` values, platform defaults,
physical-key bindings, display formatting, and Electron accelerator conversion.
`src/main/commands/command-registry.ts` validates overrides, rejects conflicts,
resolves effective bindings, and matches input by physical code plus modifiers.

The registry drives main-process dispatch, shell and settings shortcut
listeners, the command palette summaries, the macOS application menu, and the
right-click menu. Renderers may request only a known command identifier.

Capture mode is tracked by the main process. While Settings records a binding,
its ordinary command dispatcher is paused. Escape, focus loss, cancellation,
and window destruction always leave capture mode.

## Content generation and navigation

`ContentViewController` owns a generation counter. Replacing the URL destroys
the old `WebContentsView`, creates a new one with the same session, bounds, and
zoom, and ignores stale events from the old generation. The current URL's exact
origin is the only application origin; fixed authentication origins remain
separate policy inputs.

Every main-frame navigation and redirect is evaluated by
`evaluateNavigation`. Popup, permission, download, and context-menu handling
are installed before the first load and default to denial. The shell receives
typed idle/loading/ready/error/crashed status events.

## Bounds and overlays

The workspace renderer observes `.content-host` with `ResizeObserver`,
coalesces changes to an animation frame, and sends validated DIP bounds over
IPC. The main process performs the final `WebContentsView.setBounds` call.

When a command palette, About, or GPU diagnostic overlay is visible, the main
process temporarily hides the native view. It is restored only when the
content status is ready. This prevents the native child view from covering
local UI.

## IPC boundaries

Shared channel names and types live in `src/shared/ipc.ts`; runtime sender and
payload validation lives in `src/main/ipc/handlers.ts` and
`src/main/ipc/settings-handlers.ts`. The workspace preload exposes window,
content, bounds, command-summary/known-command, overlay, and diagnostics
operations. The settings preload exposes snapshot, save, capture-mode, close,
and main-request event listeners. Neither exposes `ipcRenderer`, `require`,
filesystem, process, shell, or arbitrary execution.

The two preload bundles intentionally keep their channel constants local. This
avoids a shared preload chunk that Electron's sandboxed preload loader cannot
resolve in packaged output.

## Source layout

```text
src/
├── main/
│   ├── commands/             authoritative registry
│   ├── ipc/                  validated handlers
│   ├── navigation/           origin and popup policy
│   ├── preferences/          versioned atomic store
│   ├── security/             config, CSP, session, validation
│   ├── shortcuts/            main-process event dispatch
│   └── window/               main/settings/content/context windows
├── preload/                  capability-specific bridges
├── renderer/src/              workspace shell
├── renderer/settings/        settings shell
└── shared/                   serializable contracts and pure helpers
```

Files over 1,000 lines require a split evaluation before new responsibilities
are added. New commands, preference fields, IPC channels, origins, or
permissions must update the corresponding tests and traceability entry.
