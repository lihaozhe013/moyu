# Professional Canvas Desktop App

## Implementation Specification for Coding Agent

Version: 1.0
Target: Windows 11 + macOS
Primary architecture: Electron desktop application with a local application shell and isolated WebContentsView content surface.

---

# 1. Mission

Build a production-quality cross-platform Electron desktop application whose visible UI resembles a modern professional creative application rather than a conventional web browser.

The application must:

* have no permanent browser address bar;
* have no browser tabs;
* have no browser navigation chrome;
* have no visible Electron branding;
* use a frameless/custom-titlebar desktop window;
* support fullscreen and maximized professional-workspace modes;
* load one predefined web application/page into an isolated content surface;
* optionally expose a hidden developer/location command through a keyboard shortcut;
* visually integrate the web content with the surrounding desktop UI;
* be suitable for future GPU-intensive WebGL2/WebGPU/Three.js workloads;
* work well on Windows and macOS, including Apple Silicon Macs;
* use a modern TypeScript/ESNext codebase;
* prioritize runtime isolation and security.

This application is NOT intended to become a general-purpose browser.

Do not implement browser tabs, bookmarks, browser history UI, extension support, omnibox behavior, or arbitrary-browser functionality unless explicitly requested later.

---

# 2. Technology Stack

Use:

* Electron: latest stable release
* TypeScript: 7.x latest stable
* Vite: latest Vite 8.x release compatible with the selected electron-vite version
* electron-vite: latest 6.x beta/prerelease supporting Vite 8
* ECMAScript target: ESNext
* package manager: pnpm
* Node runtime: version bundled/required by current Electron/electron-vite tooling
* CSS: plain modern CSS
* renderer UI: React latest stable
* state management: React built-ins initially; do not add Redux/Zustand unless justified
* test framework: Vitest
* E2E: Playwright
* linting: ESLint latest compatible release
* formatting: Prettier
* package/build distribution: electron-builder unless electron-vite's current recommended packaging integration materially favors another maintained solution

At initial bootstrap, resolve actual package versions instead of relying on this document's date.

Run:

```bash
pnpm view electron version
pnpm view typescript version
pnpm view vite@8 version
pnpm view electron-vite@beta version
```

Use the newest mutually compatible versions.

After successful bootstrap, pin exact dependency versions in `package.json` / lockfile for reproducible builds.

Do NOT blindly upgrade dependencies after the project has bootstrapped successfully.

---

# 3. Runtime Architecture

Use three distinct trust domains:

```text
Electron main process
        │
        ├── Local Shell Renderer
        │     └── React UI
        │
        └── Remote/Content WebContentsView
              └── predefined trusted webpage
```

The local shell renderer and content page MUST NOT share privileges.

## 3.1 Main Process

Responsible for:

* application lifecycle;
* native window creation;
* WebContentsView creation;
* content navigation policy;
* keyboard shortcuts requiring native behavior;
* fullscreen/maximize state;
* permissions;
* native menus;
* download policy;
* popup policy;
* session policy;
* security controls;
* IPC validation;
* dev/prod environment behavior;
* app shutdown;
* GPU diagnostics hooks;
* crash handling.

## 3.2 Local Shell Renderer

Responsible for visible application chrome:

* custom titlebar;
* menu bar;
* optional toolbar;
* left tool rail;
* right inspector rail;
* bottom status bar;
* loading overlay;
* content-error overlay;
* command palette;
* modal UI;
* application branding;
* workspace background.

It MUST be bundled locally with the application.

Never serve the shell UI from the Internet.

## 3.3 Content Surface

Use:

```ts
WebContentsView
```

for the main web content.

Do NOT use:

```html
<webview>
```

unless a future technical limitation makes `WebContentsView` impossible.

Do NOT make the remote webpage the BrowserWindow's primary renderer.

The local renderer must always remain the primary app UI.

Conceptually:

