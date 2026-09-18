# Security Scope and Limitations

This document is intentionally a limitation statement. Moyu is not a security
browser. It is an experimental runtime for self-authored or explicitly trusted
pages, and usability/compatibility take priority over remote-page isolation.

## Product security position

The remote content renderer is deliberately privileged. A loaded page can use
the Node/Electron renderer capabilities enabled by its WebPreferences, make
cross-origin and mixed-content requests, open popups, request permissions,
accept certificates through the session, and start downloads.

Do not load a page that should be treated as hostile. The application does not
attempt to protect the user from data theft, arbitrary code execution, unsafe
downloads, phishing, tracking, or page compromise.

## Remote WebPreferences

Workspace and popup views use the same settings:

```text
nodeIntegration: true
contextIsolation: false
sandbox: false
webSecurity: false
allowRunningInsecureContent: true
preload: none
```

The content session accepts certificate verification results. These settings
are used in development, test, and packaged/release modes.

## Navigation, permissions, popups, and downloads

There is no application origin allowlist, authentication-origin list,
production HTTPS rule, arbitrary-navigation switch, URL credential rejection,
popup allowlist, permission allowlist, or download policy.

The content view observes navigation only to keep loading status accurate. It
does not call `preventDefault()` for a parseable URL or redirect. Electron's
own load errors continue to drive the shell error state.

The content session returns `true` for permission checks and requests. The
window-open handler allows popups and supplies the same content preferences.
No `will-download` handler is installed, so Electron's normal download
behavior is retained.

## Local application surfaces

The local shell and Settings window still use their existing bundled renderer,
preload, and typed IPC structure. That keeps the application's own command and
preference UI working; it is not a promise that remote content is isolated from
the system.

`DesktopAPI` and Settings IPC remain unchanged. Remote content does not need
those bridges because Node/Electron renderer access is intentionally enabled
directly in its view.

## Logging

The application should continue to avoid logging page bodies, cookies, tokens,
or arbitrary private page text. This is an operational hygiene preference, not
a claim that the runtime provides a security boundary. Logs can describe load
errors, renderer lifecycle, and session events needed to debug self-authored
pages.

## Change rule

Do not add defensive origin checks, permission denials, popup denials, download
interceptors, HTTPS-only branches, or fallback security strategies. A change to
this position requires an explicit product decision, updated specification, and
updated tests and documentation.
