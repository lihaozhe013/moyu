# Requirements Traceability

This matrix maps every section of [`../SPEC.md`](../SPEC.md) to the focused document that explains it and the primary verification method. It is an index, not a replacement for the normative text.

| Spec section                          | Supporting documentation                                                                     | Primary verification                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Mission                            | [`../README.md`](../README.md), [`product-experience.md`](./product-experience.md)           | Product-scope and no-browser-leakage review                    |
| 2. Technology Stack                   | [`development.md`](./development.md), [`implementation-plan.md`](./implementation-plan.md)   | Bootstrap compatibility record, exact manifest, frozen install |
| 3. Runtime Architecture               | [`architecture.md`](./architecture.md)                                                       | Architecture review and process-isolation E2E                  |
| 3.1 Main Process                      | [`architecture.md`](./architecture.md)                                                       | Module ownership review and handler tests                      |
| 3.2 Local Shell Renderer              | [`architecture.md`](./architecture.md), [`product-experience.md`](./product-experience.md)   | Packaged-shell and UI E2E                                      |
| 3.3 Content Surface                   | [`architecture.md`](./architecture.md), [`security.md`](./security.md)                       | WebContents inspection and isolation tests                     |
| 4. Repository Structure               | [`development.md`](./development.md)                                                         | Source-tree and dependency-direction review                    |
| 5. TypeScript Requirements            | [`development.md`](./development.md)                                                         | `pnpm typecheck`, lint rules, configuration review             |
| 6. BrowserWindow                      | [`architecture.md`](./architecture.md), [`product-experience.md`](./product-experience.md)   | Launch E2E and startup visual evidence                         |
| 7. Window Chrome                      | [`product-experience.md`](./product-experience.md)                                           | Windows/macOS manual and E2E checks                            |
| 8. Window Modes                       | [`architecture.md`](./architecture.md), [`product-experience.md`](./product-experience.md)   | State unit tests and presentation E2E                          |
| 9. Shell Layout                       | [`product-experience.md`](./product-experience.md), [`architecture.md`](./architecture.md)   | Minimum-size and geometry E2E                                  |
| 10. WebContentsView                   | [`architecture.md`](./architecture.md), [`security.md`](./security.md)                       | Integration inspection and load E2E                            |
| 11. Navigation Policy                 | [`security.md`](./security.md), [`testing.md`](./testing.md)                                 | URL policy unit tests and fixture navigation E2E               |
| 12. Hidden Location / Command Palette | [`product-experience.md`](./product-experience.md)                                           | Palette and production-restriction E2E                         |
| 13. Keyboard Shortcuts                | [`product-experience.md`](./product-experience.md), [`testing.md`](./testing.md)             | Platform shortcut E2E                                          |
| 14. Preload and IPC                   | [`architecture.md`](./architecture.md), [`security.md`](./security.md)                       | Typecheck, validator tests, sender rejection tests             |
| 15. Content Security                  | [`security.md`](./security.md)                                                               | Packaged web-preferences and CSP review                        |
| 16. Permission Policy                 | [`security.md`](./security.md), [`testing.md`](./testing.md)                                 | Permission allow/deny integration tests                        |
| 17. Session Policy                    | [`security.md`](./security.md), [`architecture.md`](./architecture.md)                       | Session ownership/configuration review                         |
| 18. Downloads                         | [`security.md`](./security.md), [`testing.md`](./testing.md)                                 | Download cancellation E2E                                      |
| 19. Error Handling                    | [`product-experience.md`](./product-experience.md), [`architecture.md`](./architecture.md)   | State unit tests and failure/recovery E2E                      |
| 20. Loading Experience                | [`product-experience.md`](./product-experience.md), [`architecture.md`](./architecture.md)   | Startup sequence E2E and visual capture                        |
| 21. UI Design Tokens                  | [`product-experience.md`](./product-experience.md)                                           | CSS/token review and visual QA                                 |
| 22. Font Strategy                     | [`product-experience.md`](./product-experience.md)                                           | Platform visual QA and packaged-font audit                     |
| 23. Drag Regions                      | [`product-experience.md`](./product-experience.md)                                           | Title-bar interaction E2E/manual tests                         |
| 24. Content Bounds Synchronization    | [`architecture.md`](./architecture.md), [`testing.md`](./testing.md)                         | Geometry unit tests and DPI/multi-monitor E2E                  |
| 25. 3D / GPU Future-Proofing          | [`architecture.md`](./architecture.md), [`testing.md`](./testing.md)                         | GPU fixture, diagnostics, configuration review                 |
| 26. WebGPU                            | [`architecture.md`](./architecture.md), [`testing.md`](./testing.md)                         | Capability test and graceful-unavailable result                |
| 27. Performance                       | [`development.md`](./development.md), [`testing.md`](./testing.md)                           | Reproducible idle/resize observations                          |
| 28. Background Throttling             | [`architecture.md`](./architecture.md), [`implementation-plan.md`](./implementation-plan.md) | Configuration review and measured scenario if changed          |
| 29. macOS Requirements                | [`product-experience.md`](./product-experience.md), [`release.md`](./release.md)             | arm64/x64 platform and artifact matrix                         |
| 30. Windows Requirements              | [`product-experience.md`](./product-experience.md), [`release.md`](./release.md)             | Windows 11 scaling and artifact matrix                         |
| 31. Native Application Menu           | [`product-experience.md`](./product-experience.md)                                           | Packaged Windows/macOS menu checks                             |
| 32. Context Menu                      | [`product-experience.md`](./product-experience.md), [`security.md`](./security.md)           | Production and development context-menu E2E                    |
| 33. Zoom                              | [`product-experience.md`](./product-experience.md), [`testing.md`](./testing.md)             | Range/step unit tests and shortcut E2E                         |
| 34. Configuration                     | [`architecture.md`](./architecture.md), [`development.md`](./development.md)                 | Configuration validation tests                                 |
| 35. Environment Modes                 | [`development.md`](./development.md), [`security.md`](./security.md)                         | Mode matrix tests and packaged-output review                   |
| 36. Logging                           | [`security.md`](./security.md)                                                               | Log sanitization tests and failure-log audit                   |
| 37. Single Instance                   | [`architecture.md`](./architecture.md), [`testing.md`](./testing.md)                         | Second-launch E2E                                              |
| 38. Persistence                       | [`architecture.md`](./architecture.md), [`testing.md`](./testing.md)                         | Window-placement unit and display-change tests                 |
| 39. Crash Behavior                    | [`product-experience.md`](./product-experience.md), [`testing.md`](./testing.md)             | Content renderer crash/recovery E2E                            |
| 40. Screenshot Support                | [`architecture.md`](./architecture.md), [`implementation-plan.md`](./implementation-plan.md) | Internal API test and access-boundary review                   |
| 41. No Browser Leakage                | [`product-experience.md`](./product-experience.md), [`testing.md`](./testing.md)             | Packaged-production E2E and visual checklist                   |
| 42. Accessibility                     | [`product-experience.md`](./product-experience.md), [`testing.md`](./testing.md)             | Semantic, keyboard, focus, contrast, and announcement checks   |
| 43. Testing                           | [`testing.md`](./testing.md)                                                                 | Unit/E2E reports and release test record                       |
| 44. Test Fixture Page                 | [`testing.md`](./testing.md)                                                                 | Fixture route contract tests                                   |
| 45. CI                                | [`release.md`](./release.md), [`testing.md`](./testing.md)                                   | Required pipeline stage results                                |
| 46. Scripts                           | [`development.md`](./development.md)                                                         | Manifest review and command execution                          |
| 47. Dependency Policy                 | [`development.md`](./development.md), [`release.md`](./release.md)                           | Dependency rationale and lockfile review                       |

