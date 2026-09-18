# Security Model

This document defines the initial threat model and security review criteria for the desktop shell. It complements [`../SPEC.md`](../SPEC.md), which remains authoritative.

## Security objectives

The application must:

- treat remote content as untrusted even when its origin is approved;
- prevent remote content from gaining Node.js, Electron, filesystem, process, or shell capabilities;
- prevent the local shell from becoming a generic bridge to privileged operations;
- constrain navigation and secondary-window creation to explicit application needs;
- deny permissions and downloads unless a reviewed feature requires them;
- keep secrets and private page data out of logs and diagnostics; and
- preserve a functioning local recovery surface if remote content fails or is compromised.

## Protected assets

| Asset                           | Security concern                                                              |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Local filesystem and OS account | Unauthorized read, write, execution, or disclosure                            |
| Electron main process           | Code execution or policy bypass through malformed IPC or navigation           |
| Authentication state            | Cookie, token, or session leakage across origins or logs                      |
| Trusted workspace data          | Exfiltration through unexpected navigation, popups, permissions, or downloads |
| Application configuration       | Origin allowlist or development controls being broadened at runtime           |
| User privacy                    | Logging page content, request bodies, credentials, or sensitive diagnostics   |
| Release artifacts               | Tampering, unsigned distribution, or dependency drift                         |

## Trust boundaries

```text
Higher trust
  Electron main process
          │ narrow, validated IPC
          ▼
  Local workspace renderer ── separate settings renderer
          │ capability-specific preload only
          ▼
  Remote content WebContentsView (no preload)
          │ network requests
          ▼
  Configured and authentication origins
Lower trust
```

An allowlisted origin is approved for navigation, not promoted to main-process trust. A compromised allowed page must still be contained by Chromium sandboxing, context isolation, and the absence of privileged preload APIs.

## Threats and required controls

| Threat                                                | Required controls                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Remote code invokes desktop APIs                      | No remote preload; `nodeIntegration: false`; `contextIsolation: true`; `sandbox: true`        |
| Shell compromise reaches arbitrary native APIs        | Minimal preload API; no generic IPC; sender validation; runtime payload validation            |
| Open redirect escapes the trusted site                | Evaluate every main-frame navigation and redirect against centralized policy                  |
| Popup creates a browser or phishing surface           | `setWindowOpenHandler` defaults to deny; no implicit popup inheritance                        |
| Dangerous URL scheme executes code or accesses files  | Reject `javascript:`, remote `file:`, and all unrecognized protocols                          |
| Permission prompt grants excessive capability         | Session permission request/check handlers default to deny and verify origin plus permission   |
| Drive-by download writes content locally              | Cancel `will-download` until an application-controlled flow is approved                       |
| Production debugging exposes internals                | DevTools, Inspect Element, arbitrary URLs, and verbose logs disabled by default               |
| Session data leaks between unrelated contexts         | Use the content view's explicit session; introduce a named partition only when required       |
| Malformed geometry or zoom payload abuses native APIs | Validate type, range, finiteness, sender, and current object lifecycle                        |
| Logs disclose credentials or private content          | Structured categories, sanitization, no cookies/tokens/request bodies/page data               |
| Content crash takes down the entire UI                | Separate shell renderer and content view; local recovery UI                                   |
| Dependency or build drift changes the attack surface  | Resolve compatible versions once, pin exact versions, commit frozen lockfile, review upgrades |

## Web preferences

### Local shell

The primary `BrowserWindow` renderer uses:

```text
contextIsolation = true
nodeIntegration = false
sandbox = true
```

It loads only packaged local shell resources in production. Its Content Security Policy must be compatible with Vite output without allowing unsafe remote script execution. Development-only allowances must not ship in the production policy.

### Remote content

The `WebContentsView` uses:

```text
nodeIntegration = false
contextIsolation = true
sandbox = true
webSecurity = true
allowRunningInsecureContent = false
```

It should have no preload. Do not disable CORS or web security, and do not add broad experimental command-line switches to accommodate a site.

## IPC policy

Every IPC path must satisfy all of these requirements:

1. Use a statically defined channel rather than a caller-provided channel string.
2. Confirm that the sender is the expected local shell main frame.
3. Reject calls from the remote content view, subframes, destroyed views, or unexpected URLs.
4. Parse payloads as `unknown` and validate them at runtime.
5. Enforce numeric ranges and reject `NaN`, infinity, oversized values, and malformed objects.
6. Return a typed result or a sanitized, stable error.
7. Avoid accepting paths, commands, executable code, or arbitrary URLs unless a future feature has a dedicated policy.
8. Remove listeners during teardown and avoid duplicate registration during development reloads.

The preload exposes named functions, not `ipcRenderer`, `send`, `invoke`, `on`, or Node/Electron modules.

Initial workspace capabilities are limited to window intent, content reload and
zoom, content state, validated bounds, known command summaries/dispatch,
overlay visibility, and non-sensitive GPU diagnostics. The settings preload is
separate and exposes only a snapshot read, validated preference save,
capture-mode state, close, and main-request events. Settings writes are always
performed by the main process after full validation and atomic persistence.

