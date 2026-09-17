export function LoadingOverlay(): React.JSX.Element {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <span className="loading-overlay__spinner" aria-hidden="true" />
      <span>Loading workspace</span>
    </div>
  );
}
