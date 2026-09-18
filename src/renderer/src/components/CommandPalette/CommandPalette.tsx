import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatShortcutBinding,
  type CommandSummary,
  type SupportedPlatform,
} from '../../../../shared/commands';
import type { CommandId } from '../../../../shared/types';
import { commandSearchText } from '../../../../shared/i18n/search';

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
  const { t, i18n } = useTranslation(['shell', 'commands']);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const pressCommands = commands.filter((command) => command.activation === 'press');
    if (normalized.length === 0) return pressCommands;
    return pressCommands.filter((command) => commandSearchText(i18n, command).includes(normalized));
  }, [commands, i18n, query]);

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
        <h2 id="command-palette-title">{t('palette.title')}</h2>
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
              placeholder={t('palette.searchPlaceholder')}
              aria-label={t('palette.commandAria')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </form>
        <div className="command-palette__commands" aria-label={t('palette.availableAria')}>
          {visibleCommands.map((command) => (
            <button
              type="button"
              className="command-palette__command"
              key={command.id}
              onClick={() => onSubmit(command.id)}
            >
              <span>{command.label}</span>
              <code>
                {formatShortcutBinding(command.binding, platform, t('commands:paletteOnly'))}
              </code>
            </button>
          ))}
          {visibleCommands.length === 0 ? (
            <p className="command-palette__empty">{t('palette.empty')}</p>
          ) : null}
        </div>
        <p className="command-palette__hint">{t('palette.hint')}</p>
      </section>
    </div>
  );
}
