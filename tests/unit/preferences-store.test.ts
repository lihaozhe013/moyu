import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PersistedWindowState } from '../../src/shared/types';
import { createPreferencesStore } from '../../src/main/preferences/store';

const fallbackWindow: PersistedWindowState = {
  width: 1600,
  height: 1000,
  x: 20,
  y: 30,
  maximized: false,
};

describe('preferences store', () => {
  it('migrates the legacy window state without deleting it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'moyu-preferences-'));
    try {
      const legacyPath = join(directory, 'window-state.json');
      await writeFile(
        legacyPath,
        JSON.stringify({ width: 1200, height: 800, x: 10, y: 15, maximized: true }),
        'utf8',
      );
      const store = createPreferencesStore(directory, fallbackWindow);

      await expect(store.load()).resolves.toMatchObject({
        version: 1,
        shortcuts: {},
        window: { width: 1200, height: 800, x: 10, y: 15, maximized: true },
      });
      await store.update({ workspaceUrl: 'https://workspace.example.test/' });
      await expect(readFile(legacyPath, 'utf8')).resolves.toContain('1200');
      await expect(readFile(join(directory, 'preferences.json'), 'utf8')).resolves.toContain(
        'workspace.example.test',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('serializes updates and preserves unrelated fields', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'moyu-preferences-'));
    try {
      const store = createPreferencesStore(directory, fallbackWindow);
      await store.load();
      await Promise.all([
        store.update({ workspaceUrl: 'https://one.example.test/' }),
        store.update({ window: { ...fallbackWindow, width: 1400 } }),
      ]);

      await expect(store.get()).toMatchObject({
        workspaceUrl: 'https://one.example.test/',
        window: { width: 1400 },
      });
      await store.flush();
      const persisted = JSON.parse(await readFile(join(directory, 'preferences.json'), 'utf8')) as {
        workspaceUrl?: string;
        window?: PersistedWindowState;
      };
      expect(persisted.workspaceUrl).toBe('https://one.example.test/');
      expect(persisted.window?.width).toBe(1400);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
