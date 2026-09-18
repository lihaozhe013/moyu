interface ErrorOverlayProps {
  readonly title?: string;
  readonly description?: string;
  readonly errorCode?: number;
}

export function ErrorOverlay({
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
      <span className="error-overlay__hint">Use the Reload Workspace shortcut to try again.</span>
    </div>
  );
}
