import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return commands;
    return commands.filter((command) => commandSearchText(i18n, command).includes(normalized));
  }, [commands, i18n, query]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open) {
    return null;
  }

  // The active index can point past the list after the query narrows the results.
  const boundedIndex = Math.min(activeIndex, Math.max(visibleCommands.length - 1, 0));

  const submit = (): void => {
    const selected = visibleCommands[boundedIndex];
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
              ref={inputRef}
              type="text"
              placeholder={t('palette.searchPlaceholder')}
              aria-label={t('palette.commandAria')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (visibleCommands.length === 0) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((index) => (index + 1) % visibleCommands.length);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex(
                    (index) => (index - 1 + visibleCommands.length) % visibleCommands.length,
                  );
                }
              }}
            />
          </div>
        </form>
        <div className="command-palette__commands" aria-label={t('palette.availableAria')}>
          {visibleCommands.map((command, index) => (
            <button
              type="button"
              className={`command-palette__command${
                index === boundedIndex ? ' command-palette__command--active' : ''
              }`}
              key={command.id}
              ref={index === boundedIndex ? activeItemRef : undefined}
              onMouseEnter={() => setActiveIndex(index)}
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
