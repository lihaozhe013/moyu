import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createWindowStateStore } from '../../src/main/window/window-state-store';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('window state store', () => {
  it('round-trips validated state through an atomic file write', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'professional-canvas-state-'));
    temporaryDirectories.push(directory);
    const store = createWindowStateStore(directory);
    const state = { width: 1600, height: 1000, x: 20, y: 40, maximized: false } as const;

    await store.save(state);
    await store.flush();

    expect(await store.load()).toEqual(state);
  });

  it('ignores malformed persisted state', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'professional-canvas-state-'));
    temporaryDirectories.push(directory);
    const store = createWindowStateStore(directory);

    expect(await store.load()).toBeUndefined();
  });
});
