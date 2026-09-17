interface StatusBarProps {
  readonly activeTool: string;
}

export function StatusBar({ activeTool }: StatusBarProps): React.JSX.Element {
  return (
    <footer className="statusbar" aria-label="Application status bar">
      <div className="statusbar__left">
        <span className="status-dot" aria-hidden="true" />
        <span>Shell ready</span>
        <span className="statusbar__separator" aria-hidden="true" />
        <span>Tool: {activeTool}</span>
      </div>
      <div className="statusbar__right">
        <span>100%</span>
        <span className="statusbar__separator" aria-hidden="true" />
        <span>Ready</span>
      </div>
    </footer>
  );
}
