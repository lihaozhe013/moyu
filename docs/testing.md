# Testing Strategy

Tests verify that the simple unrestricted runtime works for self-authored web
pages. They are compatibility and lifecycle checks, not evidence that the
application can safely browse hostile sites.

## Quality gates

Run the local gate with:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

The current suite has 17 Vitest files / 47 unit tests and 22 Electron E2E
scenarios. Network-dependent public-site checks may fail when a site or the
local network is unavailable; they are compatibility smoke tests rather than a
security requirement.

## Unit coverage

Unit tests cover:

- parseable HTTP, HTTPS, local, credentialed, data, and other URL forms;
- optional first-run configuration and ignored legacy policy variables;
- explicit boolean environment parsing;
- versioned preference persistence and Settings validation;
- shortcuts, command dispatch, geometry, zoom, content status, logging, IPC,
  and window state; and
- local shell CSP and context-menu behavior.

The removed navigation-policy tests that asserted strict origins, HTTPS-only
production, credential denial, popup denial, permission denial, or download
denial are intentionally gone.

## Fixture routes

`tests/fixtures/server.mjs` binds to loopback and supplies:

| Route                    | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `/`                      | readiness and stable content                  |
| `/redirect-cross-origin` | redirect from `127.0.0.1` to `localhost`      |
| `/cross-origin-target`   | target of the cross-origin redirect           |
| `/popup`                 | popup creation                                |
| `/popup-target`          | popup document                                |
| `/permission`            | geolocation request initiation                |
| `/download`              | default download path                         |
| `/webgl`                 | WebGL/WebGPU capability smoke test            |
| `/error`                 | deterministic first-load failure and recovery |
| `/local/*.html`          | local edge-to-edge HTML fixtures              |

## Electron E2E coverage

The suite verifies:

1. the frameless shell and native content bounds;
2. first-run Settings opening, URL save, visible nonzero view bounds, remote
   script execution, empty-state removal, and Settings remaining open;
3. resize, reload, zoom, fullscreen, crash recovery, and error recovery;
4. cross-origin redirects and the same unrestricted content behavior in test and
   production modes;
5. popup creation and permission request initiation;
6. local HTTP fixtures and optional public HTTPS compatibility smoke pages; and
7. the absence of the local `desktopAPI` bridge in remote content while the
   configured Node/Electron runtime remains available.

The E2E suite uses the same built Electron entry point for test and production
mode. A packaged artifact may be added as a separate release smoke check; it
must use the same content policy.

## Manual checks

On supported Windows and macOS systems, manually check frameless resize,
fullscreen, hidden native buttons, Settings focus, high-DPI placement, media,
geolocation, popup windows, and downloads with a trusted fixture page.

## Release report

Record the commit, lockfile, tool versions, platform, architecture, gate
results, network-dependent failures, package output, and any signing or
notarization work. Do not describe a passing test run as proof that untrusted
web pages are safe.
