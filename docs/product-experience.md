# Product Experience

Moyu is a quiet desktop shell for one self-authored web page. It should feel
like opening a focused local tool, not like using a full browser.

## Product promise

The project values a short path from URL to visible page. It intentionally
supports local HTTP pages, LAN pages, mixed content, cross-origin resources,
popups, downloads, media, geolocation, and other Electron web capabilities.

The page must be made by the user or trusted by the user. The application does
not provide a safe browsing experience and does not promise to contain a
malicious page.

## Primary workspace

The main window is frameless and canvas-first. Its client area starts at the
top edge and contains a single `.content-host` with transient
loading/error/empty overlays. It does not show a persistent drag strip,
titlebar-like decoration, address bar, tabs, browser history, bookmarks, or
custom window buttons.

The remote page fills the content host. Its native `WebContentsView` bounds
match the host rectangle, including on high-DPI displays and after resizing.

## Whole-window dragging

The main workspace has a customizable hold-to-drag shortcut. Its default is
`⌘⇧Space` on macOS and `Ctrl+Shift+Space` on Windows/Linux. The command is
workspace-scoped and is not shown in the command palette.

While the shortcut is held, pressing and dragging the left mouse button
anywhere in the workspace moves the frameless window. The gesture is consumed
by the native window drag while the shortcut is held. Releasing the complete
shortcut restores normal page clicking, text selection, and scrolling. Settings
does not enter this mode and remains a normal form window.

The drag styling is temporary. It is removed on shortcut release or window
focus loss and is reapplied to the remote document and its child frames after a
reload, navigation, or content-view replacement.

## Startup and workspace URL

`APP_CONTENT_URL` can provide the first workspace URL. If it is absent or
empty, the shell shows `.empty-workspace`, opens Settings, and focuses the URL
field.

Settings accepts any URL that the platform URL parser accepts. This includes
HTTP, HTTPS, local and LAN addresses, credentials, different ports, and other
Electron-loadable forms. The UI does not promise that every parsed URL has a
running server; an actual load error is shown through the normal error state.

After Save, Settings stays open while the workspace creates or replaces its
content view and starts loading. The empty state disappears when the content is
ready.

## Presentation and keyboard commands

The existing command registry provides reload, hard reload, zoom, fullscreen,
Settings, command palette, diagnostics, and window presentation actions. These
commands remain application features and are independent of the remote page's
Node/Electron capabilities. The window-drag command is the one held-mode
exception and is handled only by the main process.

## Settings window

Settings is a separate local, modeless, frameless window. It is single-instance,
keyboard-operable, and remains visible after saving a workspace URL. Shortcut
editing and conflict feedback continue to use the existing typed Settings IPC
contract. Settings has no persistent top drag strip and never responds to the
workspace window-drag shortcut.

## Loading and recovery

The shell shows a loading overlay while a content generation loads. Electron
load failures produce the existing error overlay, and reload commands retry the
target. Renderer crashes show a recovery state and can be reloaded without
closing the shell.

These states describe page lifecycle. They are not warnings that the page has
been blocked by a security policy.

## Accessibility and acceptance

The shell and Settings UI remain keyboard-accessible with semantic labels,
focus management, and readable error text. Acceptance checks should confirm the
page is visible, the content host and native view have matching bounds, and the
Settings window remains open after first-run configuration.
