# Architecture

This document describes the intended runtime and source architecture. [`../SPEC.md`](../SPEC.md) remains normative.

## System context

The product is a desktop container for one configured web workspace. It is not a browser and does not expose a general navigation model.

```text
┌──────────────────────── Operating system ────────────────────────┐
│                                                                  │
│  ┌──────────────────── Electron application ──────────────────┐  │
│  │                                                            │  │
│  │  Main process                                              │  │
│  │  ├── window and lifecycle ownership                        │  │
│  │  ├── security and navigation policy                        │  │
│  │  ├── session, permission, and download policy              │  │
│  │  └── narrow validated IPC                                  │  │
│  │             │                              │               │  │
│  │             ▼                              ▼               │  │
│  │  Local shell renderer              Remote content view     │  │
│  │  ├── React UI                      ├── trusted origin       │  │
│  │  ├── app chrome                    ├── no Node access       │  │
│  │  └── status/recovery UI            └── no privileged API   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          ▼
                              Configured web application
```

## Trust domains

### Main process

The main process is the only owner of native capabilities. It handles:

- application lifecycle and the single-instance lock;
- `BrowserWindow` and `WebContentsView` creation and disposal;
- window state, presentation transitions, and restored placement;
- content bounds application;
- navigation and popup decisions;
- permission, download, context-menu, and session policies;
- application-scoped native shortcuts and menus;
- validated IPC handlers;
- content loading, unresponsive, and crash events;
- logging and GPU diagnostics; and
- environment-specific behavior.

Main-process modules must remain focused. No central entry file should accumulate policy, window, session, and IPC implementation details.

### Local shell renderer

The local renderer is bundled with the desktop application and loaded as the `BrowserWindow`'s primary renderer. It owns:

- title bar, toolbar/menu, tool rail, inspector, and status bar;
- command palette, modals, loading overlay, and error/recovery overlay;
- layout measurement using `ResizeObserver`;
- user intent sent through the narrow preload API; and
- accessible interaction state.

The shell does not receive Node.js primitives. It receives only the explicit API exposed by the shell preload.

### Remote content view

Exactly one `WebContentsView` is used in version 1. It:

- loads the configured initial URL;
- is attached as a child of the main window content view;
- has Node integration disabled, context isolation enabled, sandbox enabled, and web security enabled;
- normally has no preload script;
- is controlled by centralized navigation, popup, permission, download, and context-menu policy; and
- never receives the shell's privileged preload API.

The remote page cannot set native view bounds, open arbitrary windows, or broaden its own permissions.

## Window composition

```text
BrowserWindow: local renderer
┌──────────────────────────────────────────────────────────┐
│ Title bar                                                │
├──────────────────────────────────────────────────────────┤
│ Toolbar or application menu                              │
├────────┬───────────────────────────────┬─────────────────┤
│ Tool   │                               │ Inspector       │
│ rail   │       WebContentsView         │                 │
│        │                               │                 │
├────────┴───────────────────────────────┴─────────────────┤
│ Status bar                                               │
└──────────────────────────────────────────────────────────┘
```

The local renderer paints all regions, including the visual host rectangle. The native content view is placed over only that host rectangle by the main process.

## Startup flow

```text
Acquire single-instance lock
        │
        ├── denied ──► focus/restore existing instance and exit
        │
        ▼
Resolve and validate configuration
        ▼
Create hidden BrowserWindow with secure shell preferences
        ▼
Install session, IPC, navigation, popup, and lifecycle handlers
        ▼
Load locally bundled shell
        ▼
Shell reaches initial readiness and reports content bounds
        ▼
Show window with workspace skeleton
        ▼
Create/attach the isolated WebContentsView
        ▼
Load configured content URL under navigation policy
        ▼
Publish loading/ready/error state to the shell
```

Handler installation must precede remote navigation so the first request is subject to the same policy as later requests.

## Content-view lifecycle

The content view has one owner and an explicit lifecycle:

1. Construct with hardened `webPreferences`.
2. Obtain its session and install policies before loading.
3. Attach it to the main window.
4. Apply the latest valid content rectangle.
5. Load the configured URL.
6. Translate load, responsiveness, and renderer-exit events into shell state.
7. Destroy listeners and references during window or app shutdown.

Recovery may recreate or reload the content view, but must not reload or replace the shell renderer unnecessarily.

## Content state model

The main process is authoritative for content lifecycle state:

```ts
type ContentStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'ready' }
  | { type: 'error'; code: number; description: string }
  | { type: 'crashed' };
```

Allowed conceptual transitions are:

```text
idle ──load──► loading ──success──► ready
                    │                 │
                    ├──failure──────► error
                    └──renderer exit► crashed

ready ──reload/navigation──► loading
ready ──renderer exit──────► crashed
error/crashed ──retry──────► loading
```

Events from obsolete loads must not overwrite the status of a newer navigation.

## Window state model

Window presentation is represented explicitly:

```ts
type WindowPresentation = 'windowed' | 'maximized' | 'fullscreen';
```

