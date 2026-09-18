# Professional Canvas Desktop App

## Agent Constraint Specification

Status: normative reference for future changes
Scope: the complete desktop application and its release process

This document defines the product boundary, security invariants, runtime
contracts, and acceptance criteria that must remain true as the project
evolves. It is intentionally not an implementation plan. Concrete module
choices, commands, and current implementation notes belong in the documents
under `docs/`.

## How agents must use this specification

- Read this file before changing application runtime, window behavior, remote
  content, IPC, security, packaging, or tests.
- Treat every requirement using **MUST**, **MUST NOT**, **SHOULD**, or **MAY** as
  normative. A recommendation can be changed only with an explicit product
  decision and updated documentation.
- Preserve the trust boundaries and fail-closed defaults even when a page,
  dependency, or platform makes a shortcut tempting.
- Consult the relevant explanatory document in `docs/` for rationale and the
  current design. When the implementation and this specification disagree,
  record and resolve the deviation; do not silently weaken the specification.
- A change that affects a constraint must update the affected tests and the
  appropriate traceability, security, development, or release documentation.

## 1. Product boundary

The product is a professional, cross-platform desktop workspace built with
Electron. It presents one user-configured web application inside a
native-feeling, keyboard-first creative-workstation shell.

The application MUST:

- use a locally bundled shell as the primary visible UI;
- show one isolated remote content surface for the configured workspace;
- present a frameless, canvas-first primary window without visible native or
  custom close, minimize, or maximize controls;
- make every desktop-shell action available through an application shortcut,
  with no action that requires a primary-button mouse click;
- provide a separate, locally bundled settings window for editing the
  workspace URL and shortcut bindings;
- provide workspace panels, loading/error states, and controlled window
  interactions without turning persistent chrome into the primary command
  surface;
- support windowed, maximized, and true native fullscreen presentation;
- remain suitable for WebGL2, WebGPU, Three.js, WebAssembly, workers,
  OffscreenCanvas, and other GPU-intensive content;
- behave correctly on supported Windows and macOS systems, including Apple
  Silicon and high-DPI displays;
- use a typed, modern TypeScript codebase with reproducible builds.

The product is NOT a general-purpose browser. Unless a later product decision
explicitly changes the boundary, it MUST NOT grow browser tabs, a permanent
address bar, bookmarks, browser history UI, extension support, omnibox
behavior, arbitrary in-workspace browser navigation, or uncontrolled browser
windows. Editing the single persisted workspace URL in the dedicated settings
window is a configuration operation and MUST NOT introduce address-bar
behavior into the primary workspace.

## 2. Runtime and trust boundaries

The runtime has four distinct trust domains:

1. **Electron main process** — owns lifecycle, native window and content-view
   management, the command and shortcut registry, navigation, permissions,
   downloads, native menus, session policy, security controls, IPC validation,
   persistence, diagnostics, and crash handling.
2. **Local workspace renderer** — owns the workspace frame, panels, status
   indicators, overlays, command palette, and visual branding. It is bundled
   locally and is the primary renderer of the main `BrowserWindow`.
3. **Local settings renderer** — owns the shortcut editor, workspace URL
   editor, validation feedback, and settings-window interaction. It is a
   separately presented local renderer and never hosts remote content.
4. **Remote content `WebContentsView`** — displays only the configured web
   application and is never promoted to application authority.

The local renderers and remote content MUST NOT share privileges or trust
assumptions. The remote page MUST NOT be a `BrowserWindow`'s primary renderer.
Version 1 MUST use a single remote `WebContentsView`; the independent settings
window does not create another remote content surface. An HTML `<webview>` is
not an equivalent substitute and requires an explicit future decision to use.

The workspace and settings renderers MUST never be served from the Internet.
Each local window MUST retain context isolation and a capability-specific,
minimal preload boundary. The remote view SHOULD have no preload script. The
remote page MUST not receive filesystem, process, Electron, settings-storage,
shortcut-registration, or arbitrary command capabilities.

### 2.1 Source and dependency boundaries

Source MUST remain ESM-first and enable TypeScript `strict` mode with maximum
practical strictness, including unchecked-index and exact-optional-property
checks where supported
by the selected toolchain. Untrusted values enter as `unknown`, are validated
at the boundary, and are represented internally with explicit discriminated
types. `any` is exceptional and requires a documented external-boundary
justification. Renderer code must not import main-process implementation
modules, local renderers must not depend on one another's runtime state, and
environment variables must not be read outside the validated configuration
boundary.

