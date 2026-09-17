import { describe, expect, it } from 'vitest';
import { createAppConfig } from '../../src/main/security/config';
import {
  evaluateNavigation,
  isNavigationAllowed,
} from '../../src/main/navigation/navigation-policy';
import { evaluatePopup } from '../../src/main/navigation/popup-policy';

const productionConfig = createAppConfig({
  mode: 'production',
  initialUrl: 'https://workspace.example.test/workspace',
  allowedOrigins: ['https://workspace.example.test'],
  authenticationOrigins: ['https://login.example.test'],
});

describe('navigation policy', () => {
  it('allows the initial URL, same application origin, and authentication origin', () => {
    expect(evaluateNavigation(productionConfig.content.initialUrl, productionConfig)).toEqual({
      action: 'allow',
      reason: 'allowed-initial-url',
    });
    expect(
      evaluateNavigation('https://workspace.example.test/project/42', productionConfig),
    ).toEqual({ action: 'allow', reason: 'allowed-application-origin' });
    expect(evaluateNavigation('https://login.example.test/sign-in', productionConfig)).toEqual({
      action: 'allow',
      reason: 'allowed-authentication-origin',
    });
  });

  it('denies unknown origins, credentials, malformed URLs, and unsafe protocols', () => {
    expect(
      evaluateNavigation('https://workspace.example.test.evil.test/', productionConfig),
    ).toEqual({
      action: 'deny',
      reason: 'denied-production-navigation',
    });
    expect(
      evaluateNavigation('https://user:pass@workspace.example.test/', productionConfig),
    ).toEqual({
      action: 'deny',
      reason: 'denied-credentials',
    });
    expect(evaluateNavigation('not a URL', productionConfig)).toEqual({
      action: 'deny',
      reason: 'denied-malformed-url',
    });
    expect(evaluateNavigation('javascript:alert(1)', productionConfig)).toEqual({
      action: 'deny',
      reason: 'denied-protocol',
    });
    expect(evaluateNavigation('file:///tmp/private', productionConfig)).toEqual({
      action: 'deny',
      reason: 'denied-protocol',
    });
  });

  it('allows arbitrary HTTP(S) navigation only for explicit development mode', () => {
    const developmentConfig = createAppConfig({
      mode: 'development',
      ...baseDevelopmentInput,
      allowArbitraryNavigation: true,
    });

    expect(evaluateNavigation('https://other.example.test/', developmentConfig)).toEqual({
      action: 'allow',
      reason: 'allowed-development-navigation',
    });
    expect(isNavigationAllowed(new URL('https://other.example.test/'), developmentConfig)).toBe(
      true,
    );
    expect(isNavigationAllowed(new URL('file:///tmp/private'), developmentConfig)).toBe(false);
  });

  it('denies every popup by default', () => {
    expect(evaluatePopup('https://workspace.example.test/popup', productionConfig)).toEqual({
      action: 'deny',
      reason: 'popup-disabled',
    });
    expect(evaluatePopup('https://outside.example.test/popup', productionConfig)).toEqual({
      action: 'deny',
      reason: 'denied-target',
    });
  });
});

const baseDevelopmentInput = {
  initialUrl: 'https://workspace.example.test/workspace',
  allowedOrigins: ['https://workspace.example.test'],
} as const;
