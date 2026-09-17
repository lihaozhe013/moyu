import type { AppConfig } from '../../shared/types';
import { evaluateNavigation } from './navigation-policy';

export interface PopupDecision {
  readonly action: 'deny';
  readonly reason: 'popup-disabled' | 'denied-target';
}

export function evaluatePopup(target: string | URL, config: AppConfig): PopupDecision {
  const navigation = evaluateNavigation(target, config);
  return {
    action: 'deny',
    reason: navigation.action === 'allow' ? 'popup-disabled' : 'denied-target',
  };
}
