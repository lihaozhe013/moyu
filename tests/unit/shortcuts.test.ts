import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../../src/shared/types';
import { createCommandRegistry } from '../../src/main/commands/command-registry';
import { installApplicationShortcuts } from '../../src/main/shortcuts/shortcuts';

interface TriggeredInput {
  readonly type: string;
  readonly key: string;
  readonly control: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
  readonly isAutoRepeat?: boolean;
}

class FakeContents {
  private listener:
    ((event: { preventDefault: () => void }, input: TriggeredInput) => void) | undefined;

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
  },
  development: { enableDevTools: true },
  session: { persist: false, partition: 'workspace' },
};

describe('application shortcuts', () => {
  it('handles shortcuts from both shell and content without global registration', () => {
    const shell = new FakeContents();
    const content = new FakeContents();
    const calls: string[] = [];
    const remove = installApplicationShortcuts(
      shell as never,
      content as never,
      config,
      createCommandRegistry('win32'),
      {
        executeCommand: (commandId) => calls.push(commandId),
        dismissOverlays: () => calls.push('dismiss'),
      },
    );

    expect(
      content.trigger({ type: 'keyDown', key: 'K', control: true, meta: false, shift: false }),
    ).toBe(true);
    expect(
      content.trigger({ type: 'keyDown', key: 'R', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(
      shell.trigger({ type: 'keyDown', key: '=', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(
      content.trigger({ type: 'keyDown', key: 'F11', control: false, meta: false, shift: false }),
    ).toBe(true);
    expect(calls).toEqual([
      'palette.open',
      'content.hardReload',
      'content.zoomIn',
      'window.toggleFullscreen',
    ]);

    remove();
    content.trigger({ type: 'keyDown', key: 'R', control: true, meta: false, shift: false });
    expect(calls).toHaveLength(4);
  });

  it('ignores removed default bindings such as development tools', () => {
    const shell = new FakeContents();
    const content = new FakeContents();
    const calls: string[] = [];
    installApplicationShortcuts(
      shell as never,
      content as never,
      config,
      createCommandRegistry('win32'),
      {
        executeCommand: (commandId) => calls.push(commandId),
        dismissOverlays: () => undefined,
      },
    );

    expect(
      shell.trigger({ type: 'keyDown', key: 'I', control: true, meta: false, shift: true }),
    ).toBe(false);
    expect(calls).toEqual([]);
  });
});
