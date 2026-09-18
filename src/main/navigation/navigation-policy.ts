import type { AppConfig, ValidationResult } from '../../shared/types';
import { originIsAllowed } from './allowed-origins';

export type NavigationDecisionReason =
  | 'allowed-initial-url'
  | 'allowed-application-origin'
  | 'allowed-authentication-origin'
  | 'allowed-development-navigation'
  | 'denied-no-workspace'
  | 'denied-malformed-url'
  | 'denied-credentials'
  | 'denied-protocol'
  | 'denied-origin'
  | 'denied-production-navigation';

export interface NavigationDecision {
  readonly action: 'allow' | 'deny';
  readonly reason: NavigationDecisionReason;
}

function parseTarget(target: string | URL): ValidationResult<URL> {
  if (target instanceof URL) {
    return { success: true, value: target };
  }

  try {
    return { success: true, value: new URL(target) };
  } catch {
    return { success: false, error: 'The navigation target is not a valid URL.' };
  }
}

export function evaluateNavigation(
  target: string | URL,
  config: AppConfig,
  activeWorkspaceUrl = config.content.initialUrl,
): NavigationDecision {
  const parsed = parseTarget(target);
  if (!parsed.success) {
    return { action: 'deny', reason: 'denied-malformed-url' };
  }

  const url = parsed.value;
  if (url.username || url.password) {
    return { action: 'deny', reason: 'denied-credentials' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { action: 'deny', reason: 'denied-protocol' };
  }

  if (activeWorkspaceUrl !== undefined) {
    const workspaceUrl = new URL(activeWorkspaceUrl);
    if (url.href === workspaceUrl.href) {
      return { action: 'allow', reason: 'allowed-initial-url' };
    }
    if (url.origin === workspaceUrl.origin) {
      return { action: 'allow', reason: 'allowed-application-origin' };
    }
  } else {
    return { action: 'deny', reason: 'denied-no-workspace' };
  }

  if (originIsAllowed(url, config.content.allowedOrigins)) {
    return { action: 'allow', reason: 'allowed-application-origin' };
  }

  if (originIsAllowed(url, config.content.authenticationOrigins)) {
    return { action: 'allow', reason: 'allowed-authentication-origin' };
  }

  if (config.mode === 'development' && config.development.allowArbitraryNavigation) {
    return { action: 'allow', reason: 'allowed-development-navigation' };
  }

  return {
    action: 'deny',
    reason: config.mode === 'production' ? 'denied-production-navigation' : 'denied-origin',
  };
}

export function isNavigationAllowed(url: URL, config: AppConfig): boolean {
  return evaluateNavigation(url, config).action === 'allow';
}
