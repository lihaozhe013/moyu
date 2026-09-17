# Testing Strategy

Testing must prove both application behavior and containment. A test suite that only verifies that the window opens is insufficient for a privileged desktop shell around remote content. The repository now includes deterministic loopback fixtures, Playwright Electron scenarios, GPU capability checks, and CI quality gates; platform-specific signing and clean-machine evidence remain release inputs.

The test commands described here are available from the bootstrap and exercise the implemented runtime through the GPU/diagnostics phase. Packaging workflows are intentionally unsigned until protected release credentials are supplied.

## Test layers

| Layer                          | Primary purpose                                                      | Expected tools                                   |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------ |
| Pure unit tests                | Policy, validation, conversion, and state transitions                | Vitest                                           |
| Main-process integration tests | Handler wiring and Electron object coordination where practical      | Vitest with focused adapters/fakes               |
| Shell component tests          | Accessible states and local interaction logic where valuable         | Vitest and a lightweight DOM environment         |
| Electron E2E tests             | Cross-process behavior, native window state, and visible containment | Playwright Electron support                      |
| Manual platform checks         | OS integration, DPI, signing, native menus, and GPU behavior         | Windows 11 and macOS hardware/VMs as appropriate |

Pure policy must be kept outside Electron event callbacks so it can be tested deterministically.

## Unit-test requirements

### URL and navigation policy

Cover:

- exact configured origin acceptance;
- same-origin path, query, and fragment navigation;
- configured authentication-origin acceptance within its intended scope;
- unconfigured HTTPS origin denial;
- lookalike, subdomain, suffix, Unicode, and mixed-case hostname cases;
- explicit port differences;
- malformed input;
- `javascript:`, `file:`, `data:`, `blob:`, custom, and other unexpected schemes;
- credentials embedded in URLs;
- allowed-to-denied and denied-to-allowed redirects; and
- developer-only arbitrary navigation enabled and disabled.

Tests should assert structured decisions or reason codes where the implementation exposes them, not only a boolean, so regressions are diagnosable without logging sensitive targets.

### Popup policy

Cover:

- default denial for allowed and disallowed origins;
- denial of malformed and dangerous schemes;
- denial in production despite development exceptions; and
- every future explicit exception as a narrow positive case plus nearby negative cases.

### Configuration validation

Cover:

- valid development, test, and production configurations;
- missing initial URL or allowlist;
- invalid URLs and origins;
- insecure production schemes;
- contradictory or unknown mode values;
- explicit boolean parsing;
- development flags defaulting off in production; and
- immutable/normalized output.

### IPC validation

Cover each payload independently, including:

- correct values;
- missing and extra fields according to the chosen validator contract;
- wrong primitive types;
- `NaN`, infinity, negative sizes, and oversized geometry;
- zoom values below, within, and above 0.5–2.0;
- unknown actions and channel names; and
- sender acceptance and rejection through a testable sender-classification function.

### Content bounds

Cover:

- integer rectangles;
- fractional CSS pixel values and the chosen rounding behavior;
- zero-size transitional layout;
- unchanged-value deduplication;
- animation-frame coalescing behavior at the shell boundary;
- Windows 125% and 150% conceptual scale inputs;
- Retina scale input; and
- rejected negative, non-finite, or implausibly large values.

### Window state

Cover transitions among windowed, maximized, and fullscreen states, including:

- enter and exit fullscreen from both windowed and maximized states;
- maximize and restore;
- minimize followed by second-instance focus/restore;
- close/shutdown behavior;
- persisted bounds intersecting an available display;
- stale off-screen coordinates falling back to the primary display; and
- fullscreen not being restored automatically.

### Content status

Cover loading, success, failure, crash, retry, and stale-event handling. A failure from an obsolete navigation must not replace the ready state of a newer navigation.

## Deterministic fixture application

Automated tests must not rely exclusively on the production website. A local fixture server provides predictable behavior and must bind to a loopback interface with an ephemeral or isolated port.

| Route               | Required behavior                                                                               | Main tests enabled        |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------- |
| `/`                 | Stable page with a readiness marker and basic dimensions/status data                            | Launch and load readiness |
| `/redirect-allowed` | Redirects to another path on the configured fixture origin                                      | Allowed redirect          |
| `/redirect-denied`  | Redirects to a second local origin or port not on the allowlist                                 | Redirect denial           |
| `/popup`            | Attempts `window.open` from a user-triggerable control and reports whether it obtained a handle | Popup denial              |
| `/webgl`            | Creates a simple WebGL context and renders a changing frame or capability result                | GPU path smoke test       |
| `/error`            | Produces a deterministic failed load, aborted response, or controlled server failure            | Custom error and retry UI |

Where practical, add a WebGPU feature check to `/webgl`. Lack of WebGPU is a valid reported outcome; it is not automatically a test failure. The fixture must not require public network access.

