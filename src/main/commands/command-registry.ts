import type { CommandId, ShortcutBinding } from '../../shared/types';
import {
  createCommandDefinitions,
  shortcutBindingEquals,
  shortcutBindingFromInput,
  shortcutBindingKey,
  type ShortcutInput,
  type CommandDefinition,
  type CommandScope,
  type CommandSummary,
  type SupportedPlatform,
} from '../../shared/commands';
import { validateShortcutBinding } from '../security/preferences-validation';

export type CommandSurface = 'workspace' | 'settings';

export interface CommandRegistry {
  readonly definitions: readonly CommandDefinition[];
  readonly getBinding: (commandId: CommandId) => ShortcutBinding | undefined;
  readonly getSummaries: () => readonly CommandSummary[];
  readonly getOverrides: () => Readonly<Partial<Record<CommandId, ShortcutBinding>>>;
  readonly setOverrides: (
    overrides: Readonly<Partial<Record<CommandId, ShortcutBinding>>>,
  ) => void;
  readonly match: (
    input: ShortcutInput,
    surface: CommandSurface,
    allowDevelopment: boolean,
  ) => CommandId | undefined;
}

export interface CommandBindingValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly overrides: Readonly<Partial<Record<CommandId, ShortcutBinding>>>;
}

function isScopeAllowed(scope: CommandScope, surface: CommandSurface): boolean {
  return scope === 'application' || surface === 'settings';
}

export function validateCommandOverrides(
  definitions: readonly CommandDefinition[],
  overrides: Readonly<Partial<Record<CommandId, ShortcutBinding>>>,
): CommandBindingValidation {
  const errors: string[] = [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const seen = new Map<string, CommandId>();
  const normalized: Partial<Record<CommandId, ShortcutBinding>> = {};

  for (const [commandId, binding] of Object.entries(overrides)) {
    const definition = definitionById.get(commandId as CommandId);
    if (definition === undefined) {
      errors.push(`Unknown command: ${commandId}.`);
      continue;
    }
    if (!definition.customizable) {
      errors.push(`${commandId} cannot be customized.`);
      continue;
    }
    const validation = validateShortcutBinding(binding);
    if (!validation.success) {
      errors.push(`${commandId}: ${validation.error}`);
      continue;
    }
    const key = shortcutBindingKey(validation.value);
    const previous = seen.get(key);
    if (previous !== undefined) {
      errors.push(`${commandId} conflicts with ${previous}.`);
      continue;
    }
    seen.set(key, commandId as CommandId);
    normalized[commandId as CommandId] = validation.value;
  }

  const resolvedSeen = new Map<string, CommandId>();
  for (const definition of definitions) {
    const binding = normalized[definition.id] ?? definition.defaultBinding;
    if (binding === undefined) {
      continue;
    }
    const key = shortcutBindingKey(binding);
    const previous = resolvedSeen.get(key);
    if (previous !== undefined) {
      errors.push(`${definition.id} conflicts with ${previous}.`);
    } else {
      resolvedSeen.set(key, definition.id);
    }
  }

  return { valid: errors.length === 0, errors, overrides: normalized };
}

export function createCommandRegistry(
  platform: SupportedPlatform,
  initialOverrides: Readonly<Partial<Record<CommandId, ShortcutBinding>>> = {},
): CommandRegistry {
  const definitions = createCommandDefinitions(platform);
  let overrides: Readonly<Partial<Record<CommandId, ShortcutBinding>>> = {};
  const initialValidation = validateCommandOverrides(definitions, initialOverrides);
  if (initialValidation.valid) {
    overrides = initialValidation.overrides;
  }

  const getBinding = (commandId: CommandId): ShortcutBinding | undefined => {
    return overrides[commandId] ?? definitions.find((definition) => definition.id === commandId)?.defaultBinding;
  };

  const getSummaries = (): readonly CommandSummary[] => {
    return definitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      scope: definition.scope,
      customizable: definition.customizable,
      devOnly: definition.devOnly,
      defaultBinding: definition.defaultBinding,
      binding: getBinding(definition.id),
    }));
  };

  return {
    definitions,
    getBinding,
    getSummaries,
    getOverrides: () => overrides,
    setOverrides: (nextOverrides) => {
      const validation = validateCommandOverrides(definitions, nextOverrides);
      if (!validation.valid) {
        throw new Error(validation.errors.join(' '));
      }
      overrides = validation.overrides;
    },
    match: (input, surface, allowDevelopment) => {
      for (const definition of definitions) {
        if (definition.devOnly && !allowDevelopment) {
          continue;
        }
        if (!isScopeAllowed(definition.scope, surface)) {
          continue;
        }
        const binding = getBinding(definition.id);
        if (binding !== undefined && shortcutBindingEquals(binding, shortcutBindingFromInput(input))) {
          return definition.id;
        }
      }
      return undefined;
    },
  };
}
