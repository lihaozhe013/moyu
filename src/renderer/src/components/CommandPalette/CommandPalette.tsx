import { useEffect, useMemo, useState } from 'react';
import {
  formatShortcutBinding,
  type CommandSummary,
  type SupportedPlatform,
} from '../../../../shared/commands';
import type { CommandId } from '../../../../shared/types';

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onSubmit: (commandId: CommandId) => void;
  readonly commands: readonly CommandSummary[];
  readonly platform: SupportedPlatform;
}

export function CommandPalette({
  open,
  onSubmit,
  commands,
  platform,
}: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.description} ${command.id}`.toLowerCase().includes(normalized),
    );
  }, [commands, query]);

  if (!open) {
    return null;
  }

  const submit = (): void => {
    const selected = visibleCommands[0];
    if (selected !== undefined) {
      onSubmit(selected.id);
    }
  };

  return (
    <div className="command-palette-backdrop" role="presentation">
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
      >
        <h2 id="command-palette-title">Command Palette</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="command-palette__input-row">
            <span aria-hidden="true">›</span>
            <input
              autoFocus
              type="text"
              placeholder="Search commands"
              aria-label="Command"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </form>
        <div className="command-palette__commands" aria-label="Available commands">
          {visibleCommands.map((command) => (
            <button
              type="button"
              className="command-palette__command"
              key={command.id}
              onClick={() => onSubmit(command.id)}
            >
              <span>{command.label}</span>
              <code>{formatShortcutBinding(command.binding, platform)}</code>
            </button>
          ))}
          {visibleCommands.length === 0 ? (
            <p className="command-palette__empty">No matching commands</p>
          ) : null}
        </div>
        <p className="command-palette__hint">Enter to run · Escape to close</p>
      </section>
    </div>
  );
}
