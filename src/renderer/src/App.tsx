import { useEffect, useState } from 'react';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { Inspector } from './components/Inspector/Inspector';
import { LoadingOverlay } from './components/LoadingOverlay/LoadingOverlay';
import { MenuBar } from './components/MenuBar/MenuBar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { TitleBar } from './components/TitleBar/TitleBar';
import { ToolRail } from './components/ToolRail/ToolRail';

export default function App(): React.JSX.Element {
  const [activeTool, setActiveTool] = useState('select');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMacPlatform = navigator.platform.toLowerCase().includes('mac');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (modifierPressed && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`app-shell${isMacPlatform ? ' app-shell--mac' : ''}`}>
      <TitleBar />
      <MenuBar />
      <div className="workspace-frame">
        <ToolRail activeTool={activeTool} onToolChange={setActiveTool} />
        <main className="content-host" aria-label="Workspace content">
          <div className="content-skeleton" aria-hidden="true">
            <div className="content-skeleton__topline" />
            <div className="content-skeleton__canvas" />
          </div>
          <LoadingOverlay />
        </main>
        <Inspector activeTool={activeTool} />
      </div>
      <StatusBar activeTool={activeTool} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
