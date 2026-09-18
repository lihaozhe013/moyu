# Product Experience

This document turns [`../SPEC.md`](../SPEC.md) into observable behavior. The
specification remains the source of truth.

## Product promise

Professional Canvas presents one trusted web workspace in a quiet, dark,
canvas-first desktop shell. It is a keyboard-complete application surface,
not a general-purpose browser.

## Primary workspace

The primary window is frameless on Windows and macOS. Native caption buttons
and custom close/minimize/maximize buttons are absent. The local shell contains
only:

- a 12 px non-interactive drag strip;
- the native remote workspace content host; and
- transient loading, error, command-palette, and diagnostics overlays.

There is no persistent title bar, toolbar, tool rail, inspector, status bar,
address field, tab strip, or browser menu. The native content view is aligned
to the content host by the main process after frame-coalesced renderer bounds
updates.

The visual language is a compact dark neutral theme with thin separators,
system typography, restrained contrast, and a canvas-first composition.

## Startup and workspace URL

The native window starts hidden until the bundled shell is ready. If a valid
user preference exists, it wins. Otherwise `APP_CONTENT_URL` supplies the
explicit first-run default. If neither is present, no remote view is created:
the shell displays a local first-run message and opens the settings window with
focus on the URL field.

The settings URL editor accepts HTTP(S) during development and tests. A
production save requires HTTPS, a host, and no username or password. Saving a
valid URL writes preferences atomically, rebuilds the content generation, and
immediately loads the new workspace while keeping Settings open. A failed load
keeps the saved URL and shows the local error state.

## Presentation and keyboard commands

Windowed, maximized, and native fullscreen are separate states. Fullscreen
restores the previous non-fullscreen state. The defaults are:

| Command               | macOS                       | Windows                        |
| --------------------- | --------------------------- | ------------------------------ |
| Open Settings         | Cmd+,                       | Ctrl+,                         |
| Open command palette  | Cmd+Shift+L                 | Ctrl+Shift+L                   |
| Minimize              | Cmd+M                       | Alt+M                          |
| Maximize/restore      | Cmd+Shift+M                 | Alt+Shift+M                    |
| Close focused window  | Cmd+W                       | Ctrl+W                         |
| Quit                  | Cmd+Q                       | Ctrl+Q                         |
| Fullscreen            | Ctrl+Cmd+F                  | F11                            |
| Reload / hard reload  | Cmd+R / Cmd+Shift+R         | Ctrl+R / Ctrl+Shift+R          |
| Zoom reset / in / out | Cmd+0 / Cmd+Shift+= / Cmd+- | Ctrl+0 / Ctrl+Shift+= / Ctrl+- |

The command registry owns these defaults and current bindings. The main
process dispatches commands while either local renderer or remote content is
focused. The command palette is searchable and contains only known commands;
it is never an address bar. `Escape` closes the topmost transient surface.

## Settings window

Settings is a separate, modeless, frameless local window (760×640 by default,
minimum 640×520) with no visible window buttons. It is single-instance; a new
open request focuses the existing window.

The window contains a Workspace URL section and a Keyboard Shortcuts section.
The shortcut editor supports search, physical-key capture, per-command reset,
reset-all, conflict feedback, dirty state, and keyboard-only Save/Discard/
Cancel decisions. `Ctrl/Cmd+S` saves, `Ctrl/Cmd+W` requests close, and Escape
cancels capture before closing a clean window.

Settings can be opened by its current shortcut or by choosing **Settings…** in
the application context menu. Right-clicking the local shell or the remote
workspace uses the same main-process menu. Production exposes only Settings;
development may add Inspect Element when DevTools is enabled.

## Loading and recovery

All final loading and failure states are local shell UI. A load error or
renderer crash displays a sanitized description and a keyboard hint to use the
Reload Workspace command. The shell remains alive while a content generation
is replaced or recovered. Events from an older generation cannot overwrite the
current state.

## Accessibility and acceptance

Every settings and shell action has a semantic keyboard path, visible focus,
logical focus order, and an announced validation or failure state. Drag regions
never contain interactive controls. Acceptance requires no visible native or
custom window buttons, no browser chrome, no uncontrolled popup or permission
UI, correct bounds during resize/fullscreen/high-DPI transitions, and complete
keyboard operation of routine workflows.
