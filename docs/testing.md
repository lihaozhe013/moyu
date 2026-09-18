# Testing Strategy

Tests prove both visible behavior and containment. Loopback fixtures provide a
deterministic debugging path, while public HTTPS smoke tests verify that the
Electron content surface can behave as a normal web client. Public-site tests
are required acceptance tests: they do not preflight with a host-side request
and they do not skip when the network is unavailable.

## Quality gates

Every implementation phase runs:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The full acceptance gate additionally runs `pnpm test:e2e`. The current local
baseline is 18 unit-test files / 51 tests and 20 Electron E2E scenarios. The
E2E environment must provide outbound HTTPS access; otherwise the acceptance
run is incomplete and must fail visibly rather than be reported as passing.

## Unit and boundary coverage

Vitest covers pure policy and contract modules without requiring a live
Electron window:

- exact-origin navigation, credentials, schemes, redirects, popups, and
  development exceptions;
- configuration modes, optional first-run URL, origin derivation, and boolean
  environment parsing;
- shortcut physical-code normalization, platform defaults, formatting,
  unsupported/modifier-only keys, duplicate bindings, and registry dispatch;
- versioned preference sanitization, partial-field recovery, legacy window-state
  migration, concurrent patch merging, and atomic writes;
- context-menu production/development templates and dynamic Settings
  accelerator;
- sender identity, IPC payload ranges, geometry, zoom, window presentation,
  content status, logging sanitization, and popup/session policy.

Unknown command IDs, malformed URLs, unsafe schemes, duplicate shortcuts,
unknown preference fields, invalid bounds, and unexpected IPC senders must be
rejected or safely ignored.

## Fixture routes

`tests/fixtures/server.mjs` binds only to loopback and supplies:

| Route               | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `/`                 | readiness and stable content                  |
| `/redirect-allowed` | same-origin redirect                          |
| `/redirect-denied`  | redirect to an untrusted loopback port        |
| `/popup`            | popup denial                                  |
| `/permission`       | permission denial                             |
| `/download`         | download cancellation                         |
| `/webgl`            | WebGL/WebGPU capability smoke test            |
| `/error`            | deterministic first-load failure and recovery |
| `/local/*.html`     | local edge-to-edge HTML fixture pages         |

The fixture also supports a renderer-crash trigger from the E2E harness. Lack
of WebGPU is an accepted capability result.

## Electron E2E scenarios

The E2E suite verifies:

1. the main window is frameless and contains only `.drag-region`, the content
   host, and transient overlays; old titlebar, menu, toolrail, inspector,
   statusbar, and window-control elements are absent;
2. shell and remote content reach ready state, and native bounds track resize;
3. command palette open/close, reload, zoom, fullscreen, crash recovery,
   popup/permission/navigation/download denial, and GPU diagnostics;
4. Settings is single-instance, modeless, no-button, keyboard-operable, and
   reachable from its shortcut;
5. URL save keeps Settings open and immediately replaces the content
   generation; an empty first run opens Settings and focuses the URL input;
6. shortcut capture, reset behavior, dirty/save state, and conflict feedback;
7. no remote page receives `window.desktopAPI` or local privileges.
8. local HTML fixtures load without application chrome, shell/content borders,
   or a mismatch between native and DOM bounds;
9. GitHub, Wikipedia, and Mozilla load in fresh application processes over
   HTTPS without an error overlay, application chrome, or a remote preload.
   DNS/TLS/proxy/firewall/site failures fail these tests and require an
   environment or product investigation.

Native context-menu presentation is covered by an injectable template unit
test. Windows and macOS packaged builds still require manual right-click,
frameless resize, traffic-light hiding, menu, and mixed-DPI checks.

## Public HTTPS network gate

The public-site checks intentionally use the same Electron `WebContentsView`
path as a configured workspace. They do not use a Node.js `fetch` preflight,
because a host-side request can succeed while Electron fails due to a different
proxy, certificate store, session, or navigation policy. Conversely, an
unreachable site is not converted into a skip: the result means the current
build/environment cannot satisfy the normal public-workspace contract.

The canonical smoke URLs are:

- `https://github.com/`
- `https://www.wikipedia.org/`
- `https://www.mozilla.org/`

If a provider intentionally runs without outbound HTTPS, it may run the local
fixture tests for diagnosis, but it must mark the full E2E acceptance gate as
blocked or failed. It must not publish that run as a successful release
verification.

## Platform matrix

| Platform   | Architecture | Scale focus                                                    |
| ---------- | ------------ | -------------------------------------------------------------- |
| Windows 11 | x64          | 100%, 125%, 150%, 200%, mixed monitors, F11                    |
| macOS      | arm64        | Retina/scaled modes, hidden traffic lights, Cmd menu/shortcuts |
| macOS      | x64          | launch, native menu, fullscreen, Retina where available        |

Manual checks must verify windowed/maximized/fullscreen transitions, persisted
placement, Settings focus, right-click from shell and remote content, and the
absence of native/custom window buttons.

## GPU and performance observations

Verify normal Chromium hardware acceleration, WebGL fallback behavior, graceful
WebGPU absence, responsive animation, frame-coalesced bounds, no idle polling,
and no remote-frame screenshot proxy. Capture the Electron/Chromium versions,
OS, architecture, scale factors, and sanitized GPU feature status without page
data.

## Release report

Record the commit, lockfile, tool versions, platform/architecture/scale,
typecheck/lint/unit/build/E2E/package results, manual gaps, and signing or
notarization evidence. A skipped platform job must be visible and justified;
it is not a pass.
