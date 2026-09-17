import { useEffect, useState } from 'react';

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (query: string) => void;
  readonly commands: readonly string[];
}

export function CommandPalette({
  open,
  onClose,
  onSubmit,
  commands,
}: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="command-palette-title">Open location or command</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(query);
          }}
        >
          <div className="command-palette__input-row">
            <span aria-hidden="true">›</span>
            <input
              autoFocus
              type="text"
              placeholder="Type a command"
              aria-label="Command"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </form>
        <div className="command-palette__commands" aria-label="Available commands">
          {commands.map((command) => (
            <button
              type="button"
              className="command-palette__command"
              key={command}
              onClick={() => onSubmit(command)}
            >
              {command}
            </button>
          ))}
        </div>
        <p className="command-palette__hint">Esc to close</p>
      </section>
    </div>
  );
}
