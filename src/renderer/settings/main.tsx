import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type {
  CommandId,
  SettingsDraft,
  SettingsSnapshot,
  ShortcutBinding,
} from '../../shared/types';
import { formatShortcutBinding } from '../../shared/commands';
import type { LanguagePreference } from '../../shared/i18n/languages';
import { createRendererI18n } from '../../shared/i18n/react';
import { commandSearchText } from '../../shared/i18n/search';
import './styles.css';

type Platform = 'darwin' | 'win32';

const settingsI18n = createRendererI18n();

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
  const { t } = useTranslation(['settings', 'commands']);
  const platform = getPlatform();
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [workspaceUrl, setWorkspaceUrl] = useState('');
  const [language, setLanguage] = useState<LanguagePreference>('system');
  const [windowDragMode, setWindowDragMode] = useState(false);
  const [shortcuts, setShortcuts] = useState<Partial<Record<CommandId, ShortcutBinding>>>({});
  const [search, setSearch] = useState('');
  const [captureCommand, setCaptureCommand] = useState<CommandId | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [closePrompt, setClosePrompt] = useState(false);
  const [dirty, setDirty] = useState(false);
  const urlRef = useRef<HTMLInputElement | null>(null);

  const applyLanguageState = (state: SettingsSnapshot['language']): void => {
    if (state === undefined) return;
    setLanguage(state.preference);
    void settingsI18n.changeLanguage(state.resolved);
  };

  const reloadSnapshot = (): void => {
    const api = window.settingsAPI;
    if (api === undefined) return;
    void api.settings
      .getSnapshot()
      .then((next) => {
        setSnapshot(next);
        setWorkspaceUrl(next.workspaceUrl ?? '');
        setWindowDragMode(next.windowDragMode);
        setShortcuts({ ...next.shortcutOverrides });
        applyLanguageState(next.language);
        applyLanguageState(next.language);
        setDirty(false);
        setFieldErrors({});
        setNotice(null);
        setCaptureCommand(null);
        setCaptureError(null);
        window.setTimeout(() => urlRef.current?.focus(), 0);
      })
      .catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : t('notices.loadFailed'));
      });
  };

  useEffect(() => {
    reloadSnapshot();
  }, []);

  useEffect(() => {
    const api = window.settingsAPI;
    if (api === undefined) return;
    return api.settings.onWindowDragModeChanged((active) => setWindowDragMode(active));
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
      return commandSearchText(settingsI18n, command).includes(query);
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
    setNotice(t('notices.captureHint'));
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
      setCaptureError(t('notices.capturePrintable'));
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

  async function toggleWindowDragMode(): Promise<void> {
    const api = window.settingsAPI;
    if (api === undefined) return;
    try {
      setWindowDragMode(await api.settings.setWindowDragMode(!windowDragMode));
    } catch {
      setNotice(t('notices.dragModeFailed'));
    }
  }

  async function saveSettings(): Promise<void> {
    if (snapshot === null || captureCommand !== null) return;
    const api = window.settingsAPI;
    if (api === undefined) return;
    setNotice(t('notices.saving'));
    setFieldErrors({});
    const draft: SettingsDraft = { workspaceUrl, language, shortcuts };
    try {
      const result = await api.settings.save(draft);
      if (!result.success) {
        setFieldErrors(result.fieldErrors);
        setNotice(result.message);
        return;
      }
      setSnapshot(result.snapshot);
      setWorkspaceUrl(result.snapshot.workspaceUrl ?? workspaceUrl);
      setWindowDragMode(result.snapshot.windowDragMode);
      setShortcuts({ ...result.snapshot.shortcutOverrides });
      applyLanguageState(result.snapshot.language);
      setDirty(false);
      // Resolved after the language switch so the confirmation uses the new language.
      setNotice(
        result.workspaceReloadStarted
          ? settingsI18n.t('settings:notices.savedReloading')
          : settingsI18n.t('settings:notices.saved'),
      );
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : t('notices.saveFailed'));
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
    return <main className="settings-loading">{t('loading')}</main>;
  }

  return (
    <main className="settings-window" onKeyDown={handleKeyDown} tabIndex={-1}>
      <header className="settings-header">
        <div>
          <p className="settings-eyebrow">MOYU</p>
          <h1>{t('title')}</h1>
          <p className="settings-subtitle">{t('subtitle')}</p>
        </div>
        <div className="settings-header__hint">
          {t('headerHint', { modifier: platform === 'darwin' ? '⌘' : 'Ctrl' })}
        </div>
      </header>

      <div className="settings-content">
        <section className="settings-section" aria-labelledby="workspace-heading">
          <div className="settings-section__heading">
            <div>
              <h2 id="workspace-heading">{t('workspaceHeading')}</h2>
              <p>{t('workspaceHelp')}</p>
            </div>
          </div>
          <label className="field-label" htmlFor="workspace-url">
            {t('urlLabel')}
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

        <section className="settings-section" aria-labelledby="window-heading">
          <div className="settings-section__heading">
            <div>
              <h2 id="window-heading">{t('windowHeading')}</h2>
              <p>{t('windowHelp')}</p>
            </div>
          </div>
          <div className="window-drag-row">
            <div className="window-drag-row__status" role="status">
              <span className="field-label">{t('windowDragStatusLabel')}</span>
              <strong
                className={`window-drag-row__state${
                  windowDragMode ? ' window-drag-row__state--active' : ''
                }`}
              >
                {windowDragMode ? t('windowDragActive') : t('windowDragInactive')}
              </strong>
            </div>
            <button
              type="button"
              className={`window-drag-row__toggle${windowDragMode ? ' window-drag-row__toggle--active' : ''}`}
              aria-pressed={windowDragMode}
              onClick={() => void toggleWindowDragMode()}
            >
              {windowDragMode ? t('windowDragDisable') : t('windowDragEnable')}
            </button>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="language-heading">
          <div className="settings-section__heading">
            <div>
              <h2 id="language-heading">{t('languageHeading')}</h2>
              <p>{t('languageHelp')}</p>
            </div>
          </div>
          <label className="field-label" htmlFor="language-select">
            {t('languageLabel')}
          </label>
          <select
            id="language-select"
            className="text-input"
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value as LanguagePreference);
              updateDraft();
            }}
          >
            <option value="system">{t('languageSystem')}</option>
            <option value="en">{t('languageEnglish')}</option>
            <option value="zh-CN">{t('languageChinese')}</option>
          </select>
        </section>

        <section className="settings-section" aria-labelledby="shortcuts-heading">
          <div className="settings-section__heading settings-section__heading--shortcuts">
            <div>
              <h2 id="shortcuts-heading">{t('shortcutsHeading')}</h2>
              <p>{t('shortcutsHelp')}</p>
            </div>
            <button type="button" className="quiet-button" onClick={resetAllShortcuts}>
              {t('resetAll')}
            </button>
          </div>
          <label className="field-label" htmlFor="shortcut-search">
            {t('searchLabel')}
          </label>
          <input
            id="shortcut-search"
            className="text-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
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
                    {isCapturing
                      ? t('pressKeys')
                      : formatShortcutBinding(binding, platform, t('commands:paletteOnly'))}
                  </code>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => startCapture(command.id)}
                    disabled={captureCommand !== null}
                  >
                    {isCapturing ? t('recording') : t('record')}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => resetShortcut(command.id)}
                    aria-label={t('resetAria', { label: command.label })}
                    title={t('resetTitle')}
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
          {notice ?? (dirty ? t('unsavedChanges') : '')}
        </div>
        <div className="settings-footer__actions">
          <button type="button" className="quiet-button" onClick={requestClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void saveSettings()}
            disabled={!dirty || captureCommand !== null}
          >
            {t('save')}
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
            <h2 id="discard-title">{t('discardTitle')}</h2>
            <p>{t('discardPrompt')}</p>
            <div className="decision-dialog__actions">
              <button type="button" className="quiet-button" onClick={() => setClosePrompt(false)}>
                {t('keepEditing')}
              </button>
              <button type="button" className="quiet-button" onClick={discardAndClose}>
                {t('discard')}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setClosePrompt(false);
                  void saveSettings();
                }}
              >
                {t('save')}
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
    <I18nextProvider i18n={settingsI18n}>
      <SettingsApp />
    </I18nextProvider>
  </StrictMode>,
);
