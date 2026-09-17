interface InspectorProps {
  readonly activeTool: string;
}

export function Inspector({ activeTool }: InspectorProps): React.JSX.Element {
  return (
    <aside className="inspector" aria-label="Inspector panel">
      <div className="panel-heading">
        <span>Inspector</span>
        <button className="panel-action" type="button" aria-label="Collapse inspector">
          ‹
        </button>
      </div>
      <div className="inspector__section">
        <span className="eyebrow">Active tool</span>
        <strong>{activeTool}</strong>
      </div>
      <div className="inspector__section inspector__section--muted">
        <span className="eyebrow">Selection</span>
        <span>No object selected</span>
      </div>
      <div className="inspector__section inspector__section--muted">
        <span className="eyebrow">Canvas</span>
        <span>Waiting for workspace content</span>
      </div>
    </aside>
  );
}
