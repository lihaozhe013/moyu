# Implementation Plan

This plan sequences the work described by [`../SPEC.md`](../SPEC.md). Phase 0 is complete; subsequent phases are implemented in order as their inputs become available and predecessor gates pass.

## Guiding constraints

- Security boundaries are established before loading remote content.
- Pure policy and validation are built before Electron event wiring where practical.
- The shell stays local and remains the primary renderer.
- Production defaults deny navigation exceptions, popups, permissions, downloads, DevTools, and arbitrary locations.
- Cross-platform behavior is validated continuously rather than postponed until final packaging.
- Dependency versions are resolved once at bootstrap and then pinned exactly.

## Phase 0: Product inputs and toolchain (complete)

### Inputs to resolve

- product name, application identifiers, and initial branding assets;
- initial content URL and exact allowed origins;
- any authentication origins and required redirect behavior;
- whether authentication state must persist;
- required web permissions, if any;
- whether downloads are a version 1 requirement;
- supported macOS deployment range; and
- release signing/notarization ownership.

### Work

- Query the package registries using the commands in [`development.md`](./development.md).
- select a mutually compatible Electron/electron-vite/Vite/TypeScript/Node toolchain;
- bootstrap pnpm, TypeScript, React, lint, format, unit-test, E2E, and packaging configuration;
- establish ESM and strict TypeScript configuration;
- pin exact versions and commit the lockfile; and
- record any compatibility constraints.

### Exit gate

- Clean frozen install, typecheck, test placeholder, and production build succeed.
- Development and production shell entry paths are distinct.
- No remote workspace is loaded yet.

The completed bootstrap uses the exact versions recorded in `package.json` and `pnpm-lock.yaml`. Product-specific origins, branding, and signing inputs remain unresolved and are intentionally not embedded in the scaffold.

## Phase 1: Pure contracts and policy (complete)

### Work

- Define shared serializable geometry, window, content, configuration, and IPC types.
- Implement runtime configuration validation.
- Implement pure URL classification and navigation decisions.
- Implement popup decisions with default denial.
- Implement content-bounds validation/conversion.
- Implement window presentation and persisted-placement state transitions.
- Establish a minimal categorized logger with sanitization rules.

### Exit gate

- Unit tests cover positive, negative, malformed, boundary, and development/production cases.
- Policy modules do not require a live Electron application to test.
- Unknown configuration and navigation inputs fail closed.

The completed policy layer includes typed shared contracts, runtime validation, exact-origin navigation checks, default-deny popup decisions, bounds normalization, window-state restoration, and sanitized categorized logging. The next target is Phase 2: secure main window and local shell.

## Phase 2: Secure main window and local shell (complete)

### Work

- Add the single-instance lifecycle.
- Create the hidden, dark-background `BrowserWindow` with hardened preferences.
- Load the locally bundled React shell.
- Implement the workstation layout, base tokens, drag regions, and platform title-bar treatment.
- Show only after initial shell readiness.
- Add local loading and error overlay foundations.
- Add native Windows and macOS menu behavior appropriate to each platform.

### Exit gate

- The shell launches without white, blank, Vite, or unstyled flashes.
- Window dragging, controls, minimum dimensions, maximize/restore, and basic accessibility work.
- Production output contains no generic Electron menu or branding.
- Still no remote content is loaded.

The completed shell includes the hidden startup window, single-instance lifecycle, platform title-bar treatment, native menu policy, accessible local workspace regions, and validated window-control IPC. The next target is Phase 3 hardening and completion of the preload/IPC surface before attaching remote content.

## Phase 3: Preload and IPC (complete)

### Work

- Expose the smallest named `DesktopAPI` through `contextBridge`.
- Register known channels and validate the shell sender/main frame.
- Add runtime validation for all payloads.
- Wire window actions and typed state events.
- Ensure listener teardown and development reload behavior are safe.

### Exit gate

- The renderer cannot access `ipcRenderer`, Node.js, Electron modules, filesystem, process, shell, or child-process APIs.
- Calls from unexpected senders and malformed payloads are rejected by tests.
- Window controls operate only through the typed bridge.

The completed IPC boundary exposes only named window/content/layout operations, validates shell sender frames and payloads in the main process, provides typed content-state events, and fails explicitly when the content surface is not initialized. The next target is Phase 4: isolated content integration.

## Phase 4: Isolated content integration (complete)

### Work

- Create exactly one hardened `WebContentsView` with no preload.
- Obtain its explicit session and install permission, download, context-menu, navigation, and popup policies before navigation.
- Attach it to the primary window and load the configured URL.
- Implement renderer measurement, frame-coalesced bounds IPC, and main-process `setBounds` ownership.
- Translate content load, error, responsiveness, and renderer-exit events into shell state.
- Implement reload, hard reload, and recovery actions.

### Exit gate

- Allowed fixture content loads in the correct rectangle.
- Denied navigation, redirect, popup, permission, and download cases remain denied.
- The shell survives content load failure and renderer exit.
- Bounds remain aligned during resize, maximize, restore, and fullscreen at tested scales.

The completed content integration creates one sandboxed `WebContentsView` on a named session, installs navigation/redirect, popup, permission, context-menu, and download policies before loading, synchronizes renderer geometry through validated IPC, and publishes custom loading/error/crash states to the shell. The next target is Phase 5: interaction and desktop behavior completion.

## Phase 5: Interaction and desktop behavior (complete)

### Work