Additional test-only controls may trigger unresponsive or crash behavior where Electron and Playwright support it safely. Such controls must never be compiled into production remote content.

## E2E scenarios

### Launch and shell

1. Start in test mode with the fixture URL.
2. Verify one primary application window appears.
3. Verify the local shell, expected regions, and accessible controls exist.
4. Verify the content fixture reaches ready state.
5. Verify there is no address bar, tab strip, generic menu, or browser navigation UI.
6. Capture evidence that startup did not settle on a white, blank, or Chromium error page.

### Layout and presentation

1. Record the shell content-host rectangle and native content-view bounds through a test diagnostic interface.
2. Resize the window and verify alignment within the defined tolerance.
3. Maximize and verify shell plus content alignment.
4. Enter fullscreen and verify the shell remains present while OS chrome is removed.
5. Exit fullscreen and verify the previous presentation state is restored.
6. Restore to windowed mode and verify persisted/minimum constraints.

Visual screenshots can support these assertions but should not be the sole source of geometry truth.

### Command palette and shortcuts

- Open the palette with the platform shortcut.
- Close it with Escape.
- Execute supported production aliases.
- Verify reload and hard reload affect the content view rather than the shell.
- Verify zoom steps and reset stay in range.
- Verify F11 behavior where applicable.
- Verify the DevTools shortcut and arbitrary-location syntax are unavailable in production mode.

### Policy containment

- Navigate within the allowed fixture origin successfully.
- Attempt denied direct navigation and remain in the valid workspace.
- Follow an allowed redirect successfully.
- Follow a denied redirect and verify it is blocked.
- Trigger `/popup` and verify that no second window appears.
- Trigger a download and verify it is cancelled without browser download UI.
- Request unsupported permissions and verify denial without uncontrolled browser prompts.
- Open a context menu and verify production does not show browser actions.

### Failure and recovery

- Trigger the fixture error and verify the local error overlay, sanitized code, and Retry action.
- Restore the fixture and verify Retry reaches ready state.
- Trigger a content renderer exit where testable and verify the shell remains alive.
- Reload/recreate the content surface and verify recovery.
- Confirm that a shell failure is not incorrectly reported as a remote content failure.

### Single instance

- Launch a second process with the first instance running.
- Verify no second primary window remains.
- Verify a minimized first window is restored and focused.

## Platform and display matrix

Release-grade checks include:

| Platform   | Architecture | Scale factors                                | Required focus                                                                      |
| ---------- | ------------ | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Windows 11 | x64          | 100%, 125%, 150%, 200%                       | Frameless resize, controls, maximize/restore, F11, mixed-DPI movement               |
| macOS      | arm64        | Retina/default plus available scaled modes   | Traffic lights, hidden titlebar spacing, native fullscreen, Cmd shortcuts, trackpad |
| macOS      | x64          | Retina/default where hardware/runner permits | Packaging, launch, native menu, fullscreen                                          |

At least one mixed-scale multi-monitor Windows check is required before release. Moving the running window between displays must not leave the content view offset, clipped, or incorrectly sized.

## GPU checks

The GPU test is a capability and regression smoke test, not a promise that every machine supports WebGPU.

Verify:

- hardware acceleration has not been disabled by the application;
- `/webgl` obtains and renders through WebGL where the test machine supports it;
- the shell remains responsive while the fixture animates;
- resize and fullscreen do not break the rendering surface;
- diagnostics report Electron, Chromium, OS, architecture, feature status, and scale factor without page data; and
- unsupported WebGPU is reported gracefully while WebGL2 fallback remains a content concern.

## Performance observations

Capture a reproducible idle and resize scenario. Acceptance expectations are:

- shell idle CPU is near zero after content settles;
- no timer-based polling exists where an event is available;
- React does not continuously rerender at idle;
- repeated identical bounds do not generate IPC traffic;
- interactive resize is smooth on supported hardware; and
- the shell does not intercept content animation frames.

Exact numeric budgets beyond these requirements should be established from representative baseline hardware before enforcing them in CI.

## CI quality gates

At minimum, CI runs from a frozen lockfile:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

E2E and packaging run on platforms that support them. CI must not discard stderr to conceal warnings. A skipped platform or E2E job must be visible and justified; it is not equivalent to a pass.

## Release test report

Each release candidate should record:

- commit and exact lockfile state;
- Electron/Chromium/Node versions;
- operating system, architecture, and display scale tested;
- unit, build, E2E, and packaging job results;
- manual platform checks and known gaps;
- signing/notarization verification results; and
- any accepted exception linked to its documented rationale.

Release approval requires all hard criteria in [`../SPEC.md`](../SPEC.md), especially the no-browser-leakage requirements, to pass.