The approved baseline is Electron with TypeScript, React, plain modern CSS,
Vitest, Playwright, ESLint, Prettier, electron-builder, and pnpm. Exact
versions are pinned in the manifest and lockfile; an agent MUST establish
compatibility and update verification evidence before changing them. No
dependency may be added without an identifiable product or engineering need.

## 3. Security invariants

### 3.1 Electron isolation

Every local application window and the remote content surface must retain
these security properties:

- `nodeIntegration` disabled;
- `contextIsolation` enabled;
- Chromium sandbox enabled wherever the selected Electron architecture
  permits it;
- `webSecurity` enabled;
- insecure-content execution disabled;
- no privileged APIs exposed to remote content.

The application MUST NOT disable hardware or web security globally, disable
CORS for convenience, enable broad experimental Chromium switches, or add a
privileged preload to remote content without a reviewed product requirement.

The local shell must have an explicit content-security policy appropriate for
its packaged assets. No CSP or header change may be used to bypass the
navigation, sandbox, or origin constraints below.

### 3.2 Navigation and popup policy

Navigation policy MUST be centralized and evaluated for every navigation and
redirect. The active workspace URL comes from validated user preferences, or
from an explicit first-run default when no preference exists. Its exact origin
becomes the primary trusted origin only after the URL has passed the production
scheme and syntax requirements. Authentication or support origins MAY be
allowed only when they are separately configured and documented; they MUST NOT
be inferred from arbitrary links encountered by the remote page.

By default the application MUST deny:

- arbitrary external navigation;
- `javascript:`, `file:`, `data:`, `blob:`, and unexpected custom schemes;
- redirects to origins outside the allowlist;
- popup or remote-requested secondary-window creation.

Popup decisions MUST default to deny and MUST be made by an explicit policy,
not by inheriting Chromium defaults. Any future exception must be narrow,
origin-aware, and tested. The main-process-created local settings window is an
application surface, not a popup-policy exception; remote content MUST have no
path to create or navigate it.

The hidden command palette MUST NOT become an address bar. In production it
may execute only predefined commands or aliases. The dedicated settings window
is the only production UI that may edit the workspace URL. Saving a new URL
replaces the configured primary workspace target; it MUST NOT grant trust to
other origins, enable free-form navigation from the workspace, or expose URL
entry in a transient command surface.

### 3.3 Permissions, sessions, and downloads

Permission request and permission check handlers MUST exist for the content
session and MUST default to deny. Only individually reviewed capabilities may
be enabled. Clipboard, notifications, media, or fullscreen are potential
future permissions; camera, microphone, geolocation, MIDI, HID, serial, USB,
and Bluetooth remain denied unless an explicit feature decision approves them.

The content session MUST be obtained explicitly and all session policies must
be centralized. A named persistent partition is permitted only when workspace
login/session persistence requires it; the default Electron session must not be
modified globally as a convenience.

Downloads MUST be intercepted and cancelled until an application-controlled
download flow is designed, approved, and tested. Chromium's default download
shelf and uncontrolled file writes MUST never appear accidentally.

### 3.4 IPC and privileged APIs

IPC MUST use a small, named, typed contract. Every request must validate the
sender, payload type, numeric ranges, command identifier, shortcut binding,
URL value, and object lifecycle as applicable before invoking a native
operation. Responses and events must use explicit discriminated types.

The workspace preload MAY expose only the minimum `DesktopAPI` needed for
approved commands, window state, content state, and layout updates. The
settings preload MAY additionally expose narrow, typed preference read,
validate, save, and reset operations. Neither preload may expose `ipcRenderer`,
`require`, `process`, filesystem or child-process APIs, shell execution,
generic invoke/execute channels, or command dispatch that is not restricted to
known command identifiers.

Shortcut registration, preference persistence, screenshot capture, GPU
diagnostics, downloads, and other privileged operations remain
main-process-controlled internal capabilities. They MUST NOT be callable by
the remote page.

### 3.5 Privacy-preserving logging

Logging may be categorized as app, window, content, navigation, security, GPU,
and IPC. Production logs MUST exclude cookies, credentials, auth tokens,
request bodies, and private page data. URLs and errors must be sanitized while
retaining enough context to diagnose failures.

## 4. Window and platform behavior

