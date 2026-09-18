# Implementation Plan and Phase Record

This document records the implementation of the experimental, self-authored
web runtime. The current product direction is simplicity and page compatibility
over security isolation.

## Delivery principles

- Keep the shell small and keyboard-first.
- Let Electron load any URL it can parse and handle.
- Use one identical remote content policy in development and release.
- Preserve the first-run bounds fix so a newly created view is visible.
- Avoid application-level allowlists, denial policies, and defensive fallbacks.
- Document that only self-authored or trusted pages should be loaded.

## Completed phases

### 1. Shell and workspace lifecycle

- Frameless shell and local Settings window are implemented.
- Workspace URL persistence, reload, crash recovery, zoom, fullscreen, and
  loading/error states are implemented.
- Settings remains open after a successful URL save.

### 2. First-run view geometry

- The main process caches the latest `.content-host` bounds even when there is
  no content view.
- A view created after the first URL save receives those bounds before loading.
- Resize, reload, and subsequent URL changes keep the view aligned.

### 3. Unrestricted content runtime

- Workspace and popup views use Node/Electron access, disabled sandbox and web
  security, insecure-content support, and no remote preload.
- Certificate verification is accepted by the content session.
- Navigation and redirects are no longer filtered by origin or production
  scheme.
- Permission checks and requests are allowed.
- Downloads use Electron defaults.
- Origin, authentication-origin, arbitrary-navigation, popup, download, and
  strict permission policy modules were removed.

### 4. Verification and documentation

- Configuration and preference tests accept parseable HTTP, HTTPS, credentialed,
  local, and other URL forms.
- E2E coverage includes first-run saving, nonzero native bounds, cross-origin
  redirects, popup creation, permission requests, and test/production parity.
- Repository documentation now describes the runtime as experimental and not a
  security browser.

### 5. Whole-window drag and chrome removal

- Window dragging has no keyboard shortcut. The Settings window owns a
  mouse-driven drag mode toggle that activates and deactivates the mode
  through the typed Settings IPC contract.
- The main process synchronizes temporary native drag styling across the shell,
  the remote document, its child frames, and the Settings window state, and
  clears it on toggle-off, content replacement, reload lifecycle changes, and
  teardown. Focus loss intentionally keeps the mode so the toggle and the real
  state cannot disagree.
- The main and Settings layouts no longer contain a persistent top drag strip;
  the registered Electron application menu is removed while context menus and
  command shortcuts remain available.

## Current verification shape

The repository currently contains 20 Vitest files with 62 unit tests and 26
Electron E2E scenarios. The exact count can change as fixtures and shell
features evolve; the commands in `README.md` remain authoritative.

## Remaining release work

The following are deployment tasks rather than content-policy tasks:

- produce platform-specific packaged artifacts;
- complete Windows and macOS manual window and input checks;
- decide whether signing and notarization are wanted for a temporary build;
- record toolchain, platform, and test evidence for a release; and
- keep the self-authored-page limitation visible in release notes.
