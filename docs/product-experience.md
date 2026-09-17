# Product Experience

This document translates the normative requirements in [`../SPEC.md`](../SPEC.md) into a visible and testable desktop experience. It does not replace the specification.

## Product promise

The application presents one trusted web workspace inside a purpose-built desktop shell. A user should perceive a professional creative tool: compact, stable, canvas-first, and native enough to each supported operating system. Browser implementation details must remain invisible during normal use.

## Experience principles

1. **Workspace first.** The content surface receives the majority of the window while desktop controls remain compact.
2. **No browser leakage.** There is no address bar, tab strip, navigation chrome, download shelf, generic Electron menu, default error page, or uncontrolled popup.
3. **Predictable native behavior.** Resize, maximize, restore, fullscreen, dragging, window controls, and platform shortcuts follow Windows and macOS expectations.
4. **Visible recovery.** Loading, unavailable content, unresponsiveness, and renderer crashes are represented by local shell UI with clear recovery actions.
5. **Restricted power.** Developer functions and arbitrary locations are hidden and unavailable by default in production.
6. **Dense, accessible controls.** Compact UI does not remove semantics, keyboard access, focus visibility, or readable contrast.

## Workspace anatomy

The initial layout uses these dimensions as adjustable design tokens:

| Region          |          Initial size | Owner             | Purpose                                       |
| --------------- | --------------------: | ----------------- | --------------------------------------------- |
| Title bar       |            32 px high | Local shell       | Dragging, branding, window controls           |
| Menu or toolbar |            36 px high | Local shell       | Application actions, never browser navigation |
| Left tool rail  |            48 px wide | Local shell       | Workspace tools                               |
| Content surface | Remaining center area | `WebContentsView` | Trusted web application                       |
| Right inspector |           280 px wide | Local shell       | Contextual application controls               |
| Status bar      |            24 px high | Local shell       | State, zoom, and concise status               |

These values must be CSS variables rather than duplicated constants. Panels may become resizable, but any change must be reflected precisely in the native content-view bounds.

The visual language is a dark neutral workstation: restrained contrast, thin separators, compact system typography, small radii, and clear active states. Large rounded cards, decorative gradients, glass effects, and consumer-dashboard styling are out of scope.

## Startup and loading

The user-visible sequence is:

1. The native window is created hidden with a dark background.
2. The locally bundled shell loads.
3. The window appears with a complete workspace skeleton.
4. The remote content begins loading inside its assigned rectangle.
5. A local loading overlay covers the content region.
6. The overlay fades only after the content is ready.

At no point may the user see a white Chromium window, `about:blank`, a Vite development flash, unstyled shell markup, or the remote page before the shell.

## Window presentation

The three presentation states are distinct:

| State      | OS chrome                                | Application shell | Expected behavior                                  |
| ---------- | ---------------------------------------- | ----------------- | -------------------------------------------------- |
| Windowed   | Present or custom-integrated             | Visible           | Resizable, constrained by the minimum size         |
| Maximized  | Platform maximized                       | Visible           | Default large-workspace experience                 |
| Fullscreen | Removed using native Electron fullscreen | Visible           | Restores the previous non-fullscreen state on exit |

Maximize and fullscreen must never be represented by the same internal flag. Moving between displays, changing scale factors, or leaving fullscreen must preserve a correctly aligned content surface.

### Windows behavior

- Use a frameless or custom-titlebar window with minimize, maximize/restore, and close controls.
- Double-clicking a draggable title-bar region toggles maximize/restore.
- Resizing remains discoverable and usable around the frame.
- F11 toggles fullscreen.

### macOS behavior

- Prefer `hidden` or `hiddenInset` title-bar integration and native traffic lights.
- Reserve space for the traffic lights and respect native fullscreen transitions.
- Use Command-based shortcuts and retain an appropriate native application menu.
- Avoid rendering Windows-style window controls on macOS unless native integration is proven impossible.

## Command palette

