interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps): React.JSX.Element | null {
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
        <div className="command-palette__input-row">
          <span aria-hidden="true">›</span>
          <input autoFocus type="text" placeholder="Type a command" aria-label="Command" />
        </div>
        <p className="command-palette__hint">Esc to close</p>
      </section>
    </div>
  );
}