The model distinguishes requested presentation from raw platform events. Entering fullscreen records enough prior state to exit correctly. Persisted state stores size, optional position, and maximized status, but does not restore fullscreen automatically.

Before applying persisted coordinates, the main process confirms that the bounds intersect an available display. Invalid or off-screen state falls back to a centered primary-display window.

## Bounds synchronization

The content rectangle is a cross-process contract:

```ts
interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}
```

The flow is:

1. The shell observes its content-host element with `ResizeObserver`.
2. It reads `getBoundingClientRect()` after layout.
3. Updates are coalesced to an animation frame.
4. An update is sent only if a relevant value changed.
5. IPC validates finiteness, non-negative dimensions, sensible limits, and sender identity.
6. The main process rounds the DIP coordinates and applies `WebContentsView.setBounds()`.

The main process owns the final bounds call. The `devicePixelRatio` is diagnostic/contextual input; coordinates passed to Electron must follow Electron's device-independent-pixel contract and must not be multiplied blindly.

This subsystem must be exercised during resize, maximize, restore, fullscreen, panel changes, cross-display moves, Retina rendering, and Windows fractional scaling.

## Navigation decision flow

All main-frame navigation and popup requests use shared URL classification rather than duplicated conditionals.

```text
Raw target string
      ▼
Parse as URL ──failure──► deny
      ▼
Reject forbidden schemes (`javascript:`, remote `file:`, unexpected protocols)
      ▼
Classify origin and purpose
      ├── configured application origin ──► allow
      ├── explicit authentication origin ─► allow under its narrow rule
      ├── developer-only arbitrary target ─► allow only when enabled
      └── anything else ───────────────────► deny
```

Redirects are evaluated, not implicitly trusted because their initiating URL was allowed. Popup creation defaults to `{ action: 'deny' }`. A future allowed popup case must specify its target, purpose, lifetime, web preferences, and test coverage.

## IPC architecture

IPC contracts live in shared typed modules, while runtime validators live at or are imported by the main-process boundary.

Each request must define:

- a unique constant channel name;
- input and output types;
- runtime input validation;
- allowed sender identity and frame constraints;
- the owning main-process handler; and
- deterministic error behavior.

The initial conceptual surface is limited to window actions, content reload and zoom, state queries, and layout updates. The preload must not expose `ipcRenderer`, `process`, `require`, filesystem APIs, child processes, shell execution, or a generic invoke function.

Event delivery from main to shell must also use named, typed events and return an unsubscribe function. Listener registration must not permit arbitrary channel names.

## Configuration architecture

Configuration is resolved once near startup and passed as an immutable object:

```ts
interface AppConfig {
  content: {
    initialUrl: string;
    allowedOrigins: readonly string[];
  };
  development: {
    enableDevTools: boolean;
    allowArbitraryNavigation: boolean;
  };
}
```

The final type may add explicit authentication origins, session policy, or logging controls. All environment-derived values are parsed and validated at the boundary. The current environment variable contract is documented in [`.env.example`](../.env.example). Arbitrary modules do not read `process.env` directly.

Production configuration must reject missing or invalid URLs and insecure origins unless an intentional, documented exception exists. Test mode uses deterministic local fixture origins. Development relaxations must be individually enabled rather than inferred from an ambiguous flag.

## Intended source layout

```text
src/
├── main/
│   ├── app/          lifecycle and single-instance policy
│   ├── window/       window, view, bounds, and presentation
│   ├── navigation/   URL classification and popup policy
│   ├── security/     permissions, sessions, CSP, and validation
│   ├── shortcuts/    application-scoped shortcuts
│   └── ipc/          channel registration and handlers
├── preload/          narrow local-shell bridge
├── renderer/         locally bundled React shell
└── shared/           serializable types and pure contracts
```

Tests mirror ownership rather than reaching through private modules. The main entry point composes subsystems; it does not implement all of them.

## GPU and performance constraints

- Hardware acceleration remains enabled under normal conditions.
- The shell does not proxy or repaint remote frames into a canvas.
- The content view retains direct Chromium rendering.
- Undocumented GPU flags and insecure WebGPU switches are prohibited without a measured, documented need.
- Shell idle work is event-driven, with no polling or continuous React render loop.
- Bounds updates are deduplicated and frame-coalesced.
- Background throttling changes require a reproducible test demonstrating the need.
- GPU diagnostics reveal versions, OS, architecture, feature status, capability, and scale factor, but no private page data.

## Architectural invariants

The following are non-negotiable unless `SPEC.md` is deliberately revised:

1. The local shell remains the primary `BrowserWindow` renderer.
2. Remote content lives in `WebContentsView`, not `<webview>`.
3. Shell and remote content do not share privileged APIs.
4. Native capabilities are owned by the main process.
5. IPC and configuration are typed and runtime validated.
6. Navigation, popups, permissions, and downloads deny by default.
7. The app creates one content view and one primary window for version 1.
8. Maximize and fullscreen are distinct states.
9. The shell remains available when remote content fails or crashes.
10. No implementation choice may turn the product into a general-purpose browser.
