interface ErrorOverlayProps {
  readonly onRetry?: () => void;
  readonly title?: string;
  readonly description?: string;
  readonly errorCode?: number;
}

export function ErrorOverlay({
  onRetry,
  title = 'Unable to load workspace',
  description = 'The workspace is not available right now. Try again when your connection is ready.',
  errorCode,
}: ErrorOverlayProps): React.JSX.Element {
  return (
    <div className="error-overlay" role="alert">
      <div className="error-overlay__icon" aria-hidden="true">
        !
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {errorCode === undefined ? null : <span>Error code: {errorCode}</span>}
      <button type="button" onClick={onRetry} disabled={onRetry === undefined}>
        Retry
      </button>
    </div>
  );
}
