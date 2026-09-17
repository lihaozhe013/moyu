const menuItems = ['File', 'Edit', 'View', 'Workspace', 'Help'];

export function MenuBar(): React.JSX.Element {
  return (
    <nav className="menubar" aria-label="Application menu">
      <div className="menubar__items">
        {menuItems.map((item) => (
          <button className="menu-item" type="button" key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="menubar__context" aria-label="Workspace status">
        <span className="status-dot" aria-hidden="true" />
        <span>Connected workspace</span>
      </div>
    </nav>
  );
}
