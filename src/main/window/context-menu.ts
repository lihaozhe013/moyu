import type { ContextMenuParams, MenuItemConstructorOptions, WebContents } from 'electron';
import type { CommandRegistry } from '../commands/command-registry';
import type { CommandId } from '../../shared/types';
import { toElectronAccelerator, type SupportedPlatform } from '../../shared/commands';
import { translate } from '../i18n';

export interface ContextMenuOptions {
  readonly registry: CommandRegistry;
  readonly platform: SupportedPlatform;
  readonly production: boolean;
  readonly enableDevTools: boolean;
  readonly targetContents: WebContents;
  readonly params: ContextMenuParams;
  readonly executeCommand: (commandId: CommandId) => void;
}

export function buildApplicationContextMenuTemplate(
  options: ContextMenuOptions,
): MenuItemConstructorOptions[] {
  const settingsAccelerator = toElectronAccelerator(
    options.registry.getBinding('settings.open'),
    options.platform,
  );
  const template: MenuItemConstructorOptions[] = [
    {
      label: translate('menus:settings'),
      ...(settingsAccelerator === undefined ? {} : { accelerator: settingsAccelerator }),
      click: () => options.executeCommand('settings.open'),
    },
  ];
  if (!options.production && options.enableDevTools) {
    template.push({
      label: translate('menus:inspectElement'),
      click: () => options.targetContents.inspectElement(options.params.x, options.params.y),
    });
  }
  return template;
}