## Cross-cutting release evidence

The following evidence closes multiple requirements at once:

| Evidence                                            | Requirements covered                                      |
| --------------------------------------------------- | --------------------------------------------------------- |
| Frozen clean install plus manifest/lockfile review  | Toolchain, CI, scripts, dependency policy                 |
| Production packaged-window capture                  | Startup, chrome, loading, layout, no browser leakage      |
| Security configuration snapshot from packaged build | Web preferences, preload, CSP, environment controls       |
| Navigation/popup/permission/download test report    | Remote containment and browser-feature denial             |
| Windows scale and mixed-monitor report              | Bounds synchronization and Windows behavior               |
| macOS arm64/x64 report                              | Native titlebar/menu/fullscreen and architecture support  |
| Fixture-driven failure/crash report                 | Error experience, shell isolation, recovery               |
| GPU capability and idle/resize observation          | Hardware acceleration, WebGL/WebGPU behavior, performance |
| Accessibility review                                | Semantic controls, keyboard access, focus, contrast       |

## Maintenance rule

When `SPEC.md` gains, removes, or materially changes a requirement:

1. update the relevant focused document;
2. update this matrix in the same change;
3. add or revise the named verification path; and
4. ensure the implementation plan reflects any sequencing or release impact.

A requirement is not considered closed merely because documentation exists. It closes only when the linked verification evidence passes against the implemented, packaged behavior.
