import { describe, expect, it, vi } from 'vitest';
import { createCommandRegistry } from '../../src/main/commands/command-registry';
import { buildApplicationContextMenuTemplate } from '../../src/main/window/context-menu';

const params = { x: 12, y: 24 } as Electron.ContextMenuParams;

describe('application context menu', () => {
  it('keeps production context menus limited to settings', () => {
    const inspectElement = vi.fn();
    const targetContents = { inspectElement } as unknown as Electron.WebContents;
    const template = buildApplicationContextMenuTemplate({
      registry: createCommandRegistry('darwin'),
      platform: 'darwin',
      production: true,
      enableDevTools: false,
      targetContents,
      params,
      executeCommand: vi.fn(),
    });

    expect(template.map((item) => item.label)).toEqual(['Settings…']);
    expect(template[0]?.accelerator).toBe('Command+,');
  });

  it('adds inspect element only for enabled development surfaces', () => {
    const inspectElement = vi.fn();
    const targetContents = { inspectElement } as unknown as Electron.WebContents;
    const template = buildApplicationContextMenuTemplate({
      registry: createCommandRegistry('win32'),
      platform: 'win32',
      production: false,
      enableDevTools: true,
      targetContents,
      params,
      executeCommand: vi.fn(),
    });

    expect(template.map((item) => item.label)).toEqual(['Settings…', 'Inspect Element']);
    template[1]?.click?.(null as never, null as never, null as never);
    expect(inspectElement).toHaveBeenCalledWith(12, 24);
  });
});
