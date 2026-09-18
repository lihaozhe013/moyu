# Requirements Traceability

This matrix maps every normative section of [`../SPEC.md`](../SPEC.md) to the
focused document that explains it and the primary verification method. It is
an index, not a replacement for the constraint reference.

| Spec section                                     | Supporting documentation                                                                                                 | Primary verification                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1. Product boundary                              | [`../README.md`](../README.md), [`product-experience.md`](./product-experience.md)                                       | Product-scope and no-browser-leakage review                                          |
| 2. Runtime and trust boundaries                  | [`architecture.md`](./architecture.md)                                                                                   | Architecture review and process-isolation E2E                                        |
| 3. Security invariants                           | [`security.md`](./security.md), [`testing.md`](./testing.md)                                                             | Policy tests and packaged security review                                            |
| 4. Window and platform behavior                  | [`product-experience.md`](./product-experience.md), [`architecture.md`](./architecture.md)                               | Frameless-shell, command, window-state, geometry, accessibility, and platform checks |
| 5. Content lifecycle and resilience              | [`architecture.md`](./architecture.md), [`product-experience.md`](./product-experience.md), [`testing.md`](./testing.md) | Loading, failure, and crash-recovery E2E                                             |
| 6. GPU and performance constraints               | [`architecture.md`](./architecture.md), [`testing.md`](./testing.md)                                                     | GPU fixture, diagnostics, and measured idle/resize evidence                          |
| 7. Configuration and environment contracts       | [`architecture.md`](./architecture.md), [`development.md`](./development.md), [`security.md`](./security.md)             | Configuration and mode-matrix tests                                                  |
| 8. Persistence, capture, and release constraints | [`architecture.md`](./architecture.md), [`release.md`](./release.md), [`testing.md`](./testing.md)                       | Versioned atomic preferences, shortcut capture, packaging, and platform reports      |
| 9. Verification and acceptance gates             | [`testing.md`](./testing.md), [`release.md`](./release.md)                                                               | Unit/E2E/CI/package results and acceptance checklist                                 |
| 10. Agent change protocol                        | [`development.md`](./development.md)                                                                                     | Review checklist, test evidence, and change record                                   |
| 11. Explicit product inputs and change control   | [`implementation-plan.md`](./implementation-plan.md), [`release.md`](./release.md)                                       | Approved-input and release-readiness review                                          |

## Cross-cutting release evidence

The following evidence closes multiple requirements at once:

| Evidence                                            | Requirements covered                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Frozen clean install plus manifest/lockfile review  | Toolchain, CI, scripts, dependency policy                                                     |
| Production packaged-window capture                  | Startup, chrome, loading, layout, and no browser leakage                                      |
| Security configuration snapshot from packaged build | Web preferences, preload, CSP, and environment controls                                       |
| Navigation/popup/permission/download test report    | Remote containment and browser-feature denial                                                 |
| Public HTTPS workspace smoke report                 | Reachable public workspace loading, exact-origin policy, remote isolation, and shell geometry |
| Windows scale and mixed-monitor report              | Bounds synchronization and Windows behavior                                                   |
| macOS arm64/x64 report                              | Frameless resize, hidden traffic lights, native menu/fullscreen, and architecture support     |
| Fixture-driven failure/crash report                 | Error experience, shell isolation, and recovery                                               |
| GPU capability and idle/resize observation          | Hardware acceleration, WebGL/WebGPU behavior, and performance                                 |
| Accessibility review                                | Semantic controls, keyboard access, focus, and contrast                                       |

## Maintenance rule

When `SPEC.md` gains, removes, or materially changes a requirement:

1. update the relevant focused document;
2. update this matrix in the same change;
3. add or revise the named verification path; and
4. ensure the implementation plan reflects any sequencing or release impact.

A requirement is not considered closed merely because documentation exists. It
closes only when the linked verification evidence passes against the
implemented, packaged behavior.
