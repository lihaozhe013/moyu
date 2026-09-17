interface ToolDefinition {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
}

const tools: readonly ToolDefinition[] = [
  { id: 'select', label: 'Select tool', glyph: '↖' },
  { id: 'move', label: 'Move tool', glyph: '✣' },
  { id: 'frame', label: 'Frame tool', glyph: '□' },
  { id: 'brush', label: 'Brush tool', glyph: '✎' },
  { id: 'measure', label: 'Measure tool', glyph: '⌁' },
];

interface ToolRailProps {
  readonly activeTool: string;
  readonly onToolChange: (toolId: string) => void;
}

export function ToolRail({ activeTool, onToolChange }: ToolRailProps): React.JSX.Element {
  return (
    <aside className="toolrail" aria-label="Workspace tools">
      <div className="toolrail__group">
        {tools.map((tool) => (
          <button
            className={`tool-button${activeTool === tool.id ? ' tool-button--active' : ''}`}
            type="button"
            aria-label={tool.label}
            aria-pressed={activeTool === tool.id}
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
          >
            <span aria-hidden="true">{tool.glyph}</span>
          </button>
        ))}
      </div>
      <div className="toolrail__group toolrail__group--bottom">
        <button className="tool-button" type="button" aria-label="Settings">
          <span aria-hidden="true">⚙</span>
        </button>
      </div>
    </aside>
  );
}