```text
BrowserWindow
┌──────────────────────────────────────────────┐
│ Local renderer: titlebar                     │
├───────┬───────────────────────────┬──────────┤
│ Local │                           │ Local    │
│ Tools │     WebContentsView       │ Inspector│
│       │                           │          │
│       │                           │          │
├───────┴───────────────────────────┴──────────┤
│ Local renderer: status bar                   │
└──────────────────────────────────────────────┘
```

The WebContentsView is positioned only over the canvas/content rectangle.

---

# 4. Repository Structure

Use approximately:

```text
/
├── build/
│   ├── icon.icns
│   ├── icon.ico
│   └── icon.png
│
├── resources/
│
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── app/
│   │   │   ├── lifecycle.ts
│   │   │   └── single-instance.ts
│   │   │
│   │   ├── window/
│   │   │   ├── create-main-window.ts
│   │   │   ├── window-state.ts
│   │   │   ├── content-view.ts
│   │   │   ├── content-layout.ts
│   │   │   └── fullscreen.ts
│   │   │
│   │   ├── navigation/
│   │   │   ├── navigation-policy.ts
│   │   │   ├── popup-policy.ts
│   │   │   └── allowed-origins.ts
│   │   │
│   │   ├── security/
│   │   │   ├── permissions.ts
│   │   │   ├── session.ts
│   │   │   ├── csp.ts
│   │   │   └── ipc-validation.ts
│   │   │
│   │   ├── shortcuts/
│   │   │   └── shortcuts.ts
│   │   │
│   │   └── ipc/
│   │       ├── channels.ts
│   │       └── handlers.ts
│   │
│   ├── preload/
│   │   ├── index.ts
│   │   └── api.ts
│   │
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── TitleBar/
│   │       │   ├── MenuBar/
│   │       │   ├── ToolRail/
│   │       │   ├── Inspector/
│   │       │   ├── StatusBar/
│   │       │   ├── CommandPalette/
│   │       │   ├── LoadingOverlay/
│   │       │   └── ErrorOverlay/
│   │       │
│   │       ├── hooks/
│   │       ├── state/
│   │       ├── styles/
│   │       │   ├── reset.css
│   │       │   ├── tokens.css
│   │       │   └── app.css
│   │       └── types/
│   │
│   └── shared/
│       ├── ipc.ts
│       ├── geometry.ts
│       └── types.ts
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── electron.vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
└── README.md
```

Keep module boundaries clean.

Do not create a giant `main.ts`.

---

# 5. TypeScript Requirements

TypeScript must run in maximum practical strictness.

Use:

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

Adjust module resolution separately for renderer/main if required by current electron-vite/TypeScript 7 behavior.

Rules:

* no `any` unless accompanied by a code comment explaining why;
* prefer `unknown` at trust boundaries;
* IPC payloads must have explicit types;
* IPC payloads must also be runtime validated;
* avoid TypeScript enums;
* use discriminated unions and `as const`;
* prefer immutable structures where practical;
* do not use CommonJS unless a dependency absolutely requires it;
* project source should be ESM-first.

---

# 6. BrowserWindow

Create one primary BrowserWindow.

Minimum target:

```ts
const mainWindow = new BrowserWindow({
  width: 1600,
  height: 1000,
  minWidth: 1100,
  minHeight: 700,
  show: false,
  backgroundColor: '#181818',

  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
});
```

Actual options may vary by OS.

Do not show the window until the local shell is ready enough to avoid white flashes.

Use:

```ts
show: false
```

and show after appropriate readiness.

The startup sequence must never visibly display:

* white Chromium window;
* about:blank;
* Vite dev page flash;
* unstyled HTML;
* remote page before the shell.

---

# 7. Window Chrome

The application must look like a professional desktop application.

It must not look like Chrome, Edge, Safari, Firefox, or a generic Electron demo.

Do NOT copy Adobe trademarks, application names, proprietary icons, or exact copyrighted product assets.

Aesthetic target:

* high-density professional creative software;
* dark neutral workspace;
* restrained contrast;
* compact typography;
* thin separators;
* docked panels;
* canvas-first composition.

## Windows

Use frameless/custom titlebar behavior.

Window controls may be custom rendered.

Support:

* minimize;
* maximize/restore;
* close;
* double-click titlebar maximize/restore;
* titlebar dragging.

## macOS

Prefer native-feeling full-size content/titlebar behavior.

Evaluate:

```ts
titleBarStyle: 'hidden'
```

or:

```ts
titleBarStyle: 'hiddenInset'
```

before using fully custom fake traffic-light buttons.

Preserve native traffic-light behavior where possible.

The shell must reserve correct space for macOS window controls.

Do not make macOS feel like a Windows app pasted onto macOS.

---

# 8. Window Modes

Implement three modes.

## 8.1 Normal

Resizable desktop window.

## 8.2 Workspace Maximized

Maximized window with application UI still visible.

This should be the normal “professional application” experience.

## 8.3 True Fullscreen

Use native Electron fullscreen.

Shortcut:

```text
F11
```

on Windows/Linux.

On macOS additionally support the native expected fullscreen behavior.

Fullscreen must:

* remove OS chrome;
* preserve application shell;
* preserve WebContentsView;
* resize correctly;
* restore previous window state correctly.

Never confuse maximize and fullscreen internally.

Represent explicitly:

```ts
type WindowPresentation =
  | 'windowed'
  | 'maximized'
  | 'fullscreen';
```

---

# 9. Shell Layout

Initial dimensions:

```text
title bar:       32px
menu/toolbar:    36px
left rail:       48px
right panel:     280px
status bar:      24px
```

These are starting values, not immutable constants.

Use CSS variables:

```css
:root {
  --titlebar-height: 32px;
  --toolbar-height: 36px;
  --toolrail-width: 48px;
  --inspector-width: 280px;
  --statusbar-height: 24px;
}
```

The main content rectangle must be calculated from these dimensions.

Renderer reports content bounds to main.

Example contract:

```ts
interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}
```

The main process owns the final `WebContentsView.setBounds()` call.

Do not let the remote page manipulate its native bounds.

---

# 10. WebContentsView

Create exactly one content WebContentsView for v1.

Example conceptual setup:

```ts
const contentView = new WebContentsView({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true
  }
});

mainWindow.contentView.addChildView(contentView);
```

Load predefined content:

```ts
await contentView.webContents.loadURL(APP_CONTENT_URL);
```

The content URL must live in one configuration module.

Example:

```ts
export const contentConfig = {
  initialUrl: 'https://example.com/workspace',
  allowedOrigins: [
    'https://example.com'
  ]
} as const;
```

Do not scatter URLs throughout the source tree.

---

# 11. Navigation Policy

This is NOT a general browser.

Default navigation policy:

1. initial predefined URL allowed;
2. same trusted application origin allowed;
3. explicitly configured authentication origins may be allowed;
4. arbitrary external navigation denied;
5. popup creation denied by default;
6. `javascript:` URLs denied;
7. `file:` navigation denied for remote content;
8. unexpected custom protocols denied.

Create:

```ts
function isNavigationAllowed(url: URL): boolean
```

and centralize all policy there.

Use:

```ts
webContents.on('will-navigate', ...)
```

and:

```ts
webContents.setWindowOpenHandler(...)
```

All popup decisions go through explicit policy.

Default:

```ts
{ action: 'deny' }
```

If a trusted application requires a popup internally, implement a deliberate case rather than globally enabling popups.

---

# 12. Hidden Location / Command Palette

There must be NO visible permanent address bar.

Implement a command palette opened with:

```text
Ctrl+Shift+L
```

Windows/Linux and:

```text
Cmd+Shift+L
```

macOS.

Palette design:

```text
┌───────────────────────────────────────────────┐
│ Open location or command                     │
│ >                                             │
└───────────────────────────────────────────────┘
```

