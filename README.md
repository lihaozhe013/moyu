# Professional Canvas Desktop App

This is an experimental, temporary Electron runtime for loading self-authored
web pages in a simple desktop shell. It is not a security browser and it is
not intended to protect the user from malicious, compromised, or otherwise
untrusted web pages.

Usability and page compatibility are the primary product goals. Load pages that
you made or explicitly trust. Do not use this project as a general-purpose
browser for risky websites.

## Runtime policy

The remote workspace is intentionally as unrestricted as Electron allows:

- the `WebContentsView` uses `nodeIntegration: true`,
  `contextIsolation: false`, `sandbox: false`, `webSecurity: false`, and
  `allowRunningInsecureContent: true`;
- it has no remote preload, accepts certificates through the content session,
  and can use mixed content, HTTP, HTTPS, LAN addresses, cross-origin requests,
  different ports, and other URLs that Electron can load;
- navigation and redirects are not filtered by an origin list or an HTTPS
  rule;
- popups use the same content configuration and are allowed;
- permission checks and permission requests are allowed;
- downloads use Electron's default behavior; and
- the page can access Node and Electron capabilities exposed by its renderer
  configuration.

Development and packaged/release builds use the same remote content policy.
The only intended difference is how the local shell is served: development
uses the Vite server and HMR, while a packaged build uses bundled assets.

This broad configuration is an explicit product decision, not a security
boundary. The application does not attempt to defend against hostile content.

## Current implementation

The repository includes:

- a frameless, keyboard-first shell with one edge-to-edge workspace surface and
  no persistent drag strip or titlebar decoration;
- a separate Settings window for the workspace URL and shortcut preferences;
- a main-process command registry and keyboard shortcuts;
- a customizable hold-to-drag shortcut, defaulting to `Cmd+Shift+Z` on macOS
  and `Ctrl+Shift+Z` on Windows/Linux;
- persisted workspace preferences and first-run configuration;
- a content session shared by the workspace and allowed popups;
- URL loading, reload, error, crash, zoom, fullscreen, and bounds handling; and
- deterministic loopback fixtures, unit tests, and Electron E2E coverage for
  the unrestricted runtime.

The first-run path caches the latest `.content-host` bounds before the remote
view exists, then applies them as soon as the first `WebContentsView` is
created. Saving a URL therefore creates a visible view instead of a `0x0`
surface.

Hold the window-drag shortcut and press the left mouse button anywhere in the
main workspace to move the frameless window. While the shortcut is held, the
pointer gesture is consumed by window dragging; releasing it restores normal
page clicking, text selection, and scrolling. The Settings window remains a
normal form surface. The application does not register a project-specific
global menu; macOS still owns its system menu bar and Apple menu.

## Documentation

| Document                                                       | Purpose                                           |
| -------------------------------------------------------------- | ------------------------------------------------- |
| [`SPEC.md`](./SPEC.md)                                         | Normative product and runtime contract            |
| [`docs/product-experience.md`](./docs/product-experience.md)   | Visible shell, Settings, and recovery behavior    |
| [`docs/architecture.md`](./docs/architecture.md)               | Main-process, renderer, session, and content flow |
| [`docs/security.md`](./docs/security.md)                       | Security scope and intentional limitations        |
| [`docs/development.md`](./docs/development.md)                 | Toolchain, source ownership, and workflow         |
| [`docs/testing.md`](./docs/testing.md)                         | Unit, fixture, and Electron E2E verification      |
| [`docs/release.md`](./docs/release.md)                         | Build, packaging, and release checks              |
| [`docs/implementation-plan.md`](./docs/implementation-plan.md) | Delivered phases and remaining release work       |
| [`docs/traceability.md`](./docs/traceability.md)               | Requirement-to-test index                         |

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm build:mac:arm64
pnpm build:win:x64
pnpm package
```

`pnpm dev` starts the Electron app with the local renderer development server.
It does not apply a stricter remote-page policy than a production build.

## Environment

Copy [`.env.example`](./.env.example) for local configuration. `APP_CONTENT_URL`
is the optional initial workspace URL. Leaving it empty starts the first-run
Settings flow. Saved preferences take precedence on later launches.

The supported runtime variables are `NODE_ENV`, `APP_CONTENT_URL`,
`APP_ENABLE_DEVTOOLS`, `APP_PERSIST_SESSION`, and `APP_SESSION_NAME`.
`APP_ALLOWED_ORIGINS`, `APP_AUTHENTICATION_ORIGINS`, and
`APP_ALLOW_ARBITRARY_NAVIGATION` are no longer part of the configuration and
have no runtime effect.

## Definition of done

A change is complete when the relevant code and English documentation agree,
the first-run view remains visible, and the appropriate checks pass. The
standard local gate is:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Release signing and notarization remain deployment concerns and are not part
of the content compatibility policy.
