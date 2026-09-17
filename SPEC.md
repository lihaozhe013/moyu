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
Electron. It presents one predefined web application inside a native-feeling
creative-workstation shell.

The application MUST:

- use a locally bundled shell as the primary visible UI;
- show one isolated remote content surface for the configured workspace;
- provide custom desktop chrome, workspace panels, loading/error states, and
  controlled window interactions;
- support windowed, maximized, and true native fullscreen presentation;
- remain suitable for WebGL2, WebGPU, Three.js, WebAssembly, workers,
  OffscreenCanvas, and other GPU-intensive content;
- behave correctly on supported Windows and macOS systems, including Apple
  Silicon and high-DPI displays;
- use a typed, modern TypeScript codebase with reproducible builds.

The product is NOT a general-purpose browser. Unless a later product decision
explicitly changes the boundary, it MUST NOT grow browser tabs, a permanent
address bar, bookmarks, browser history UI, extension support, omnibox
behavior, arbitrary browser navigation, or uncontrolled browser windows.

## 2. Runtime and trust boundaries

The runtime has three distinct trust domains:

1. **Electron main process** — owns lifecycle, native window and content-view
   management, navigation, permissions, downloads, menus, shortcuts, session
   policy, security controls, IPC validation, persistence, diagnostics, and
   crash handling.
2. **Local shell renderer** — owns the titlebar, menus, tool rail, inspector,
   status bar, overlays, command palette, and visual branding. It is bundled
   locally and is the primary renderer of the `BrowserWindow`.
3. **Remote content `WebContentsView`** — displays only the configured web
   application and is never promoted to application authority.

The shell and remote content MUST NOT share privileges or trust assumptions.
The remote page MUST NOT be the `BrowserWindow`'s primary renderer. Version 1
MUST use a single `WebContentsView`; an HTML `<webview>` is not an equivalent
substitute and requires an explicit future decision to use.

The shell MUST never be served from the Internet. The remote view SHOULD have
no preload script. The remote page MUST not receive filesystem, process,
Electron, or arbitrary command capabilities.

### 2.1 Source and dependency boundaries

Source MUST remain ESM-first and enable TypeScript `strict` mode with maximum
practical strictness, including unchecked-index and exact-optional-property
checks where supported
by the selected toolchain. Untrusted values enter as `unknown`, are validated
at the boundary, and are represented internally with explicit discriminated
types. `any` is exceptional and requires a documented external-boundary
justification. Renderer code must not import main-process implementation
modules, and environment variables must not be read outside the validated
configuration boundary.

The approved baseline is Electron with TypeScript, React, plain modern CSS,
Vitest, Playwright, ESLint, Prettier, electron-builder, and pnpm. Exact
versions are pinned in the manifest and lockfile; an agent MUST establish
compatibility and update verification evidence before changing them. No
dependency may be added without an identifiable product or engineering need.

## 3. Security invariants

### 3.1 Electron isolation

The primary window and remote content must retain these security properties:

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
redirect. The initial workspace URL and its exact configured trusted origin(s)
are allowed. Authentication or support origins MAY be allowed only when they
are explicitly configured and documented.

By default the application MUST deny:

- arbitrary external navigation;
- `javascript:`, `file:`, `data:`, `blob:`, and unexpected custom schemes;
- redirects to origins outside the allowlist;
- popup or secondary-window creation.

Popup decisions MUST default to deny and MUST be made by an explicit policy,
not by inheriting Chromium defaults. Any future exception must be narrow,
origin-aware, and tested.

The hidden command palette MUST NOT become an address bar. In production it
may execute only predefined commands or aliases. Arbitrary URL entry is
allowed only in an explicitly enabled development configuration and must be
impossible through normal production UI.

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
sender, payload type, numeric ranges, and object lifecycle before invoking a
native operation. Responses and events must use explicit discriminated types.

The shell preload MAY expose only the minimum `DesktopAPI` needed for window
actions, content controls/state, layout updates, and other approved app
features. It MUST NOT expose `ipcRenderer`, `require`, `process`, filesystem or
child-process APIs, shell execution, generic invoke/execute channels, or
arbitrary command dispatch.

Screenshot capture, GPU diagnostics, downloads, and other privileged
operations remain main-process-controlled internal capabilities. They MUST NOT
be callable by the remote page.

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

The shell MUST provide working minimize, maximize/restore, close, drag, and
double-click titlebar behavior. Windows uses custom/frameless chrome. macOS
must feel native, preserve traffic-light behavior where practical, reserve
its safe titlebar area, and retain expected Cmd shortcuts and menus.

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
the existing window instead of creating an independent workspace.

### 4.3 Layout and native content geometry

The shell owns the visual layout; the main process owns the final native bounds
of the content view. Initial design values are approximately 32 px titlebar,
36 px menu/toolbar, 48 px tool rail, 280 px inspector, and 24 px status bar.
These values are tunable design tokens, not hidden contracts.

The renderer reports a validated content rectangle containing x, y, width,
height, and device scale information. The main process rounds native DIP
bounds, rejects non-finite or unsafe values, and applies them to the single
`WebContentsView`. Geometry updates MUST be deduplicated and frame-coalesced;
the remote page cannot set its own native bounds.

Bounds synchronization MUST remain correct during resize, maximize, restore,
fullscreen, panel changes, Retina rendering, Windows 125%/150% scaling,
mixed-scale multi-monitor moves, and transitional zero-size layouts.