### 4.1 Startup and shell chrome

The primary window MUST start hidden and be shown only after the local shell is
ready enough to avoid a white or unstyled flash. Users must never see
`about:blank`, a Vite page, raw HTML, or remote content before the shell.

The default desktop window is approximately 1600 × 1000 with a minimum usable
size of 1100 × 700, subject to platform conventions and validated layout
constraints.

The visual language is a dense, dark, professional creative workstation:
neutral panels, restrained contrast, compact typography, thin separators, and
canvas-first composition. It MUST NOT imitate Chrome, Edge, Safari, Firefox,
or a generic Electron demo, and MUST NOT copy Adobe or other proprietary
trademarks, names, icons, or exact assets.

Every application-owned window MUST use a frameless presentation without
visible native window buttons. Windows caption buttons and macOS traffic lights
MUST be hidden. The shell MUST NOT recreate close, minimize, maximize, or
restore as custom buttons, including hover-only or edge-revealed substitutes.
Those operations remain available through commands and shortcuts.

The primary workspace MUST avoid a persistent row of clickable window or
browser controls. A visually quiet drag region and invisible resize edges MAY
remain available as pointer conveniences, but they MUST NOT contain interactive
controls or replace the keyboard command contract. macOS MUST still retain
appropriate native application menus and conventional Cmd behavior where they
do not conflict with user-configured bindings.

### 4.2 Presentation states

Window presentation is an explicit state with exactly these conceptual values:

- `windowed` — resizable desktop window;
- `maximized` — native maximized workspace with shell visible;
- `fullscreen` — true native fullscreen with OS chrome removed.

Maximized and fullscreen MUST never share one boolean or be treated as the
same state. Fullscreen MUST preserve the shell and content view, resize
correctly, and restore the previous non-fullscreen presentation on exit.
Fullscreen MUST NOT be restored automatically on application launch unless a
future product decision explicitly requires it.

The app MUST use a single-instance lock. A second launch focuses and restores
the existing window instead of creating an independent workspace. The settings
window is a secondary local application window, not a second workspace, and
only one settings-window instance may exist at a time.

### 4.3 Layout and native content geometry

The shell owns the visual layout; the main process owns the final native bounds
of the content view. No permanent titlebar, toolbar, tool rail, or window-button
strip is required by this specification. Optional panels, status indicators,
and a visually quiet drag region use tunable design tokens and MUST preserve a
canvas-first composition.

The renderer reports a validated content rectangle containing x, y, width,
height, and device scale information. The main process rounds native DIP
bounds, rejects non-finite or unsafe values, and applies them to the single
`WebContentsView`. Geometry updates MUST be deduplicated and frame-coalesced;
the remote page cannot set its own native bounds.

Bounds synchronization MUST remain correct during resize, maximize, restore,
fullscreen, panel changes, Retina rendering, Windows 125%/150% scaling,
mixed-scale multi-monitor moves, and transitional zero-size layouts.

### 4.4 Keyboard-first command model

The desktop shell is keyboard-first and keyboard-complete. Every routine shell
or window action MUST have a stable command identifier and at least one active
shortcut. No shell action may require a primary-button mouse click. This
requirement covers window presentation, settings, content lifecycle, zoom,
panels, overlays, and the command palette; it does not redefine interaction
inside the remote web application.

The main process MUST own one authoritative command registry that defines
command identifiers, labels, default bindings, current user bindings,
availability, and dispatch targets. The shortcut editor, native menus, context
menu, command palette, and runtime dispatch MUST refer to that registry rather
than maintain independent command lists. Renderers may request only known
commands and MUST NOT execute arbitrary command strings.

The default shortcut contract includes at least:

- `Ctrl/Cmd+,` opens or focuses the settings window;
- `Ctrl/Cmd+Shift+L` opens the command palette;
- `Ctrl/Cmd+R` reloads content and `Ctrl/Cmd+Shift+R` hard-reloads it;
- `Ctrl/Cmd+S` saves pending changes while the settings window is focused;
- a documented platform-appropriate shortcut minimizes the primary window;
- a documented platform-appropriate shortcut toggles maximize/restore;
- `Ctrl/Cmd+W` closes the focused application window;
- `Ctrl/Cmd+Q` quits the application where the platform permits it;
- `F11` on Windows and `Ctrl+Cmd+F` on macOS toggle native fullscreen;
- `Escape` closes the topmost palette, modal, or transient surface first;
- `Ctrl/Cmd+0`, `Ctrl/Cmd++`, and `Ctrl/Cmd+-` reset or change content zoom;
- `Ctrl/Cmd+Shift+I` opens content DevTools only in development mode.

