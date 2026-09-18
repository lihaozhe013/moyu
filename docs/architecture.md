# Architecture

The application is a small local shell around one intentionally unrestricted
Electron web runtime. The architecture keeps shell ownership clear without
pretending that the remote page is a security boundary.

## Runtime surfaces

There are four cooperating surfaces:

1. The Electron main process owns lifecycle, native windows, the content
   session, commands, persistence, and layout updates.
2. The local workspace renderer owns the shell, empty state, loading/error
   overlays, command palette, and visual layout.
3. The local Settings renderer owns URL and shortcut editing.
4. The remote `WebContentsView` renders the configured self-authored page.

The local renderers use their existing preload APIs. The remote view has no
remote preload and intentionally runs with Node/Electron renderer access.

## Window composition

The main `BrowserWindow` is frameless and has no persistent local drag strip.
Its client area starts at the top edge. The local renderer reports the
`.content-host` rectangle through the existing IPC channel. The main process
adds one `WebContentsView` as a child of the window and applies the same
rectangle to the native view.

Settings is a separate modeless local window with the same edge-to-edge client
layout and stays open after a successful workspace save. Its form behavior is
not affected by workspace dragging.

## Startup and preferences

`resolveAppConfigFromEnvironment` reads the runtime mode, optional
`APP_CONTENT_URL`, development-tools preference, session persistence, and
session name. `createAppConfig` only uses `new URL()` to confirm that an
initial URL is parseable.

The preference store keeps the existing versioned workspace URL format.
`withWorkspaceUrl` rebuilds the app configuration while preserving the current
mode, DevTools preference, session persistence, and session name.

## Content session

`createContentSession` creates the configured Electron partition and installs a
certificate verification callback that accepts certificates. The session
permission handlers return `true` for checks and requests. No download handler
is installed, so Electron's default download path remains active.

The content session is shared with popup windows. `content-view.ts` uses the
same WebPreferences for the workspace and the `overrideBrowserWindowOptions`
returned by `setWindowOpenHandler`.

## Content lifecycle

`content-view.ts` creates one `WebContentsView` generation at a time. URL
replacement disposes the previous generation, creates a fresh view, and loads
the new target. Navigation listeners only track the active URL for loading
status; they do not reject navigation or redirects.

Electron load failures, renderer crashes, and unresponsive notifications still
drive the existing shell status and recovery UI. These are lifecycle states,
not content security decisions.

## Bounds and first-run behavior

The renderer can send bounds before a remote view exists. `index.ts` stores the
latest `ContentBounds` independently of `contentView`. `createWorkspaceContent`
applies the cached bounds immediately after creating the first view, before its
initial load. Later bounds messages apply directly to the current view.

This preserves the invariant:

```text
shell .content-host rectangle == native WebContentsView rectangle
```

It covers first-run URL entry, resize, reload, and subsequent URL replacement.

## Commands and IPC

The main process owns the command registry and typed IPC handlers. The local
shell receives only the existing `DesktopAPI` capabilities for commands,
status, layout, diagnostics, and window presentation. Settings receives the
existing preference operations. The remote page does not need `DesktopAPI` or
the local preload to use its Node/Electron runtime.

## Window drag controller

`shortcuts.ts` listens for both `keyDown` and `keyUp` events in the main
process. The shell and remote `WebContentsView` handlers share one held-binding
state so a focus change between the two surfaces cannot leave duplicate or
stale activations. The command registry marks `window.drag` as `hold` and
`workspace` scoped; Settings therefore cannot activate it.

`window-drag.ts` owns the native window-drag state. It publishes an internal
IPC event to the local shell and asks `content-view.ts` to inject a temporary
`-webkit-app-region: drag` style into the remote document and every loaded
subframe. The content controller serializes these injections, ignores stale
content generations, reapplies the style after frame loads, and removes it on
release or teardown. The implementation deliberately does not use
`setIgnoreMouseEvents`, preserving page input whenever drag mode is inactive.

`create-main-window.ts` and `create-settings-window.ts` keep frameless,
hidden-titlebar presentation with no application-drawn top strip. Startup
clears the registered Electron application menu; context menus and the typed
command/shortcut paths remain available. The macOS system menu bar and Apple
menu are controlled by the operating system.

## Source layout

```text
src/
├── main/
│   ├── app/             environment and logging
│   ├── commands/        command registry
│   ├── gpu/             diagnostics
│   ├── ipc/             typed channels and handlers
│   ├── preferences/     persisted settings
│   ├── security/        configuration, session, and boundary validation
│   ├── shortcuts/       keyboard handling and held modes
│   └── window/          native windows, content view, layout, drag, and recovery
├── preload/              local shell and Settings bridges
├── renderer/             local shell and Settings UI
└── shared/               types, commands, and zoom rules
```

There is no origin-policy or popup-policy module. Removing a policy module is
preferred to leaving an unused restriction path available for future code to
accidentally call.
