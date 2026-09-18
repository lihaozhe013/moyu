# Build and Release

Release builds are packaged versions of the same experimental self-authored
web runtime used by `pnpm dev`. Packaging changes how local shell assets are
delivered; it must not add restrictions to the remote page.

## Build commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm build:mac:arm64
pnpm build:mac:x64
pnpm build:win:x64
pnpm package
```

`pnpm build` creates the Electron entry points in `out/`. Platform scripts use
electron-builder and produce unsigned development artifacts unless signing is
configured separately.

## Runtime parity check

Before packaging, verify that the content view and popup view still use:

```text
sandbox: false
webSecurity: false
allowRunningInsecureContent: true
nodeIntegration: true
contextIsolation: false
no remote preload
```

Also verify that the content session accepts certificates, permission checks
and requests are allowed, popups are allowed, and no download handler calls
`preventDefault()`.

## CI stages

Recommended stages are:

1. frozen dependency installation;
2. typecheck and lint;
3. unit tests;
4. application build;
5. local-fixture Electron E2E tests;
6. optional network compatibility smoke tests; and
7. platform packaging.

Network failures should be reported as compatibility failures or environment
limitations. They do not justify adding an HTTPS-only or origin policy to the
application.

## Platform evidence

Record Windows x64 and macOS arm64/x64 results when those artifacts are
produced. Manual evidence should include frameless presentation, resizing,
fullscreen, Settings behavior, high-DPI bounds, popup creation, permissions,
media, and downloads using trusted pages.

## Secrets and signing

Keep signing certificates, passwords, notarization credentials, tokens, and
populated environment files outside the repository. Signing is optional for a
temporary experimental build and does not change the web runtime contract.

## Release checklist

- [ ] Documentation identifies the build as an experimental non-browser.
- [ ] Only self-authored or trusted-page usage is recommended.
- [ ] `APP_CONTENT_URL` and the supported environment variables are documented.
- [ ] No legacy origin or arbitrary-navigation variable is required.
- [ ] First-run URL save produces a visible nonzero content view.
- [ ] Development and production content behavior match.
- [ ] Typecheck, lint, unit tests, build, and E2E results are recorded.
- [ ] Package artifacts launch and load a trusted HTTP or LAN fixture.
- [ ] Signing and notarization status is clearly labeled.