These are defaults, not hard-coded permanent bindings. All application-owned
routine command bindings MUST be editable in the settings window. An
OS-reserved binding that Electron cannot safely override MAY remain fixed, but
the settings UI must identify it clearly. Essential commands, including Open
Settings, Close Window, and Quit, MUST retain a valid keyboard path after every
save. Unsupported, duplicate, ambiguous, modifier-only, and unsafe unmodified
printable-key bindings MUST be rejected before activation.

Shortcuts are application-scoped and MUST work while either local renderer or
the remote content view has focus, subject to explicit text-entry safeguards.
The application MUST NOT register system-wide global hotkeys unless a later
product decision explicitly requests them. User bindings take effect
predictably after a successful save, survive restart, and are stored by stable
command identifier so labels and defaults can evolve safely.

Content zoom starts at 100%, remains between 50% and 200%, and uses these
approved steps: 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, and
200%. Shell and settings UI zoom remain fixed in version 1. Development-only
commands and menus MUST remain unavailable in production unless developer mode
is explicitly enabled.

### 4.5 Settings window and context-menu entry

Settings MUST open in a separate, locally bundled window. It MUST NOT be a
workspace panel, command-palette page, remote document, or browser popup. If it
is already open, another open request focuses the existing instance. Closing
the primary workspace closes the settings window, and the settings window MUST
NOT keep the application alive by itself.

The settings window MUST provide, at minimum:

- a workspace URL editor with the current effective value and inline
  validation;
- a searchable list of commands and their current shortcut bindings;
- keyboard-driven shortcut capture that shows the proposed binding before it
  is saved;
- immediate conflict and unsupported-binding feedback;
- reset actions for one binding and for all bindings;
- explicit, keyboard-operable save and cancel behavior, with clear dirty and
  success states.

The complete settings workflow MUST be operable using only the keyboard, with
logical focus order, visible focus, predictable initial focus, semantic form
controls, and no keyboard trap. `Escape` cancels transient capture first and
then closes the settings window when no unsaved-change decision is pending;
`Ctrl/Cmd+W` also closes it through the command registry. The settings window
MUST follow the same no-visible-window-buttons rule as the primary workspace.

Users MUST be able to open or focus Settings in both of these ways:

1. invoke the currently configured Open Settings shortcut;
2. right-click anywhere inside the primary application window, including the
   local shell and remote content surface, and choose **Settings…** from the
   application context menu.

The right-click path is a discoverability fallback and does not weaken the
keyboard-complete requirement. The same application-owned context menu MUST
replace browser context menus across the primary window; it MUST NOT expose
navigation, page source, inspection, download, or arbitrary URL actions in
production. Keyboard users may open the same context menu through the platform
context-menu key where supported.

Saving a workspace URL MUST validate and normalize it before persistence. In
production, the URL MUST use HTTPS, contain a valid host, and contain no
embedded credentials. A saved change replaces the single workspace target and
its exact primary trusted origin, then reloads or offers a clearly described
keyboard-operable reload action. Invalid input MUST preserve the last valid
workspace and keep focus near actionable validation feedback. The URL editor
MUST NOT store credentials, reveal URL history, provide suggestions from
browsing activity, or act as a general navigation control.

### 4.6 Native menus and accessibility

Windows need no generic application menu unless required. macOS MUST retain a
proper native menu with expected About, Hide, Edit, Window, and Quit roles, and
MUST include Settings using the same command registry. Native menus are
secondary discovery surfaces; they do not replace customizable shortcuts.

Drag regions MUST exclude every interactive control and input. Custom controls
MUST use semantic elements, expose accessible names, preserve focus across
window-state changes, maintain reasonable contrast, and announce validation or
command failures without relying on color alone.

## 5. Content lifecycle and resilience

The shell owns the user-visible lifecycle of the remote view. It MUST track
start/stop loading, load failure, renderer exit/crash, unresponsive, and
responsive events through a typed status model.

The status model must distinguish at least idle, loading, ready, load error
with diagnostic context, and crashed states. A renderer-generation or similar
identity must prevent stale events from an earlier content view from replacing
newer state.

