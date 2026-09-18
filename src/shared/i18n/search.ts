import type { i18n } from 'i18next';
import type { CommandSummary } from '../commands';
import { SUPPORTED_LANGUAGES } from './languages';

// Command labels arrive already localized, but searching should find commands by
// their name in any supported language, not only the active one.
export function commandSearchText(i18nInstance: i18n, command: CommandSummary): string {
  const parts: string[] = [command.label, command.description, command.id];
  for (const language of SUPPORTED_LANGUAGES) {
    const translate = i18nInstance.getFixedT(language, 'commands');
    parts.push(`${translate(`${command.id}.label`)} ${translate(`${command.id}.description`)}`);
  }
  return parts.join(' ').toLowerCase();
}