The command palette is hidden until the user presses Ctrl+Shift+L on Windows/Linux or Cmd+Shift+L on macOS. Escape closes it before affecting other UI.

Recognized aliases are intentionally limited and environment-gated:

| Command     | Result                                                       | Availability            |
| ----------- | ------------------------------------------------------------ | ----------------------- |
| `workspace` | Return to the configured workspace location if policy allows | All modes               |
| `reload`    | Reload the content surface                                   | All modes               |
| `about`     | Show application information                                 | All modes               |
| `gpu`       | Show non-sensitive GPU diagnostics through internal UI       | Internal/developer mode |
| `devtools`  | Open approved developer tools                                | Development mode only   |

`open https://...` is also a development-only capability. Free-form URL entry must not become a production browser feature.

## Keyboard behavior

| Shortcut         | Action                              | Availability                                        |
| ---------------- | ----------------------------------- | --------------------------------------------------- |
| Ctrl/Cmd+Shift+L | Open command palette                | All modes                                           |
| Ctrl/Cmd+R       | Reload content                      | All modes                                           |
| Ctrl/Cmd+Shift+R | Hard reload content                 | All modes                                           |
| F11              | Toggle fullscreen                   | Windows/Linux; native macOS behavior also supported |
| Escape           | Close the foremost palette or modal | All modes                                           |
| Ctrl/Cmd+0       | Reset content zoom to 100%          | All modes                                           |
| Ctrl/Cmd++       | Increase content zoom               | All modes                                           |
| Ctrl/Cmd+-       | Decrease content zoom               | All modes                                           |
| Ctrl/Cmd+Shift+I | Open content DevTools               | Development mode only                               |

Shortcuts are application-scoped. They must not be registered globally when their action only applies while the app is active.

## Zoom

Content zoom begins at 100%, stays within 50%–200%, and uses controlled steps: 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, and 200%. The local shell remains at a fixed zoom in version 1. No Chromium zoom UI is exposed.

## Failure and recovery

The shell owns all final error experiences.

| Condition                  | Required shell response                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Remote load fails          | Show “Unable to load workspace,” a Retry action, and a sanitized error code                |
| Content renderer exits     | Show “Workspace stopped unexpectedly” and a Reload workspace action                        |
| Content is unresponsive    | Show local status or recovery UI without freezing the shell                                |
| Content becomes responsive | Clear transient unresponsive state                                                         |
| Navigation is denied       | Keep the current workspace; optionally show a concise policy message                       |
| Popup is requested         | Deny it unless an explicit policy case exists; never create an uncontrolled browser window |

Chromium's default network, crash, or error pages cannot be the final user-facing state.

## Menus and contextual UI

Windows production builds remove the conventional application menu unless an application requirement is added. macOS retains a native application menu with About, Hide, Hide Others, Quit, basic Edit actions, and basic Window actions.

The remote surface has no browser-style context menu by default. A future application-specific menu may be added. “Inspect Element” is allowed only in development mode.

## Accessibility

- Interactive controls use native semantic elements whenever possible.
- Every icon-only control has an accessible name.
- All shell actions are keyboard reachable.
- Focus indicators remain visible or are replaced with an equally clear treatment.
- Drag regions exclude buttons, inputs, links, and elements with button roles.
- Text and state indicators maintain reasonable contrast in the dark theme.
- Loading and error state changes are announced appropriately without creating repetitive announcements.

## UX acceptance checklist

- The app is recognizable as a focused desktop workspace rather than a browser.
- Shell layout remains coherent at the 1100×700 minimum window size.
- No white or unstyled frame appears during startup.
- The content surface never covers shell controls and has no visible gap at supported scale factors.
- Window dragging and interactive title-bar controls do not conflict.
- Maximize, restore, and fullscreen transitions preserve layout and state.
- Production mode exposes no DevTools shortcut, free-form location input, browser context menu, or generic menu.
- All loading, load-failure, crash, and retry states are rendered by the local shell.
- Controls meet the keyboard, naming, focus, and contrast requirements above.