The expected sequence is hidden window → local shell → visible workspace
skeleton → remote content loading overlay → ready content. Load failures and
crashes MUST produce local, professional overlays with a retry/reload action;
the shell MUST survive a remote renderer failure. Chromium's default error,
download, permission, or new-tab UI MUST never be the final experience.

Reload and hard-reload actions must affect only the content view. Stale events
from an old content generation MUST NOT overwrite the current shell status.
Applying a new workspace URL MUST start a new content generation through the
same loading, failure, and crash-recovery lifecycle; events from the previous
URL or view generation MUST NOT overwrite the new state.

## 6. GPU and performance constraints

Hardware acceleration remains enabled under normal conditions. The app MUST
use direct Chromium rendering in the content view and MUST NOT continuously
capture the remote page into a screenshot canvas for redisplay.

WebGL2 and WebGPU availability MUST be feature-detected by the content
application. The shell MUST make no assumption that WebGPU exists and MUST
not force it through insecure experimental flags. Where the content app
supports it, WebGL2 is the graceful fallback.

An internal developer diagnostics surface MAY report Electron/Chromium
versions, OS, architecture, GPU feature status, WebGL/WebGPU capability, and
device scale factor. It MUST not expose page data or secrets.

Normal operation SHOULD keep shell idle CPU near zero, avoid continuous React
rerender loops and polling, keep native resizing smooth, and avoid resize IPC
storms. Background throttling must be evaluated for the visible active content
surface; global throttling changes require a measured, documented need.

## 7. Configuration and environment contracts

Configuration has two distinct layers that MUST NOT be conflated:

1. **Runtime policy** is supplied by the build or launch environment, typed,
   validated once at startup, and passed to subsystems instead of being read
   from `process.env` throughout arbitrary modules. It contains the environment
   mode, optional first-run workspace URL, separately approved auxiliary
   origins, session-partition policy, developer-tools flag, development-only
   arbitrary-navigation flag, and logging policy.
2. **User preferences** are changed through the local settings window and
   validated on both load and save. Version 1 preferences contain the active
   workspace URL and shortcut overrides, plus separately approved desktop
   state described in Section 8.

User preferences MUST NOT enable developer tools, arbitrary navigation,
permissions, downloads, insecure schemes, additional trusted origins, or any
other runtime security policy. The active navigation policy combines the one
validated user-selected workspace origin with only the fixed auxiliary origins
approved by runtime policy.

The supported modes are `development`, `production`, and `test`:

- Development MAY use a Vite server, HMR, verbose logs, DevTools, and
  explicitly enabled arbitrary navigation.
- Production uses the packaged local shell, restricted navigation, sanitized
  logs, no localhost assumptions, and DevTools off by default.
- Tests use deterministic local fixture content and must not depend solely on a
  live production website.

Production requires a validated HTTPS workspace URL. Fixed authentication and
support origins require explicit approval. Placeholder branding, placeholder
URLs, broad allowlists, and development flags MUST NOT silently ship as
production defaults. Missing product inputs must fail clearly or remain
explicitly marked as release blockers. If neither preferences nor a first-run
default contains a valid workspace URL, the app MUST show a local first-run
state and open or direct keyboard focus to Settings; it MUST NOT navigate to a
placeholder or guessed URL.

## 8. Persistence, capture, and release constraints

Persist only necessary application state: the validated workspace URL,
shortcut overrides keyed by stable command identifier, validated window size,
optional position, maximized state, and any explicitly approved content zoom.
The preference format MUST be schema-versioned, validated before use, written
atomically, and recover safely from missing, partial, or corrupt data. It MUST
not contain credentials, authentication tokens, page data, or browsing
history.

Restored positions must intersect an available display or fall back to a
centered primary display. Fullscreen is not persisted by default. Invalid URL
or shortcut data MUST be isolated without discarding unrelated valid
preferences, and users MUST be offered a keyboard-operable recovery or reset
path.

Internal capture supports a content target and may support a whole-window
target. Capture is initiated by the main process and must accurately represent
the requested surface; no capture API is exposed to remote content.

The supported release matrix includes Windows 11 x64 and supported Electron
macOS arm64 and x64 builds, with Retina, native fullscreen, scaling, menus,
hidden traffic lights, context menus, user-configured shortcuts, and Cmd
behavior validated on macOS. Packaging must be reproducible from the lockfile
and structurally support signing and notarization. Unsigned artifacts are
acceptable only when clearly labeled as development/release-input pending;
placeholder branding must be replaced before a signed production release.

