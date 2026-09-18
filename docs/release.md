# Build and Release

This document defines the continuous-integration, packaging, and release contract. The repository now includes an unsigned artifact workflow for platform smoke checks; signing and notarization remain protected release inputs.

## Supported release targets

| Platform   | Architecture | Version 1 status                            |
| ---------- | ------------ | ------------------------------------------- |
| Windows 11 | x64          | Required                                    |
| macOS      | arm64        | Required                                    |
| macOS      | x64          | Required                                    |
| macOS      | universal    | Structurally supported for a future release |
| Windows    | arm64        | Future scope                                |

The exact minimum macOS version is selected during toolchain bootstrap based on the chosen stable Electron release and product requirements. It must be documented in package metadata and release notes before the first distributable release.

## Build principles

- Use pnpm and the committed lockfile.
- Pin exact dependency versions after compatibility validation.
- Compile the shell locally; production has no Vite server or localhost dependency.
- Keep provider-specific CI definitions thin and keep build commands in package scripts or portable project configuration.
- Use electron-builder unless current electron-vite guidance demonstrates a materially better maintained integration.
- Keep signing credentials outside the repository.
- Never label unsigned or unnotarized artifacts as production releases where platform trust requires signing.

## CI stages

The logical pipeline is:

```text
install
  ▼
typecheck ──┬── lint
            └── unit tests
                 ▼
               build
                 ▼
          platform E2E tests
                 ▼
              package
                 ▼
       sign / notarize / verify
                 ▼
          publish approved assets
```

Independent checks may run in parallel after installation. Packaging must consume source and dependency state already validated by the earlier gates.

Minimum common commands are:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Applicable jobs then run `pnpm test:e2e`, `pnpm package:win`, or `pnpm package:mac`.

## CI matrix

The initial target matrix should include:

| Job                               | Windows x64                                                                                           | macOS arm64          | macOS x64                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------- |
| Install/typecheck/lint/unit/build | Required on at least one primary runner; cross-platform-sensitive build checks on all target families | Required             | Required where runner support permits                       |
| Electron E2E smoke                | Required                                                                                              | Required             | Required or explicitly covered by a compatible macOS runner |
| Package                           | Required                                                                                              | Required             | Required                                                    |
| Sign                              | Required for release                                                                                  | Required for release | Required for release                                        |
| Notarize                          | Not applicable                                                                                        | Required for release | Required for release                                        |

The exact workflow can reduce duplicate pure-test work, but it cannot omit platform-sensitive behavior or artifact verification.

## Packaging configuration

Packaging metadata must define:

- final product and executable names;
- stable application identifiers;
- version and copyright metadata;
- platform icon assets (`.ico`, `.icns`, and source PNG as appropriate);
- included compiled shell and runtime resources;
- excluded source maps or diagnostics according to the release policy;
- Windows installer/portable artifact choices;
- macOS DMG or other approved artifact choices;
- architecture targets; and
- signing/notarization hooks driven by CI secrets.

The checked-in [`../electron-builder.yml`](../electron-builder.yml) defines the provisional application identifier, product metadata, asar inclusion set, Windows NSIS/portable targets, and macOS DMG/zip targets for arm64 and x64. The `build/` directory contains a neutral geometric placeholder icon set that must be replaced by approved product branding before signing. The manually triggered [`../.github/workflows/package.yml`](../.github/workflows/package.yml) intentionally produces unsigned artifacts with certificate auto-discovery disabled so they cannot be mistaken for signed releases.

Generic Electron branding, default icons, development URLs, test fixtures, and unnecessary source files must not leak into production artifacts.

## Windows release requirements

Before release:

- build the x64 artifact on a supported Windows runner or an otherwise verified electron-builder workflow;
- apply the organization's code-signing certificate and timestamping configuration;
- verify the installed executable's signature;
- install and launch on a clean Windows 11 environment;
- test standard-user installation/uninstallation behavior for the chosen installer;
- verify frameless resizing with no native or custom window buttons, keyboard
  minimize/maximize/restore, fullscreen, and scaling; and
- confirm no console window, Chromium menu, default icon, or development endpoint appears.

Certificate provider and installer format remain product inputs and must be selected before the first signed candidate.

## macOS release requirements

Before release:

- build both arm64 and x64 artifacts;
- sign application bundles with the appropriate Developer ID identity;
- enable hardened runtime and entitlements no broader than required;
- notarize release artifacts and staple the result where applicable;
- verify signatures and Gatekeeper assessment;
- launch on clean supported macOS environments;
- verify native menu, hidden traffic lights, fullscreen, Retina layout, Cmd
  shortcuts, Settings focus, context menus, and trackpad behavior; and
- confirm architecture-correct execution rather than accidental Rosetta-only behavior on Apple Silicon.

The build structure must leave room for a future universal artifact without making it a version 1 requirement.

## Secrets and environment

CI secrets may include signing certificates, certificate passwords, Apple developer credentials or API keys, and publishing credentials. Secret names depend on the chosen provider and should be documented in private operational configuration, while the repository documents the conceptual requirement.

Rules:

- never commit credentials, certificates, private keys, tokens, or populated `.env` files;
- never print secrets or encoded certificates in logs;
- restrict release credentials to protected jobs and branches/tags;
- do not expose secrets to pull-request jobs from untrusted forks; and
- sanitize tool output when a third-party signing command could echo sensitive input.

## Artifact verification

Every release artifact is checked for:

- expected product name, version, application ID, icon, and architecture;
- valid platform signature and notarization status where applicable;
- absence of development servers, source paths, generic Electron branding, and test-only controls;
- successful launch without network access to development infrastructure;
- correct local shell loading and production security defaults;
- correct initial content configuration for the intended environment; and
- reproducible dependency input from the committed lockfile.

Artifact checks should operate on the packaged output, not only the development build.

## Release checklist

### Product and configuration

- [ ] Product name, identifiers, version, icons, and copyright are final.
- [ ] Initial URL, allowed origins, and authentication origins are reviewed.
- [ ] Session, permission, download, and external-link policies match product requirements.
- [ ] Production DevTools, arbitrary navigation, inspection, and verbose logging default off.
- [ ] Supported OS versions are recorded.

### Quality

- [ ] Frozen installation succeeds.
- [ ] Typecheck, lint, unit tests, and build pass.
- [ ] Required E2E scenarios pass on Windows and macOS.
- [ ] Required DPI, Retina, multi-monitor, fullscreen, and GPU checks are recorded.
- [ ] Accessibility and no-browser-leakage checklists pass.
- [ ] Known exceptions are explicitly approved and documented.

### Security

- [ ] Security checklist in [`security.md`](./security.md) passes.
- [ ] Dependency changes and lockfile diff are reviewed.
- [ ] Production CSP and web preferences are verified from packaged output.
- [ ] Logs and diagnostics contain no secrets or private page content.

### Distribution

- [ ] Windows artifacts are signed and verified.
- [ ] macOS arm64 and x64 artifacts are signed, notarized, stapled where applicable, and verified.
- [ ] Clean-machine install, launch, and uninstall checks pass.
- [ ] Checksums and release notes correspond to the final artifacts.
- [ ] Development or unsigned artifacts are clearly distinguished from release assets.

## Release notes

Release notes should include:

- user-visible behavior changes;
- supported operating systems and architectures;
- known limitations and approved exceptions;
- security-relevant policy changes without disclosing exploitable details; and
- migration guidance for changes to persisted state or session storage.

Automatic updates are not specified for version 1. Adding them requires an explicit design for update signing, channels, rollback, compatibility, and user experience before implementation.