### 4.4 Input, menus, zoom, and accessibility

Application-scoped shortcuts MUST include command palette (`Ctrl/Cmd+Shift+L`),
reload, hard reload, fullscreen (`F11` where applicable), Escape-first modal
close, and controlled content zoom reset/increase/decrease. Content zoom starts
at 100%, remains between 50% and 200%, and uses approved discrete steps. Shell
zoom remains fixed in version 1. Development-only inspection shortcuts and
menus MUST be disabled in production unless developer mode is explicitly on.

Windows need no generic application menu unless required. macOS MUST retain a
proper native menu with expected About, Hide, Edit, Window, and Quit roles.
Remote content MUST not receive a browser-like context menu; production may
show none or a minimal app-specific menu.

Titlebar drag regions MUST exclude every interactive control, input, and
button. Custom controls MUST use semantic elements, have accessible names for
icon-only actions, preserve keyboard focus, and maintain reasonable contrast.

The baseline shortcut contract is:

- `Ctrl/Cmd+Shift+L` opens the command palette;
- `Ctrl/Cmd+R` reloads content and `Ctrl/Cmd+Shift+R` hard-reloads it;
- `F11` toggles fullscreen where supported;
- `Escape` closes the topmost palette or modal first;
- `Ctrl/Cmd+0`, `Ctrl/Cmd++`, and `Ctrl/Cmd+-` reset or change content zoom;
- `Ctrl/Cmd+Shift+I` opens content DevTools only in development mode.

These shortcuts are application-scoped. Global system shortcuts are not a
substitute for active-window handling.

Content zoom uses these approved steps: 50%, 67%, 75%, 80%, 90%, 100%, 110%,
125%, 150%, 175%, and 200%.

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

Configuration MUST be typed, validated once, and passed to subsystems rather
than read from `process.env` throughout arbitrary modules. At minimum it
contains the initial content URL, allowed origins, environment mode, session
partition choice, developer-tools flag, arbitrary-navigation flag, and logging
policy.

The supported modes are `development`, `production`, and `test`:

- Development MAY use a Vite server, HMR, verbose logs, DevTools, and
  explicitly enabled arbitrary navigation.
- Production uses the packaged local shell, restricted navigation, sanitized
  logs, no localhost assumptions, and DevTools off by default.
- Tests use deterministic local fixture content and must not depend solely on a
  live production website.

Production requires approved HTTPS content URLs and origins. Placeholder
branding, placeholder URLs, broad allowlists, and development flags MUST NOT
silently ship as production defaults. Missing product inputs must fail clearly
or remain explicitly marked as release blockers.

## 8. Persistence, capture, and release constraints

Persist only necessary desktop state: validated size, optional position,
maximized state, and any explicitly approved content zoom. Restored positions
must intersect an available display or fall back to a centered primary
display. Fullscreen is not persisted by default.

Internal capture supports a content target and may support a whole-window
target. Capture is initiated by the main process and must accurately represent
the requested surface; no capture API is exposed to remote content.

The supported release matrix includes Windows 11 x64 and supported Electron
macOS arm64 and x64 builds, with Retina, native fullscreen, scaling, menus,
traffic lights, and Cmd/trackpad behavior validated on macOS. Packaging must
be reproducible from the lockfile and structurally support signing and
notarization. Unsigned artifacts are acceptable only when clearly labeled as
development/release-input pending; placeholder branding must be replaced
before a signed production release.

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
permission decisions, configuration validation, IPC payload validation,
geometry conversion/validation, zoom bounds, and window-state transitions.

The fixture environment MUST provide deterministic routes for readiness,
allowed and denied redirects, popup attempts, load errors, downloads,
permissions, WebGL capability, and (where practical) WebGPU capability.

E2E coverage MUST verify launch and shell readiness, absence of browser chrome,
content loading, geometry through resize and scaling, maximize/fullscreen/
restore, command palette behavior, navigation and popup denial, reload, custom
error UI, and content-renderer crash recovery where the platform permits.

CI must preserve separate install, type-check, lint, unit-test, build, E2E, and
package gates as supported by the provider. Warnings and failures MUST remain
visible; scripts must not hide stderr or cargo-cult obsolete Electron
templates.

The hard acceptance criterion is that normal operation never leaks a URL bar,
tab strip, Chromium menu, default download shelf, browser new-tab or error
page, `about:blank`, `chrome://` surface, uncontrolled popup, browser
permission bubble, or generic Electron chrome.

## 10. Agent change protocol

Before changing code, an agent MUST:

1. identify which constraint(s) the change touches;
2. read the relevant architecture, security, development, testing, or release
   document;
3. determine whether the change crosses a trust boundary or changes a public
   IPC contract;
4. locate an existing test or add one before relying on manual inspection.

While changing code, an agent MUST:

- keep main, shell, and remote-content responsibilities separate;
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
- confirm that new windows, privileges, downloads, permissions, and logging
  paths are covered by policy;
- leave the worktree in a reviewable state with a concise Conventional Commit
  message when committing is requested or part of the active implementation
  workflow.

## 11. Explicit product inputs and change control

The following values are product decisions, not assumptions an agent may
invent:

- final application name, icon, and visual brand assets;
- production workspace URL and every trusted/authentication origin;
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
