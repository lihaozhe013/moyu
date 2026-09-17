interface ErrorOverlayProps {
  readonly onRetry?: () => void;
}

export function ErrorOverlay({ onRetry }: ErrorOverlayProps): React.JSX.Element {
  return (
    <div className="error-overlay" role="alert">
      <div className="error-overlay__icon" aria-hidden="true">
        !
      </div>
      <h2>Unable to load workspace</h2>
      <p>The workspace is not available right now. Try again when your connection is ready.</p>
      <button type="button" onClick={onRetry} disabled={onRetry === undefined}>
        Retry
      </button>
    </div>
  );
}
