import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ContentStatus } from '../../shared/types';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { ErrorOverlay } from './components/ErrorOverlay/ErrorOverlay';
import { Inspector } from './components/Inspector/Inspector';
import { LoadingOverlay } from './components/LoadingOverlay/LoadingOverlay';
import { MenuBar } from './components/MenuBar/MenuBar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { TitleBar } from './components/TitleBar/TitleBar';
import { ToolRail } from './components/ToolRail/ToolRail';

export default function App(): React.JSX.Element {
  const [activeTool, setActiveTool] = useState('select');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [contentStatus, setContentStatus] = useState<ContentStatus>({ type: 'loading' });
  const contentHostRef = useRef<HTMLElement | null>(null);
  const isMacPlatform = navigator.platform.toLowerCase().includes('mac');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (modifierPressed && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const api = window.desktopAPI;
    if (api === undefined) {
      return;
    }

    let active = true;
    void api.content
      .getZoomFactor()
      .then((factor) => {
        if (active) {
          setZoomFactor(factor);
        }
      })
      .catch(() => undefined);
    const removeZoomListener = api.content.onZoomChange((factor) => {
      if (active) {
        setZoomFactor(factor);
      }
    });
    const removeOpenListener = api.commands.onPaletteOpen(() => setPaletteOpen(true));
    const removeCloseListener = api.commands.onPaletteClose(() => setPaletteOpen(false));
    return () => {
      active = false;
      removeZoomListener();
      removeOpenListener();
      removeCloseListener();
    };
  }, []);

  useEffect(() => {
    const api = window.desktopAPI;
    if (api === undefined) {
      setContentStatus({ type: 'ready' });
      return;
    }

    let active = true;
    void api.content
      .getState()
      .then((state) => {
        if (active) {
          setContentStatus(state.type === 'idle' ? { type: 'loading' } : state);
        }
      })
      .catch(() => {
        if (active) {
          setContentStatus({
            type: 'error',
            code: -1,
            description: 'The workspace state could not be read.',
          });
        }
      });

    const removeListener = api.content.onStateChange((state) => {
      if (active) {
        setContentStatus(state);
      }
    });
    return () => {
      active = false;
      removeListener();
    };
  }, []);

  useLayoutEffect(() => {
    const api = window.desktopAPI;
    const element = contentHostRef.current;
    if (api === undefined || element === null) {
      return;
    }

    let animationFrame: number | undefined;
    let previousBounds:
      | {
          x: number;
          y: number;
          width: number;
          height: number;
          devicePixelRatio: number;
        }
      | undefined;
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
      if (animationFrame === undefined) {
        animationFrame = requestAnimationFrame(reportBounds);
      }
    };
    const observer = new ResizeObserver(scheduleReport);
    observer.observe(element);
    window.visualViewport?.addEventListener('resize', scheduleReport);
    scheduleReport();

    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', scheduleReport);
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const retryContent = (): void => {
    const reload = window.desktopAPI?.content.reload;
    if (reload !== undefined) {
      void reload().catch(() => undefined);
    }
  };

  const handleCommand = (query: string): void => {
    const command = query.trim().toLowerCase();
    setPaletteOpen(false);
    if (command === 'about') {
      setAboutOpen(true);
      return;
    }
    if (command === 'workspace' || command === 'reload') {
      const reload = window.desktopAPI?.content.reload;
      if (reload !== undefined) {
        void reload().catch(() => undefined);
      }
    }
  };

  const showLoading = contentStatus.type === 'loading' || contentStatus.type === 'idle';
  const showError = contentStatus.type === 'error' || contentStatus.type === 'crashed';

  return (
    <div className={`app-shell${isMacPlatform ? ' app-shell--mac' : ''}`}>
      <TitleBar />
      <MenuBar />
      <div className="workspace-frame">
        <ToolRail activeTool={activeTool} onToolChange={setActiveTool} />
        <main className="content-host" aria-label="Workspace content" ref={contentHostRef}>
          {contentStatus.type === 'ready' ? null : (
            <div className="content-skeleton" aria-hidden="true">
              <div className="content-skeleton__topline" />
              <div className="content-skeleton__canvas" />
            </div>
          )}
          {showLoading ? <LoadingOverlay /> : null}
          {showError && contentStatus.type === 'crashed' ? (
            <ErrorOverlay
              onRetry={retryContent}
              title="Workspace stopped unexpectedly"
              description="The workspace renderer stopped. Reload the workspace to continue."
            />
          ) : null}
          {showError && contentStatus.type === 'error' ? (
            <ErrorOverlay
              onRetry={retryContent}
              description={contentStatus.description}
              errorCode={contentStatus.code}
            />
          ) : null}
        </main>
        <Inspector activeTool={activeTool} />
      </div>
      <StatusBar activeTool={activeTool} zoomFactor={zoomFactor} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSubmit={handleCommand}
        commands={['workspace', 'reload', 'about']}
      />
      {aboutOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAboutOpen(false)}>
          <section
            className="about-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="about-title">Professional Canvas</h2>
            <p>Focused desktop workspace shell.</p>
            <button type="button" onClick={() => setAboutOpen(false)}>
              Close
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