Runtime dependencies MUST remain minimal and justified. Avoid heavy UI,
router, state-management, utility, or obsolete Electron helper packages when
the platform or straightforward local code is sufficient. Dependency updates
must preserve the pinned lockfile and pass the full quality gates.

## 9. Verification and acceptance gates

Every change must run the applicable checks described in `docs/testing.md` and
`docs/development.md`. At minimum, the repository must retain passing
type-checking, linting, unit tests, build validation, and deterministic E2E
coverage before a release-oriented change is considered complete.

Unit coverage MUST include navigation/redirect allowlists, popup and
permission decisions, runtime-policy and preference validation, workspace URL
normalization and origin replacement, shortcut parsing and conflict detection,
command-registry dispatch, IPC payload validation, geometry
conversion/validation, zoom bounds, and window-state transitions.

The fixture environment MUST provide deterministic routes for readiness,
allowed and denied redirects, popup attempts, load errors, downloads,
permissions, WebGL capability, and (where practical) WebGPU capability.

E2E coverage MUST verify launch and shell readiness, absence of all native and
custom window-control buttons, content loading, geometry through resize and
scaling, shortcut-driven minimize/maximize/restore/fullscreen/close, command
palette behavior, and a complete keyboard-only path through routine shell
commands. It MUST also verify opening the single settings window through the
current shortcut and through right-click from both local and remote surfaces;
editing, rejecting conflicts, saving, resetting, and persisting shortcuts; and
validating, saving, persisting, and loading a changed workspace URL. Navigation
and popup denial, reload, custom error UI, and content-renderer crash recovery
remain required where the platform permits.

CI must preserve separate install, type-check, lint, unit-test, build, E2E, and
package gates as supported by the provider. Warnings and failures MUST remain
visible; scripts must not hide stderr or cargo-cult obsolete Electron
templates.

The hard acceptance criterion is that normal operation never leaks a visible
close/minimize/maximize control, URL bar, tab strip, Chromium menu, default
download shelf, browser new-tab or error page, `about:blank`, `chrome://`
surface, uncontrolled popup, browser permission bubble, generic Electron
chrome, or shell command that can be completed only with a primary-button
mouse click.

## 10. Agent change protocol

Before changing code, an agent MUST:

1. identify which constraint(s) the change touches;
2. read the relevant architecture, security, development, testing, or release
   document;
3. determine whether the change crosses a trust boundary, changes a public IPC
   contract, adds a command, or changes preference data;
4. locate an existing test or add one before relying on manual inspection.

While changing code, an agent MUST:

- keep main, workspace, settings, and remote-content responsibilities
  separate;
- route application commands and binding metadata through the authoritative
  command registry;
- prefer the smallest compatible change and avoid unrelated dependency churn;
- fail closed for unknown origins, permissions, schemes, payloads, and
  configuration values;
- keep UI behavior platform-appropriate and accessible;
- avoid adding source responsibilities to a file over 1,000 lines without
  first evaluating a focused module split;
- update documentation and traceability when behavior or constraints change.

Before handoff, an agent MUST:

- run the applicable quality gates and report any platform limitations;
- verify that production defaults remain restricted;
- confirm that new windows, commands, bindings, preferences, privileges,
  downloads, permissions, and logging paths are covered by policy;
- leave the worktree in a reviewable state with a concise Conventional Commit
  message when committing is requested or part of the active implementation
  workflow.

## 11. Explicit product inputs and change control

The following values are product decisions, not assumptions an agent may
invent:

- final application name, icon, and visual brand assets;
- the optional first-run workspace URL, any restrictions beyond the required
  production HTTPS validation, and every auxiliary authentication/support
  origin;
- the default bindings for minimize and maximize/restore on each supported
  platform;
- whether login persistence, downloads, clipboard, notifications, media, or
  other permissions are required;
- supported OS versions beyond the baseline matrix;
- signing, notarization, distribution channels, and release identifiers;
- whether additional content documents, popups, or whole-window capture become
  supported features.

Until each input is approved, development and test values must remain explicit
and isolated from production configuration. A request that would broaden the
browser boundary, add remote privilege, weaken a security default, or change a
platform contract requires an explicit product/security decision plus updated
tests and documentation.