- Add command palette and production command aliases.
- Add application-scoped keyboard shortcuts.
- Implement explicit windowed/maximized/fullscreen behavior.
- Add controlled content zoom and fixed shell zoom.
- Complete platform-specific menu and context-menu behavior.
- Persist validated window state and optionally content zoom if approved.
- Add internal screenshot interface for content capture.

### Exit gate

- Shortcuts affect the correct surface and respect environment restrictions.
- Fullscreen restores the prior state.
- Zoom stays on approved steps and within 0.5–2.0.
- A second instance focuses/restores the existing window.
- Production cannot open DevTools or arbitrary locations by default.

The completed interaction layer adds a controlled command palette, application-scoped shortcuts, native windowed/maximized/fullscreen transitions, approved-step content zoom, development-only inspection access, validated window-state persistence, and an internal screenshot capture interface. The next target is Phase 6: deterministic fixtures, end-to-end coverage, and resilience checks.

## Phase 6: Fixtures, E2E, and resilience (next)

### Work

- Build the deterministic local fixture routes described in [`testing.md`](./testing.md).
- Implement the complete unit-test requirements.
- Add Playwright Electron scenarios for launch, layout, window state, shortcuts, policy, and recovery.
- Add crash/unresponsive coverage where Electron permits deterministic testing.
- Add accessibility and no-browser-leakage assertions.

### Exit gate

- All required `SPEC.md` unit and E2E scenarios pass on supported runners.
- Tests do not require the production website or public network.
- Failure output is useful without exposing sensitive content.

## Phase 7: GPU and performance validation

### Work

- Implement `/webgl` and optional WebGPU feature detection in the fixture.
- Add internal non-sensitive GPU diagnostics.
- Validate that hardware acceleration remains enabled.
- Measure idle shell activity, bounds update frequency, resize behavior, and React rendering.
- Evaluate background throttling only with a reproducible scenario.

### Exit gate

- WebGL smoke behavior works on representative supported hardware.
- Unsupported WebGPU is handled as a capability result, not a shell failure.
- The shell has no continuous idle render/polling loop or redundant bounds storm.
- No undocumented GPU switch or blanket throttling override is present.

## Phase 8: Packaging and release readiness

### Work

- Add electron-builder configuration and final assets.
- Add isolated GitHub Actions workflows for common checks and platform packaging.
- Configure Windows signing and macOS hardened runtime, signing, and notarization through secrets.
- Test packaged output on clean Windows and macOS environments.
- Complete security, accessibility, release, and traceability reviews.

### Exit gate

- Windows x64 and macOS arm64/x64 artifacts are produced and verified.
- Frozen install, typecheck, lint, unit, build, applicable E2E, and packaging gates pass.
- Production artifacts contain no development endpoints, test controls, generic Electron branding, or browser leakage.
- Release records include platform, architecture, scale, signature, and notarization evidence.

## Dependency graph

```text
Product inputs + compatible toolchain
                 │
                 ▼
       Pure contracts and policy
          ┌──────┴──────┐
          ▼             ▼
    Secure shell     Typed IPC
          └──────┬──────┘
                 ▼
       Isolated content view
                 ▼
       Desktop interaction
                 ▼
      Fixtures and full E2E
                 ▼
    GPU/performance validation
                 ▼
       Packaging and release
```

## Risk register

| Risk                                                                         | Impact                                     | Mitigation and proof                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Vite 8, electron-vite prerelease, TypeScript 7, and Electron incompatibility | Bootstrap or packaging failure             | Resolve versions together, prove clean build, pin exact versions                     |
| `WebContentsView` bounds drift on fractional DPI                             | Gaps, overlap, or unusable content         | Pure conversion tests plus 125%/150%/Retina and mixed-monitor E2E                    |
| Frameless behavior differs across platforms                                  | Broken resizing or non-native chrome       | Platform-specific window configuration and manual release matrix                     |
| Authentication requires unexpected origins or popups                         | Login failure or pressure to weaken policy | Discover auth flow early; model exact origins and popup cases; retain default denial |
| Remote page assumes browser permissions/downloads                            | Feature loss or unsafe broad grants        | Inventory required features; add only origin-scoped reviewed exceptions              |
| Remote content crash or hang affects the shell                               | Lost recovery path                         | Separate renderers, lifecycle events, local overlays, recovery E2E                   |
| Production accidentally inherits development controls                        | Security and browser leakage               | Independent validated flags and packaged-output tests                                |
| macOS signing/notarization unavailable late                                  | Release delay                              | Establish credential ownership and dry-run signing before final phase                |
| GPU behavior differs by device/driver                                        | Rendering regressions                      | Capability detection, representative smoke matrix, no speculative flags              |

## Deferred scope

The following are not part of version 1 unless the normative specification is changed:

- multiple documents, tabs, or content views;
- browser history, bookmarks, omnibox behavior, or extensions;
- unrestricted browsing or popup windows;
- automatic updates;
- Windows arm64 artifacts;
- macOS universal artifacts;
- whole-window screenshot capture if native complications push it to version 1.1;
- permissions, downloads, camera/microphone, or device APIs without an approved feature; and
- shell routing or global state libraries without a demonstrated need.

## Implementation handoff checklist

Before starting Phase 0, confirm:

- [ ] The unresolved product inputs at the top of this document have owners or explicit deferrals.
- [ ] `SPEC.md` is accepted as the normative baseline.
- [ ] Security defaults and non-browser scope are understood.
- [ ] Required Windows and macOS test access is available or planned.
- [ ] Signing/notarization responsibilities are known before release work.

The next implementation target is Phase 5: interaction and desktop behavior completion.