Default release behavior:

* only allow predefined aliases/commands;
* arbitrary URL entry disabled unless developer mode is enabled.

Examples:

```text
workspace
reload
devtools
gpu
about
```

Optional developer-only syntax:

```text
open https://...
```

Arbitrary URLs must never silently become production browser functionality.

Developer mode can be enabled by environment/configuration.

---

# 13. Keyboard Shortcuts

Implement at least:

```text
Ctrl/Cmd + Shift + L
    open command palette

Ctrl/Cmd + R
    reload content page

Ctrl/Cmd + Shift + R
    hard reload content page

F11
    toggle fullscreen

Escape
    close command palette / modal first

Ctrl/Cmd + 0
    reset content zoom

Ctrl/Cmd + +
    zoom in

Ctrl/Cmd + -
    zoom out
```

Development only:

```text
Ctrl/Cmd + Shift + I
    open content DevTools
```

Production default:

DevTools shortcut disabled unless developer mode is enabled.

Prefer application-scoped shortcuts via renderer/main keyboard events.

Do not use `globalShortcut` for shortcuts that should only function while this app is active.

---

# 14. Preload and IPC

Expose a very small API.

Example:

```ts
interface DesktopAPI {
  window: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    toggleFullscreen(): Promise<void>;
    getState(): Promise<WindowState>;
  };

  content: {
    reload(): Promise<void>;
    hardReload(): Promise<void>;
    setZoomFactor(factor: number): Promise<void>;
    getState(): Promise<ContentState>;
  };

  layout: {
    setContentBounds(bounds: ContentBounds): Promise<void>;
  };
}
```

Expose via:

```ts
contextBridge.exposeInMainWorld(...)
```

Never expose:

```ts
ipcRenderer
require
process
fs
child_process
shell
```

directly to the renderer.

Every IPC handler must:

* use a known channel;
* validate sender;
* validate input;
* return typed output;
* avoid arbitrary command execution.

---

# 15. Content Security

For remote content:

```ts
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
allowRunningInsecureContent: false
```

Do not enable experimental Chromium features globally merely to fix one website.

Do not disable CORS/web security.

Do not inject privileged preload APIs into the remote content page unless explicitly required later.

Prefer the remote content WebContentsView to have no preload script at all.

Shell and remote content must use separate security assumptions.

---

# 16. Permission Policy

Implement:

```ts
session.setPermissionRequestHandler(...)
```

Default deny.

Explicitly evaluate only known required permissions.

Example supported future permissions:

* clipboard-read;
* clipboard-write;
* notifications;
* media;
* fullscreen.

Camera/microphone must remain denied unless the application explicitly gains such a feature.

Geolocation remains denied by default.

MIDI/HID/serial/USB/Bluetooth remain denied by default.

Do not simply:

```ts
callback(true)
```

for every permission.

---

# 17. Session Policy

Use a named persistent partition only if login/session persistence is required.

Example:

```ts
partition: 'persist:workspace'
```

Otherwise keep the architecture ready for it.

The content session must be explicitly obtainable from the WebContents.

Centralize:

* cookies;
* cache;
* permissions;
* downloads;
* proxy behavior;
* user agent overrides if ever needed.

Do not manipulate Electron's default session globally without a reason.

---

# 18. Downloads

Initial policy:

downloads disabled unless explicitly approved.

Intercept:

```ts
session.on('will-download', ...)
```

If downloads are unsupported:

```ts
event.preventDefault()
```

If downloads later become necessary, build an application-controlled download flow.

Never allow Chromium's default uncontrolled download behavior to become accidental UI.

---

# 19. Error Handling

Never show Chromium's default failure experience as the final user-facing UI.

Track:

```ts
did-start-loading
did-stop-loading
did-fail-load
render-process-gone
unresponsive
responsive
```

Shell state:

