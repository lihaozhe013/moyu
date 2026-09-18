# Professional Canvas Desktop App

## Product and runtime specification

This project is an experimental and temporary self-authored-web runtime. It is
not a security browser, a safe browsing tool, or a general-purpose browser.
The product optimizes for simple operation and compatibility with pages made by
the project user. The user is responsible for loading only pages they made or
trust.

The requirements below describe the intentional unrestricted content model.
They replace older requirements that treated the remote page as hostile or
required a production origin allowlist.

## 1. Product shape

The application MUST:

- show one configured web workspace in a frameless desktop shell;
- provide a separate local Settings window for the workspace URL and shortcut
  bindings;
- start both local windows at the top of their client areas without a
  persistent drag strip or titlebar-like decoration;
- keep the shell keyboard-first and free of a persistent browser address bar,
  tabs, history, bookmarks, or extension UI;
- support loading, error, reload, crash recovery, zoom, fullscreen, and
  high-DPI bounds updates; and
- keep the existing typed `DesktopAPI` and Settings IPC contracts.

The application MUST NOT claim to protect users from the loaded page. A page
with access to the remote content renderer is intentionally privileged.

## 2. Remote content contract

Every workspace `WebContentsView` MUST use this content configuration:

```text
sandbox: false
webSecurity: false
allowRunningInsecureContent: true
nodeIntegration: true
contextIsolation: false
preload: none
```

The content session MUST accept certificate verification results. The content
runtime MUST permit mixed content, insecure HTTP resources, cross-origin
requests, LAN pages, different ports, and normal Electron-loadable URL forms.

Popups MUST be allowed and MUST receive the same WebContents configuration and
content session. The application MUST NOT use a popup allowlist.

Permission checks and permission requests for the content session MUST be
allowed. The application MUST NOT use a permission allowlist or deny a request
because of its origin.

Downloads MUST use Electron's default behavior. The application MUST NOT
intercept a download and call `preventDefault()`.

The content page MAY use Node and Electron renderer capabilities available from
the configuration above. No remote preload is needed to provide those
capabilities.

## 3. Navigation and URL contract

The application MUST allow navigation and redirects across origins, schemes,
hosts, ports, HTTP/HTTPS protocols, and LAN addresses whenever Electron can
load the target URL.

The application MUST NOT add:

- origin, authentication-origin, or host allowlists;
- production-only HTTPS requirements;
- arbitrary-navigation switches;
- URL-credential rejection;
- popup or download policy branches; or
- application-level navigation rejection for a target Electron can parse.

URL validation is limited to the platform URL parser at configuration and
Settings boundaries. An actual load failure is handled by Electron and the
existing content error state; it is not converted into an origin-policy
decision.

`APP_CONTENT_URL` remains the initial URL source. A persisted workspace URL
continues to load through the same `withWorkspaceUrl` path as before.

## 4. Development and release parity

Development, test, and packaged/release modes MUST use the same remote content
preferences, session behavior, navigation behavior, popup behavior, permission
behavior, certificate behavior, and download behavior.

The renderer source may come from Vite/HMR in development and bundled files in a
release build. That source-delivery difference MUST NOT create a second remote
page policy.

`APP_ENABLE_DEVTOOLS` may still control local development tooling. It does not
change the remote content policy.

## 5. First-run and window behavior

When no initial URL exists, the shell MUST be able to render its empty state
and open Settings. The shell renderer can report `.content-host` bounds before
the content view exists. The main process MUST retain the latest bounds and
apply them immediately after creating the first `WebContentsView`.

After a successful Settings save:

- Settings MUST remain open;
- the workspace MUST replace or create its content view immediately;
- the saved URL MUST be loaded; and
- the native view width and height MUST match the shell content host.

Resizing, reload, and changing the URL a second time MUST preserve that
alignment behavior.

The command registry MUST define a customizable `window.drag` command with a
`hold` activation and `workspace` scope. Its default binding MUST be
`Cmd+Shift+Space` on macOS and `Ctrl+Shift+Space` on Windows/Linux. The
command MUST be excluded from the command palette because it is a held mode,
not a one-shot command.

While the configured `window.drag` binding is held in the main workspace, a
left-button press and drag anywhere in the window MUST move the frameless
window. The temporary drag mode MUST apply to the local shell and every loaded
frame of the remote workspace, including after reload, navigation, or content
view replacement. Releasing the binding MUST immediately remove the temporary
drag mode so page clicking, text selection, and scrolling work normally again.
The mode MUST also clear when the window loses focus, the content view is
replaced, or the window is destroyed.

The same binding MUST have no effect in Settings. The implementation MUST NOT
use `setIgnoreMouseEvents` for this behavior, because that would break normal
page input and scrolling outside the temporary drag mode.

The application MUST remove its registered application menu. The macOS system
menu bar and Apple menu remain operating-system behavior and are outside this
window-level contract.

## 6. Local shell and IPC

The local shell and Settings renderer remain bundled application surfaces. They
use the existing capability-specific preload APIs and typed IPC so that the
application can keep its command and preference interfaces stable. This local
implementation detail MUST NOT be reused as a restriction on the remote page.

IPC handlers MUST preserve the existing sender and payload contracts, and
`DesktopAPI` MUST remain unchanged unless a separate product change requests
it.

## 7. Documentation and change protocol

Repository-facing documentation, comments, and commit messages MUST be in
English and commits MUST use Conventional Commits.

Changes to content behavior MUST update the focused tests and the documents in
`docs/`. Do not add defensive fallbacks, origin lists, security strategy
branches, or application interceptors to this project unless the product
decision changes first.

## 8. Verification

The standard acceptance commands are:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm dev
```

Tests MUST cover parseable HTTP/HTTPS/LAN/cross-origin URLs, redirects, URL
credentials, popup creation, permission requests, default downloads, the
first-run bounds path, and matching test/production content behavior.
