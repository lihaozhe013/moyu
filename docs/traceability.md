# Requirements Traceability

This matrix links the current product contract to its implementation and
verification. It describes compatibility goals, not a hostile-page security
certification.

| Requirement                                  | Primary implementation                            | Verification                                   |
| -------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Experimental self-authored-page positioning  | `README.md`, `SPEC.md`, `docs/security.md`        | Documentation review                           |
| Identical development/release content policy | `content-view.ts`, `session.ts`, `SPEC.md`        | Test/production E2E parity                     |
| Unrestricted WebContentsView preferences     | `content-view.ts`                                 | Build review and E2E remote runtime checks     |
| Certificate acceptance and permissions       | `security/session.ts`, `security/permissions.ts`  | Unit/session review and E2E request initiation |
| Allowed popups with shared preferences       | `content-view.ts`                                 | Popup E2E                                      |
| Default Electron downloads                   | absence of download policy                        | Download fixture/manual check                  |
| Parseable URL configuration                  | `security/config.ts`, `preferences-validation.ts` | Configuration and preference unit tests        |
| First-run visible view                       | `index.ts`, `content-view.ts`                     | First-save E2E bounds and script checks        |
| Settings remains open after save             | Settings IPC and renderer                         | Settings E2E                                   |
| Shell/content bounds stay aligned            | `index.ts`, content layout, renderer IPC          | Resize and first-run E2E                       |
| Local shell IPC remains stable               | preload, `ipc/`, shared types                     | IPC and shortcut unit tests                    |
| Settings-driven whole-window drag mode       | settings IPC, `window-drag.ts`, `content-view.ts` | Drag unit tests and Settings-toggle E2E        |
| Drag mode survives content lifecycle         | `content-view.ts`, internal drag IPC              | Frame-style unit and content E2E checks        |
| No persistent top chrome or app menu         | renderer layouts, window creation, startup        | Shell/Settings E2E and platform manual check   |

## Maintenance rule

When the product direction or remote content behavior changes:

1. update `SPEC.md`;
2. update the focused document in `docs/`;
3. update unit/E2E coverage; and
4. remove obsolete policy code and tests instead of leaving dormant branches.

All repository-facing documentation remains in English.