```ts
type ContentStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'ready' }
  | { type: 'error'; code: number; description: string }
  | { type: 'crashed' };
```

On load error:

show a local professional error overlay.

Example:

```text
Unable to load workspace

[ Retry ]

Error code: -105
```

Do not display a browser-style dinosaur/error page.

On renderer crash:

offer restart/reload of content WebContents.

---

# 20. Loading Experience

Startup sequence:

```text
App process starts
↓
BrowserWindow created hidden
↓
Local shell loads
↓
Window shown
↓
Workspace skeleton visible
↓
Content WebContentsView begins loading
↓
Loading overlay
↓
Content ready
↓
Loading overlay fades
```

No white flash.

No raw remote-page flash.

Background colors between:

* BrowserWindow;
* renderer;
* WebContentsView;

must be visually compatible.

---

# 21. UI Design Tokens

Start with approximately:

```css
:root {
  color-scheme: dark;

  --bg-app: #181818;
  --bg-panel: #202020;
  --bg-panel-raised: #292929;
  --bg-hover: #323232;
  --bg-active: #3a3a3a;

  --border-subtle: rgba(255, 255, 255, 0.08);

  --text-primary: rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.62);
  --text-disabled: rgba(255, 255, 255, 0.36);

  --radius-small: 4px;
}
```

These values may be tuned.

Do not introduce giant rounded cards, excessive gradients, glassmorphism, or consumer-dashboard styling.

This is a dense professional workstation UI.

---

# 22. Font Strategy

Use system UI fonts initially.

Windows:

```css
"Segoe UI Variable", "Segoe UI"
```

macOS:

```css
-apple-system, BlinkMacSystemFont
```

Avoid shipping proprietary fonts.

Use approximately 12–13px for dense application controls.

---

# 23. Drag Regions

The custom titlebar must use Electron drag regions correctly.

Example:

```css
.titlebar {
  app-region: drag;
}

.titlebar button,
.titlebar input,
.titlebar [role="button"] {
  app-region: no-drag;
}
```

Interactive controls inside draggable regions must always opt out.

Verify behavior on both Windows and macOS.

---

# 24. Content Bounds Synchronization

This is a critical subsystem.

The WebContentsView must exactly track the visual canvas rectangle.

Implement a renderer observer:

```ts
ResizeObserver
```

on the canvas host element.

Calculate:

```ts
element.getBoundingClientRect()
```

Send updates through IPC only when dimensions actually changed.

Throttle/coalesce layout updates to animation frames.

Do not send continuous redundant IPC calls.

Main:

```ts
contentView.setBounds({
  x: Math.round(bounds.x),
  y: Math.round(bounds.y),
  width: Math.round(bounds.width),
  height: Math.round(bounds.height)
});
```

Handle:

* normal resizing;
* maximize;
* restore;
* fullscreen;
* display scaling;
* Retina;
* panel resizing;
* macOS safe/titlebar region.

Test fractional DPI such as Windows 125% and 150%.

---

# 25. 3D / GPU Future-Proofing

Assume the content page may eventually run:

* Three.js;
* Babylon.js;
* WebGL2;
* WebGPU;
* WASM;
* Web Workers;
* OffscreenCanvas;
* HDR environments;
* large GLTF/GLB assets;
* PBR shaders;
* post-processing;
* video textures;
* animation;
* high-DPI rendering.

Do not disable Electron hardware acceleration.

Never call:

```ts
app.disableHardwareAcceleration();
```

under normal conditions.

Do not apply undocumented GPU command-line flags without a measured need.

Expose a developer diagnostics command:

```text
gpu
```

that can report useful non-sensitive diagnostics such as:

* Electron version;
* Chromium version;
* OS;
* architecture;
* GPU feature status;
* WebGPU/WebGL capability where available;
* device scale factor.

Make GPU diagnostics available only through internal/developer UI.

---

# 26. WebGPU

Do not force WebGPU through insecure experimental switches.

