import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  AppPreferencesV1,
  CommandId,
  PersistedWindowState,
  ShortcutBinding,
} from '../../shared/types';
import type { LanguagePreference } from '../../shared/i18n/languages';
import { sanitizeAppPreferences } from '../security/preferences-validation';
import { validatePersistedWindowState } from '../security/ipc-validation';

export interface PreferencesPatch {
  readonly workspaceUrl?: string | null;
  readonly language?: LanguagePreference;
  readonly shortcuts?: Readonly<Partial<Record<CommandId, ShortcutBinding>>>;
  readonly window?: PersistedWindowState;
}

export interface PreferencesStore {
  readonly load: () => Promise<AppPreferencesV1>;
  readonly get: () => AppPreferencesV1;
  readonly update: (patch: PreferencesPatch) => Promise<AppPreferencesV1>;
  readonly flush: () => Promise<void>;
}

async function readJson(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch {
    return undefined;
  }
}

export function createPreferencesStore(
  userDataPath: string,
  fallbackWindow: PersistedWindowState,
): PreferencesStore {
  const preferencesPath = join(userDataPath, 'preferences.json');
  const legacyWindowPath = join(userDataPath, 'window-state.json');
  let current: AppPreferencesV1 | undefined;
  let pendingWrite = Promise.resolve();

  const load = async (): Promise<AppPreferencesV1> => {
    if (current !== undefined) {
      return current;
    }

    const stored = await readJson(preferencesPath);
    if (stored !== undefined) {
      current = sanitizeAppPreferences(stored, fallbackWindow).preferences;
      return current;
    }

    const legacy = await readJson(legacyWindowPath);
    const legacyValidation = validatePersistedWindowState(legacy);
    current = {
      version: 1,
      shortcuts: {},
      window: legacyValidation.success ? legacyValidation.value : fallbackWindow,
    };
    return current;
  };

  const get = (): AppPreferencesV1 => {
    if (current === undefined) {
      throw new Error('Preferences must be loaded before they are read.');
    }
    return current;
  };

  const update = async (patch: PreferencesPatch): Promise<AppPreferencesV1> => {
    const existing = get();
    const workspaceUrl =
      patch.workspaceUrl === null
        ? undefined
        : patch.workspaceUrl === undefined
          ? existing.workspaceUrl
          : patch.workspaceUrl;
    const candidate: Record<string, unknown> = {
      version: 1,
      shortcuts: patch.shortcuts ?? existing.shortcuts,
      window: patch.window ?? existing.window,
    };
    if (workspaceUrl !== undefined) {
      candidate.workspaceUrl = workspaceUrl;
    }
    const language = patch.language ?? existing.language;
    if (language !== undefined) {
      candidate.language = language;
    }

    const sanitized = sanitizeAppPreferences(candidate, existing.window);
    if (sanitized.issues.length > 0) {
      throw new Error(sanitized.issues.join(' '));
    }
    current = sanitized.preferences;
    const snapshot = current;
    pendingWrite = pendingWrite
      .catch(() => undefined)
      .then(async () => {
        await mkdir(dirname(preferencesPath), { recursive: true });
        const temporaryPath = `${preferencesPath}.tmp`;
        await writeFile(temporaryPath, JSON.stringify(snapshot), 'utf8');
        await rename(temporaryPath, preferencesPath);
      });
    await pendingWrite;
    return snapshot;
  };

  return {
    load,
    get,
    update,
    flush: () => pendingWrite,
  };
}
