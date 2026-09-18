import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createCommandDefinitions,
  shortcutBindingMatchesInput,
  type CommandSummary,
  type ShortcutInput,
  type SupportedPlatform,
} from '../../shared/commands';
import type { CommandId, ContentStatus, GpuDiagnostics } from '../../shared/types';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { ErrorOverlay } from './components/ErrorOverlay/ErrorOverlay';
import { LoadingOverlay } from './components/LoadingOverlay/LoadingOverlay';

function platformForRenderer(): SupportedPlatform {
  return navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32';
}

export default function App(): React.JSX.Element {
  const platform = platformForRenderer();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [gpuOpen, setGpuOpen] = useState(false);
  const [gpuDiagnostics, setGpuDiagnostics] = useState<GpuDiagnostics | null>(null);
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [commands, setCommands] = useState<readonly CommandSummary[]>(() =>
    createCommandDefinitions(platform).map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      scope: definition.scope,
      activation: definition.activation,
      customizable: definition.customizable,
      devOnly: definition.devOnly,
      defaultBinding: definition.defaultBinding,
      binding: definition.defaultBinding,
    })),
  );
  const [contentStatus, setContentStatus] = useState<ContentStatus>({ type: 'idle' });
  const contentHostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const api = window.desktopAPI;
    if (api === undefined) {
      setContentStatus({ type: 'ready' });
      return;
    }

    let active = true;
    void api.commands
      .getSummaries()
      .then((summaries) => {
        if (active) setCommands(summaries);
      })
      .catch(() => undefined);
    const removeOpenListener = api.commands.onPaletteOpen(() => {
      setPaletteOpen(true);
      void api.commands
        .getSummaries()
        .then((summaries) => setCommands(summaries))
        .catch(() => undefined);
    });
    const removeCloseListener = api.commands.onPaletteClose(() => {
      setPaletteOpen(false);
      setAboutOpen(false);
      setGpuOpen(false);
    });
    return () => {
      active = false;
      removeOpenListener();
      removeCloseListener();
    };
  }, []);

  useEffect(() => {
    const api = window.desktopAPI;
    if (api === undefined) return;
    void api.content
      .getState()
      .then((state) => setContentStatus(state))
      .catch(() =>
        setContentStatus({
          type: 'error',
          code: -1,
          description: 'The workspace state could not be read.',
        }),
      );
    return api.content.onStateChange(setContentStatus);
  }, []);

  useEffect(() => {
    const api = window.desktopAPI;
    if (api === undefined) return;
    void api.commands.setOverlayVisible(paletteOpen || aboutOpen || gpuOpen).catch(() => undefined);
  }, [aboutOpen, gpuOpen, paletteOpen]);

  useEffect(() => {
    const api = window.desktopAPI;
    if (api === undefined) return;
    const closeOverlays = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setAboutOpen(false);
        setGpuOpen(false);
      }
    };
    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, []);

  useLayoutEffect(() => {
    const api = window.desktopAPI;
    const element = contentHostRef.current;
    if (api === undefined || element === null) return;

    let animationFrame: number | undefined;
    let previousBounds:
      { x: number; y: number; width: number; height: number; devicePixelRatio: number } | undefined;
    const reportBounds = (): void => {
      animationFrame = undefined;
      const rectangle = element.getBoundingClientRect();
      const nextBounds = {
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height,
        devicePixelRatio: window.devicePixelRatio,
      };
      if (
        previousBounds !== undefined &&
        previousBounds.x === nextBounds.x &&
        previousBounds.y === nextBounds.y &&
        previousBounds.width === nextBounds.width &&
        previousBounds.height === nextBounds.height &&
        previousBounds.devicePixelRatio === nextBounds.devicePixelRatio
      ) {
        return;
      }
      previousBounds = nextBounds;
      void api.layout.setContentBounds(nextBounds).catch(() => undefined);
    };
    const scheduleReport = (): void => {
      if (animationFrame === undefined) animationFrame = requestAnimationFrame(reportBounds);
    };
    const observer = new ResizeObserver(scheduleReport);
    observer.observe(element);
    window.visualViewport?.addEventListener('resize', scheduleReport);
    scheduleReport();
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', scheduleReport);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleCommand = (commandId: CommandId): void => {
    setPaletteOpen(false);
    if (commandId === 'shell.about') {
      setGpuOpen(false);
      setAboutOpen(true);
      return;
    }
    if (commandId === 'shell.gpuDiagnostics') {
      setAboutOpen(false);
      setGpuOpen(true);
      setGpuDiagnostics(null);
      setGpuError(null);
      const getDiagnostics = window.desktopAPI?.diagnostics.getGpuDiagnostics;
      if (getDiagnostics === undefined) {
        setGpuError('GPU diagnostics are unavailable.');
      } else {
        void getDiagnostics()
          .then(setGpuDiagnostics)
          .catch(() => setGpuError('GPU diagnostics are unavailable.'));
      }
      return;
    }
    void window.desktopAPI?.commands.execute(commandId).catch(() => undefined);
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setAboutOpen(false);
        setGpuOpen(false);
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const input: ShortcutInput = {
        code: event.code,
        alt: event.altKey,
        control: event.ctrlKey,
        meta: event.metaKey,
        shift: event.shiftKey,
      };
      const command = commands.find(
        (candidate) =>
          candidate.binding !== undefined && shortcutBindingMatchesInput(candidate.binding, input),
      );
      if (command === undefined) return;
      event.preventDefault();
      if (command.activation === 'hold') return;
      if (command.id === 'palette.open') {
        setPaletteOpen(true);
      } else {
        handleCommand(command.id);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [commands]);

  const showLoading = contentStatus.type === 'loading';
  const showError = contentStatus.type === 'error' || contentStatus.type === 'crashed';

  return (
    <div className="app-shell">
      <main
        className="content-host"
        aria-label="Workspace content"
        data-content-status={contentStatus.type}
        ref={contentHostRef}
      >
        {contentStatus.type === 'ready' || contentStatus.type === 'idle' ? null : (
          <div className="content-skeleton" aria-hidden="true">
            <div className="content-skeleton__topline" />
            <div className="content-skeleton__canvas" />
          </div>
        )}
        {contentStatus.type === 'idle' ? (
          <div className="empty-workspace" role="status">
            <strong>No workspace configured</strong>
            <span>Open Settings with the configured shortcut to add a workspace URL.</span>
          </div>
        ) : null}
        {showLoading ? <LoadingOverlay /> : null}
        {showError && contentStatus.type === 'crashed' ? (
          <ErrorOverlay
            title="Workspace stopped unexpectedly"
            description="The workspace renderer stopped. Use the Reload Workspace shortcut to continue."
          />
        ) : null}
        {showError && contentStatus.type === 'error' ? (
          <ErrorOverlay description={contentStatus.description} errorCode={contentStatus.code} />
        ) : null}
      </main>
      <CommandPalette
        open={paletteOpen}
        onSubmit={handleCommand}
        commands={commands}
        platform={platform}
      />
      {aboutOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="about-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
          >
            <h2 id="about-title">moyu</h2>
            <p>Focused desktop workspace shell.</p>
            <span>Press Escape to close.</span>
          </section>
        </div>
      ) : null}
      {gpuOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="about-dialog gpu-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gpu-title"
          >
            <h2 id="gpu-title">GPU diagnostics</h2>
            {gpuDiagnostics === null && gpuError === null ? (
              <p>Reading capability status…</p>
            ) : null}
            {gpuError === null && gpuDiagnostics !== null ? (
              <dl className="gpu-dialog__details">
                <div>
                  <dt>Electron</dt>
                  <dd>{gpuDiagnostics.electronVersion}</dd>
                </div>
                <div>
                  <dt>Chromium</dt>
                  <dd>{gpuDiagnostics.chromiumVersion}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>
                    {gpuDiagnostics.platform} / {gpuDiagnostics.architecture}
                  </dd>
                </div>
                <div>
                  <dt>Scale</dt>
                  <dd>{gpuDiagnostics.scaleFactors.join(', ') || 'unknown'}</dd>
                </div>
                <div>
                  <dt>WebGL</dt>
                  <dd>{gpuDiagnostics.featureStatus.webgl ?? 'unknown'}</dd>
                </div>
              </dl>
            ) : null}
            {gpuError !== null ? <p role="alert">{gpuError}</p> : null}
            <span>Press Escape to close.</span>
          </section>
        </div>
      ) : null}
    </div>
  );
}