Use Chromium's supported behavior from the selected stable Electron.

The application should feature-detect:

```ts
if ('gpu' in navigator) {
  // WebGPU available
}
```

The content page must gracefully fall back to WebGL2 if its own architecture supports that.

Electron shell must make no assumption that WebGPU is always available.

---

# 27. Performance

Target:

* shell idle CPU near zero;
* smooth native resizing;
* 60 Hz UI interaction;
* no continuous React rerender loop;
* no resize IPC storm;
* no polling where events are available.

For 3D content:

do not intercept animation frames from the shell.

The WebContentsView should have direct Chromium rendering.

Do not render the remote content into a `<canvas>` screenshot and redisplay it.

---

# 28. Background Throttling

For the main 3D content surface, evaluate Chromium background throttling carefully.

If the window is visible and active, rendering must not be unexpectedly throttled.

Do not globally disable throttling unless a test demonstrates a problem.

If future multi-document support is introduced, inactive documents may be throttled deliberately.

---

# 29. macOS Requirements

Must support:

* Apple Silicon arm64;
* current supported macOS versions for the selected Electron release;
* Retina rendering;
* native fullscreen;
* native traffic lights or intentionally integrated equivalents;
* correct Cmd-based shortcuts;
* trackpad scrolling;
* pinch/zoom policy if used by content;
* native menu expectations where appropriate.

Build artifacts:

```text
arm64
x64
```

Optional future:

```text
universal
```

Do not assume x64-only development.

Architect the build config so universal binaries can be added later.

Signing/notarization configuration must be structurally supported even if developer certificates are unavailable during initial implementation.

---

# 30. Windows Requirements

Primary Windows target:

```text
Windows 11 x64
```

Optional arm64 build can remain future scope.

Must correctly handle:

* 100% scaling;
* 125% scaling;
* 150% scaling;
* 200% scaling;
* maximize/restore;
* multi-monitor;
* monitors with different scale factors;
* switching displays while running.

Frameless window resizing must remain usable.

---

# 31. Native Application Menu

Development build may expose debugging menu items.

Production build should not display a generic Electron menu bar.

On Windows:

remove conventional application menu unless explicitly needed.

On macOS:

retain a proper application menu because macOS users expect one.

Use native macOS menu items for:

* About;
* Hide;
* Hide Others;
* Quit;
* Edit basics;
* Window basics.

Do not expose arbitrary browser commands.

---

# 32. Context Menu

Remote content must not automatically expose a browser-like context menu.

Implement either:

1. no context menu;
2. minimal application-specific context menu.

Development mode may expose:

```text
Inspect Element
```

Production mode should not expose it by default.

---

# 33. Zoom

Maintain controlled content zoom.

Initial:

```ts
zoomFactor = 1
```

Allowed range:

```text
0.5 – 2.0
```

Suggested steps:

```text
50%
67%
75%
80%
90%
100%
110%
125%
150%
175%
200%
```

Persist zoom optionally.

Do not allow arbitrary Chromium zoom UI.

Shell zoom and content zoom are conceptually separate.

For v1, shell zoom remains fixed.

---

# 34. Configuration

Create typed configuration.

Example:

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

Development values may derive from environment variables.

Validate environment input.

Do not read `process.env` throughout arbitrary modules.

Resolve once into a configuration object.

---

# 35. Environment Modes

Support:

```text
development
production
test
```

Development:

* Vite dev server;
* HMR;
* DevTools allowed;
* verbose logging;
* arbitrary URL navigation optionally allowed.

Production:

* local packaged shell;
* DevTools disabled by default;
* restricted navigation;
* production logging;
* no localhost assumptions.

Tests:

* deterministic local fixture content where possible.

---

# 36. Logging

Implement a minimal logger abstraction.

Categories:

```text
app
window
content
navigation
security
gpu
ipc
```

Production must not log:

* cookies;
* auth tokens;
* request bodies;
* private user page data.

