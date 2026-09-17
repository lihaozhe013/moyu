import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PersistedWindowState } from '../../shared/types';
import { validatePersistedWindowState } from '../security/ipc-validation';

export interface WindowStateStore {
  readonly load: () => Promise<PersistedWindowState | undefined>;
  readonly save: (state: PersistedWindowState) => Promise<void>;
  readonly flush: () => Promise<void>;
}

export function createWindowStateStore(userDataPath: string): WindowStateStore {
  const statePath = join(userDataPath, 'window-state.json');
  let pendingWrite = Promise.resolve();

  const load = async (): Promise<PersistedWindowState | undefined> => {
    try {
      const raw = await readFile(statePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      const validation = validatePersistedWindowState(parsed);
      return validation.success ? validation.value : undefined;
    } catch {
      return undefined;
    }
  };

  const save = async (state: PersistedWindowState): Promise<void> => {
    pendingWrite = pendingWrite.then(async () => {
      await mkdir(dirname(statePath), { recursive: true });
      const temporaryPath = `${statePath}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(state), 'utf8');
      await rename(temporaryPath, statePath);
    });
    await pendingWrite;
  };

  return {
    load,
    save,
    flush: () => pendingWrite,
  };
}
