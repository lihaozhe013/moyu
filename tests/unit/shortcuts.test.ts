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
      content.trigger({ type: 'keyDown', key: 'L', control: true, meta: false, shift: true }),
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
    expect(calls).toEqual([
      'content.hardReload',
      'content.zoomIn',
      'window.toggleFullscreen',
      'devtools.open',
    ]);

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
        development: { enableDevTools: false },
      },
      createCommandRegistry('win32'),
      {
        executeCommand: (commandId) => {
          if (commandId !== 'devtools.open') {
            calls.push(commandId);
          }
        },
        dismissOverlays: () => undefined,
      },
    );

    expect(
      shell.trigger({ type: 'keyDown', key: 'I', control: true, meta: false, shift: true }),
    ).toBe(true);
    expect(calls).toEqual([]);
  });

  it('activates and deactivates the workspace hold shortcut on key release', () => {
    const shell = new FakeContents();
    const content = new FakeContents();
    const holdModes: boolean[] = [];
    const remove = installApplicationShortcuts(
      shell as never,
      content as never,
      config,
      createCommandRegistry('win32'),
      {
        executeCommand: () => undefined,
        dismissOverlays: () => undefined,
        setHoldMode: (active) => holdModes.push(active),
      },
    );

    expect(
      content.trigger({
        type: 'keyDown',
        key: 'Space',
        control: true,
        meta: false,
        shift: true,
      }),
    ).toBe(true);
    expect(holdModes).toEqual([true]);
    expect(
      content.trigger({
        type: 'keyDown',
        key: 'Space',
        control: true,
        meta: false,
        shift: true,
        isAutoRepeat: true,
      }),
    ).toBe(true);
    expect(
      shell.trigger({
        type: 'keyUp',
        key: 'Space',
        control: true,
        meta: false,
        shift: true,
      }),
    ).toBe(true);
    expect(holdModes).toEqual([true, false]);

    remove();
  });

  it('deactivates a hold shortcut when a required modifier is released', () => {
    const shell = new FakeContents();
    const content = new FakeContents();
    const holdModes: boolean[] = [];
    installApplicationShortcuts(
      shell as never,
      content as never,
      config,
      createCommandRegistry('win32'),
      {
        executeCommand: () => undefined,
        dismissOverlays: () => undefined,
        setHoldMode: (active) => holdModes.push(active),
      },
    );

    content.trigger({
      type: 'keyDown',
      key: 'Space',
      control: true,
      meta: false,
      shift: true,
    });
    expect(
      content.trigger({
        type: 'keyUp',
        key: 'Shift',
        control: true,
        meta: false,
        shift: false,
      }),
    ).toBe(true);
    expect(holdModes).toEqual([true, false]);
  });
});
