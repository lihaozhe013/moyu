import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  CommandId,
  SettingsDraft,
  SettingsSnapshot,
  ShortcutBinding,
} from '../../shared/types';
import { formatShortcutBinding } from '../../shared/commands';
import './styles.css';

type Platform = 'darwin' | 'win32';

function getPlatform(): Platform {
  return navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32';
}

function getModifiers(event: KeyboardEvent): ShortcutBinding['modifiers'] {
  const modifiers: ShortcutBinding['modifiers'][number][] = [];
  if (event.altKey) modifiers.push('alt');
  if (event.ctrlKey) modifiers.push('control');
  if (event.metaKey) modifiers.push('meta');
  if (event.shiftKey) modifiers.push('shift');
  return modifiers;
}

function isModifierOnly(event: KeyboardEvent): boolean {
  return ['Alt', 'Control', 'Meta', 'Shift'].includes(event.key);
}

function SettingsApp(): React.JSX.Element {
  const platform = getPlatform();
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [workspaceUrl, setWorkspaceUrl] = useState('');
  const [shortcuts, setShortcuts] = useState<Partial<Record<CommandId, ShortcutBinding>>>({});
  const [search, setSearch] = useState('');
  const [captureCommand, setCaptureCommand] = useState<CommandId | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [closePrompt, setClosePrompt] = useState(false);
  const [dirty, setDirty] = useState(false);
  const urlRef = useRef<HTMLInputElement | null>(null);

  const reloadSnapshot = (): void => {
    const api = window.settingsAPI;
    if (api === undefined) return;
    void api.settings
      .getSnapshot()
      .then((next) => {
        setSnapshot(next);
        setWorkspaceUrl(next.workspaceUrl ?? '');
        setShortcuts({ ...next.shortcutOverrides });
        setDirty(false);
        setFieldErrors({});
        setNotice(null);
        setCaptureCommand(null);
        setCaptureError(null);
        window.setTimeout(() => urlRef.current?.focus(), 0);
      })
      .catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : 'Settings could not be loaded.');
      });
  };

  useEffect(() => {
    reloadSnapshot();
  }, []);

  useEffect(() => {
    const api = window.settingsAPI;
    if (api === undefined) return;
    const removeSave = api.settings.onSaveRequest(() => {
      void saveSettings();
    });
    const removeClose = api.settings.onCloseRequest(() => {
      requestClose();
    });
    const removeDismiss = api.settings.onDismissRequest(() => {
      if (captureCommand !== null) {
        cancelCapture();
      } else {
        requestClose();
      }
    });
    return () => {
      removeSave();
      removeClose();
      removeDismiss();
    };
  });

  const visibleCommands = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (snapshot?.commands ?? []).filter((command) => {
      if (command.devOnly) return false;
      if (query.length === 0) return true;
      return `${command.label} ${command.description}`.toLowerCase().includes(query);
    });
  }, [search, snapshot]);

  const updateDraft = (): void => {
    setDirty(true);
    setNotice(null);
    setFieldErrors({});
  };

  function cancelCapture(): void {
    setCaptureCommand(null);
    setCaptureError(null);
    void window.settingsAPI?.settings.setCaptureMode(false).catch(() => undefined);
  }

  function startCapture(commandId: CommandId): void {
    setCaptureCommand(commandId);
    setCaptureError(null);
    setNotice('Press a key combination. Escape cancels recording.');
    void window.settingsAPI?.settings.setCaptureMode(true).catch(() => undefined);
  }

  function handleCapture(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (captureCommand === null) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      cancelCapture();
      return;
    }
    if (isModifierOnly(event.nativeEvent)) return;
    const code = event.nativeEvent.code || event.nativeEvent.key;
    if (code.length === 0) return;
    const modifiers = getModifiers(event.nativeEvent);
    if (modifiers.length === 0 && !/^F(?:[1-9]|1[0-2])$/.test(code)) {
      setCaptureError('A printable key must include Ctrl, Cmd, Alt, or Shift.');
      return;
    }
    setShortcuts((current) => ({
      ...current,
      [captureCommand]: { code, modifiers: [...modifiers] },
    }));
    updateDraft();
    cancelCapture();
  }

  function resetShortcut(commandId: CommandId): void {
    setShortcuts((current) => {
      const next = { ...current };
      delete next[commandId];
      return next;
    });
    updateDraft();
  }

  function resetAllShortcuts(): void {
    setShortcuts({});
    updateDraft();
  }

  async function saveSettings(): Promise<void> {
    if (snapshot === null || captureCommand !== null) return;
    const api = window.settingsAPI;
    if (api === undefined) return;
    setNotice('Saving…');
    setFieldErrors({});
    const draft: SettingsDraft = { workspaceUrl, shortcuts };
    try {
      const result = await api.settings.save(draft);
      if (!result.success) {
        setFieldErrors(result.fieldErrors);
        setNotice(result.message);
        return;
      }
      setSnapshot(result.snapshot);
      setWorkspaceUrl(result.snapshot.workspaceUrl ?? workspaceUrl);
      setShortcuts({ ...result.snapshot.shortcutOverrides });
      setDirty(false);
      setNotice(
        result.workspaceReloadStarted ? 'Saved. Workspace loading…' : 'Saved successfully.',
      );
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : 'Settings could not be saved.');
    }
  }

  function requestClose(): void {
    if (captureCommand !== null) {
      cancelCapture();
      return;
    }
    if (dirty) {
      setClosePrompt(true);
      return;
    }
    void window.settingsAPI?.settings.close();
  }

  function discardAndClose(): void {
    setClosePrompt(false);
    void window.settingsAPI?.settings.close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (captureCommand !== null) {
      handleCapture(event);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void saveSettings();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      requestClose();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
    }
  }

  if (snapshot === null) {
    return <main className="settings-loading">Loading settings…</main>;
  }

  return (
    <main className="settings-window" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="settings-drag-strip" aria-hidden="true" />
      <header className="settings-header">
        <div>
          <p className="settings-eyebrow">PROFESSIONAL CANVAS</p>
          <h1>Settings</h1>
          <p className="settings-subtitle">Configure the workspace and keyboard-first controls.</p>
        </div>
        <div className="settings-header__hint">
          {platform === 'darwin' ? '⌘' : 'Ctrl'}+, to open
        </div>
      </header>

      <div className="settings-content">
        <section className="settings-section" aria-labelledby="workspace-heading">
          <div className="settings-section__heading">
            <div>
              <h2 id="workspace-heading">Workspace URL</h2>
              <p>
                Use an HTTPS workspace in production. Local HTTP URLs are available in development
                and tests.
              </p>
            </div>
          </div>
          <label className="field-label" htmlFor="workspace-url">
            URL
          </label>
          <input
            ref={urlRef}
            id="workspace-url"
            className={`text-input${fieldErrors.workspaceUrl ? ' text-input--error' : ''}`}
            value={workspaceUrl}
            autoFocus={snapshot.workspaceUrl === undefined}
            onChange={(event) => {
              setWorkspaceUrl(event.target.value);
              updateDraft();
            }}
            placeholder="https://workspace.example.com/"
            spellCheck={false}
            autoComplete="off"
          />
          {fieldErrors.workspaceUrl ? (
            <p className="field-error">{fieldErrors.workspaceUrl}</p>
          ) : null}
        </section>

        <section className="settings-section" aria-labelledby="shortcuts-heading">
          <div className="settings-section__heading settings-section__heading--shortcuts">
            <div>
              <h2 id="shortcuts-heading">Keyboard Shortcuts</h2>
              <p>
                Each command uses one physical key combination. Select Record and press the new
                combination.
              </p>
            </div>
            <button type="button" className="quiet-button" onClick={resetAllShortcuts}>
              Reset all
            </button>
          </div>
          <label className="field-label" htmlFor="shortcut-search">
            Search commands
          </label>
          <input
            id="shortcut-search"
            className="text-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search commands"
            autoComplete="off"
          />
          <div className="shortcut-list" onKeyDown={handleKeyDown}>
            {visibleCommands.map((command) => {
              const binding = shortcuts[command.id] ?? command.defaultBinding;
              const isCapturing = captureCommand === command.id;
              return (
                <div
                  className={`shortcut-row${isCapturing ? ' shortcut-row--capturing' : ''}`}
                  key={command.id}
                >
                  <div className="shortcut-row__copy">
                    <strong>{command.label}</strong>
                    <span>{command.description}</span>
                  </div>
                  <code className="shortcut-key">
                    {isCapturing ? 'Press keys…' : formatShortcutBinding(binding, platform)}
                  </code>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => startCapture(command.id)}
                    disabled={captureCommand !== null}
                  >
                    {isCapturing ? 'Recording' : 'Record'}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => resetShortcut(command.id)}
                    aria-label={`Reset ${command.label}`}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              );
            })}
          </div>
          {fieldErrors.shortcuts ? (
            <p className="field-error" role="alert">
              {fieldErrors.shortcuts}
            </p>
          ) : null}
          {captureError ? (
            <p className="field-error" role="alert">
              {captureError}
            </p>
          ) : null}
        </section>
      </div>

      <footer className="settings-footer">
        <div className="settings-footer__status" role="status">
          {notice ?? (dirty ? 'Unsaved changes' : '')}
        </div>
        <div className="settings-footer__actions">
          <button type="button" className="quiet-button" onClick={requestClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void saveSettings()}
            disabled={!dirty || captureCommand !== null}
          >
            Save
          </button>
        </div>
      </footer>

      {closePrompt ? (
        <div className="decision-backdrop" role="presentation">
          <section
            className="decision-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-title"
          >
            <h2 id="discard-title">Unsaved changes</h2>
            <p>Save your changes before closing settings?</p>
            <div className="decision-dialog__actions">
              <button type="button" className="quiet-button" onClick={() => setClosePrompt(false)}>
                Keep editing
              </button>
              <button type="button" className="quiet-button" onClick={discardAndClose}>
                Discard
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setClosePrompt(false);
                  void saveSettings();
                }}
              >
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('The settings root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
);
