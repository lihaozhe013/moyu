import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../../src/shared/types';
import { installApplicationShortcuts } from '../../src/main/shortcuts/shortcuts';

interface TriggeredInput {
  readonly type: string;
  readonly key: string;
  readonly control: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
}

class FakeContents {
  private listener:
    ((event: { preventDefault: () => void }, input: TriggeredInput) => void) | undefined;
  readonly sent: string[] = [];

  on(_event: 'before-input-event', listener: typeof this.listener): this {
    this.listener = listener;
    return this;
  }

  removeListener(_event: 'before-input-event', listener: typeof this.listener): this {
    if (this.listener === listener) {
      this.listener = undefined;
    }
    return this;
  }

  send(channel: string): void {
    this.sent.push(channel);
  }

  trigger(input: TriggeredInput): boolean {
    let prevented = false;
    this.listener?.({ preventDefault: () => (prevented = true) }, input);
    return prevented;
  }
}

const config: AppConfig = {
  mode: 'development',
  content: {
    initialUrl: 'https://workspace.example.test/',
    allowedOrigins: ['https://workspace.example.test'],
    authenticationOrigins: [],
  },
  development: { enableDevTools: true, allowArbitraryNavigation: true },
  session: { persist: false, partition: 'workspace' },
};

describe('application shortcuts', () => {
  it('handles shortcuts from both shell and content without global registration', () => {
    const shell = new FakeContents();
    const content = new FakeContents();
    const calls: string[] = [];
    const remove = installApplicationShortcuts(shell as never, content as never, config, {
      reloadContent: () => calls.push('reload'),
      hardReloadContent: () => calls.push('hard-reload'),
      toggleFullscreen: () => calls.push('fullscreen'),
      resetZoom: () => calls.push('reset-zoom'),
      zoomIn: () => calls.push('zoom-in'),
      zoomOut: () => calls.push('zoom-out'),
      openDevTools: () => calls.push('devtools'),
      closePalette: () => calls.push('close-palette'),
    });

    expect(
      content.trigger({ type: 'keyDown', key: 'L', control: false, meta: true, shift: true }),
    ).toBe(true);
    expect(shell.sent).toEqual(['command-palette:open']);
    expect(
      content.trigger({ type: 'keyDown', key: 'R', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(
      shell.trigger({ type: 'keyDown', key: '=', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(
      content.trigger({ type: 'keyDown', key: 'F11', control: false, meta: false, shift: false }),
    ).toBe(true);
    expect(
      shell.trigger({ type: 'keyDown', key: 'I', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(calls).toEqual(['hard-reload', 'zoom-in', 'fullscreen', 'devtools']);

    remove();
    content.trigger({ type: 'keyDown', key: 'R', control: true, meta: false, shift: false });
    expect(calls).toHaveLength(4);
  });

  it('does not open development tools in production', () => {
    const shell = new FakeContents();
    const content = new FakeContents();
    const calls: string[] = [];
    installApplicationShortcuts(
      shell as never,
      content as never,
      {
        ...config,
        mode: 'production',
        development: { enableDevTools: false, allowArbitraryNavigation: false },
      },
      {
        reloadContent: () => undefined,
        hardReloadContent: () => undefined,
        toggleFullscreen: () => undefined,
        resetZoom: () => undefined,
        zoomIn: () => undefined,
        zoomOut: () => undefined,
        openDevTools: () => calls.push('devtools'),
        closePalette: () => undefined,
      },
    );

    expect(
      shell.trigger({ type: 'keyDown', key: 'I', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(calls).toEqual([]);
  });
});
