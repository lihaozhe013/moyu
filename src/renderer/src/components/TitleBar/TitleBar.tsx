function invokeWindowAction(action: (() => Promise<void>) | undefined): void {
  if (action !== undefined) {
    void action().catch(() => undefined);
  }
}

export function TitleBar(): React.JSX.Element {
  const desktopWindow = window.desktopAPI?.window;

  return (
    <header className="titlebar" aria-label="Application title bar">
      <div className="titlebar__brand" aria-label="Professional Canvas">
        <span className="titlebar__mark" aria-hidden="true">
          ◆
        </span>
        <span className="titlebar__name">Professional Canvas</span>
      </div>
      <div className="titlebar__workspace">Workspace</div>
      <div className="titlebar__controls" aria-label="Window controls">
        <button
          className="window-control"
          type="button"
          aria-label="Minimize window"
          onClick={() => invokeWindowAction(desktopWindow?.minimize)}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          className="window-control"
          type="button"
          aria-label="Maximize or restore window"
          onClick={() => invokeWindowAction(desktopWindow?.toggleMaximize)}
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          className="window-control window-control--close"
          type="button"
          aria-label="Close window"
          onClick={() => invokeWindowAction(desktopWindow?.close)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </header>
  );
}