The remote content receives none of these bridges. In particular, a generic
`execute(command: string)` or generic settings patch channel is prohibited;
the command IPC accepts only a stable `CommandId` that the main registry knows.

Screenshot capture and diagnostics remain main-process-controlled internal capabilities. They must not be callable by remote content.

## Navigation and popup policy

URL checks operate on parsed `URL` objects and exact normalized origins. Substring, suffix-only, or regular-expression hostname checks that permit lookalike domains are prohibited.

The policy distinguishes:

- the configured initial application URL;
- same-origin application navigation;
- narrowly configured authentication origins and return paths;
- optional developer-only arbitrary navigation; and
- denied targets.

All unparseable URLs, unexpected schemes, unknown origins, and production arbitrary-location attempts are denied. User information embedded in a URL must not be logged.

Popup requests are denied even when their origin is otherwise navigation-allowed, unless a separate popup rule explicitly permits that exact use case. An allowed authentication flow should prefer same-view navigation or a carefully controlled system appropriate to the provider rather than enabling all windows.

## Permissions

Both permission request and permission check behavior must be controlled when supported by the selected Electron version. Decisions consider at least:

- requesting origin;
- top-level origin when available;
- requested permission;
- current environment; and
- whether the feature is enabled in configuration.

Initial production posture:

| Permission                        | Default                                     |
| --------------------------------- | ------------------------------------------- |
| Clipboard read/write              | Deny until an explicit workflow is approved |
| Notifications                     | Deny until an explicit workflow is approved |
| Media, camera, microphone         | Deny                                        |
| Fullscreen requested by content   | Deny unless product behavior requires it    |
| Geolocation                       | Deny                                        |
| MIDI, HID, serial, USB, Bluetooth | Deny                                        |

Permission grants, if introduced, must be origin-scoped, minimal, documented, and covered by allow and deny tests. There is never a blanket `callback(true)` path.

## Session and authentication

The content session is obtained directly from the content view. It centralizes cookies, cache, permissions, downloads, proxy settings, and any deliberate user-agent behavior.

A named persistent partition is used only if the workspace requires login persistence. The chosen partition name becomes a stable data-storage contract and must be documented before release. The default session must not be modified globally merely for convenience.

Authentication origins are not inferred dynamically from redirects. They are configuration entries with specific tests. Credentials, cookie values, authorization headers, URL credentials, and tokens must not be surfaced in shell state or logs.

## Downloads and external effects

Downloads are disabled by intercepting `will-download` and preventing the default action. Adding downloads later requires a separate design covering:

- allowed initiating and final origins;
- user confirmation and filename presentation;
- destination selection and overwrite behavior;
- cancellation and progress UI;
- safe filename handling;
- audit logging without private content; and
- platform-specific security considerations.

Until that design is approved, there is no fallback to Chromium's default download behavior.

The initial product does not grant remote pages an unrestricted “open externally” bridge. Any future external-link behavior requires its own scheme and origin policy.

## Developer-mode containment

Development capabilities are independent, validated configuration flags. Production defaults are always restrictive.

Development-only behavior includes:

- shell or content DevTools;
- Inspect Element context-menu entries;
- verbose logging;
- Vite development-server loading; and
- optional arbitrary URL commands.

Packaging a production build must not infer developer mode from the presence of a local server or a mutable renderer value. Remote content cannot enable it.

## Logging and diagnostics

Log categories are `app`, `window`, `content`, `navigation`, `security`, `gpu`, and `ipc`.

Allowed diagnostic fields include event type, sanitized error code, origin classification, Electron/Chromium version, OS, architecture, GPU feature status, and device scale factor.

The following must never be logged:

- cookies, authorization headers, tokens, or session identifiers;
- request or response bodies;
- full URLs containing paths, queries, fragments, or credentials when an origin is sufficient;
- arbitrary page text or private workspace data; and
- raw IPC payloads unless they are known non-sensitive structures and logging is necessary.

## Security verification checklist

Before a production release:

- [ ] Shell and content preferences match the hardened settings.
- [ ] Remote content has no preload or privileged bridge.
- [ ] The shell preload exposes only named, typed functions.
- [ ] Every IPC handler validates sender and input at runtime.
- [ ] Navigation tests include malformed URLs, lookalike hosts, forbidden schemes, redirects, authentication boundaries, and unknown origins.
- [ ] Popup tests prove default denial.
- [ ] Permission tests prove unknown origins and unsupported permissions are denied.
- [ ] Download attempts are cancelled without browser UI.
- [ ] Production DevTools, Inspect Element, arbitrary navigation, and verbose logging are disabled.
- [ ] Production shell CSP has no unreviewed unsafe directives.
- [ ] Logs contain no secrets or private page data in failure paths.
- [ ] Content crash and unresponsive behavior leave the local shell operational.
- [ ] Dependency versions and the lockfile are exact and reproducible.
- [ ] Packaged artifacts receive the applicable platform signing and notarization checks.

Any exception requires a documented reason, the narrowest viable scope, explicit test coverage, and an update to the normative specification if it changes a stated requirement.