Errors should contain enough context for debugging without leaking secrets.

---

# 37. Single Instance

Use Electron single-instance lock.

If a second instance starts:

* focus existing window;
* restore if minimized;
* do not create a second independent application instance.

Unless future requirements explicitly require multiple instances.

---

# 38. Persistence

Persist only necessary desktop state initially:

```ts
interface PersistedWindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}
```

Validate restored coordinates against available displays.

If previous monitor no longer exists, center on primary display.

Do not restore fullscreen automatically unless explicitly configured.

---

# 39. Crash Behavior

Handle gracefully:

```text
renderer-process-crashed
content render-process-gone
GPU process problems where observable
```

Remote content crash must NOT crash the shell.

The shell should display:

```text
Workspace stopped unexpectedly.

[Reload workspace]
```

---

# 40. Screenshot Support

Provide an internal API capable of capturing the content surface:

```ts
contentView.webContents.capturePage()
```

Do not expose screenshot functionality to remote content.

Optional later:

capture whole application window.

Screenshot output must accurately reflect the content and professional shell depending on requested capture mode.

Design interfaces so both modes can eventually exist:

```ts
type CaptureTarget =
  | 'content'
  | 'window';
```

Actual whole-window capture can remain v1.1 if native implementation complicates v1.

---

# 41. No Browser Leakage

During normal operation the user must never accidentally see:

* URL bar;
* tab strip;
* Chromium menu;
* Chromium default download shelf;
* default browser new tab UI;
* about:blank;
* chrome:// URLs;
* default browser error page;
* uncontrolled popup windows;
* browser permission bubbles where Electron allows interception;
* generic Electron menu.

This is a hard acceptance criterion.

---

# 42. Accessibility

Custom controls must still be accessible.

Use semantic buttons.

Every icon-only control must have:

```html
aria-label
```

Support keyboard focus.

Do not suppress focus outlines without replacing them.

Maintain reasonable contrast.

---

# 43. Testing

Unit tests must cover:

* URL allowlist;
* navigation decisions;
* popup decisions;
* config validation;
* IPC payload validation;
* content-bound conversion;
* window-state transitions.

E2E must cover:

1. app launches;
2. shell becomes visible;
3. content view loads;
4. no standard browser chrome exists;
5. resize correctly repositions content;
6. maximize works;
7. fullscreen works;
8. restore works;
9. command palette opens;
10. disallowed navigation is blocked;
11. popup is denied;
12. reload works;
13. remote load failure produces custom UI;
14. content renderer crash recovery works where testable.

---

# 44. Test Fixture Page

Do not depend exclusively on the real production site for automated testing.

Create a local fixture server/page supporting:

```text
/
 /redirect-allowed
 /redirect-denied
 /popup
 /webgl
 /error
```

The `/webgl` fixture should render a simple rotating GPU scene or perform a basic WebGL capability check.

If practical, include a minimal WebGPU feature check.

---

# 45. CI

Create CI suitable for GitHub Actions, but keep provider-specific logic isolated.

CI stages:

```text
install
typecheck
lint
unit-test
build
e2e where platform permits
package
```

At minimum run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Do not hide warnings by redirecting stderr.

---

# 46. Scripts

Provide approximately:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "typecheck": "...",
    "lint": "...",
    "lint:fix": "...",
    "test": "...",
    "test:watch": "...",
    "test:e2e": "...",
    "package": "...",
    "package:win": "...",
    "package:mac": "..."
  }
}
```

Use current correct commands from installed tool versions.

Do not cargo-cult obsolete scripts from old Electron templates.

---

# 47. Dependency Policy

Keep runtime dependencies minimal.

Do not add libraries just because a template includes them.

Every dependency should have an identifiable reason.

Avoid:

* heavy component libraries;
* browser-router packages unless required;
* generic state-management packages;
* giant utility packages;
* old Electron helper libraries duplicating current Electron APIs.

For tiny utilities, write straightforward
