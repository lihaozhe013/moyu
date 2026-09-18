import { describe, expect, it } from 'vitest';
import { getShellContentSecurityPolicy } from '../../src/main/security/csp';

describe('shell content security policy', () => {
  it('keeps production connections local', () => {
    const policy = getShellContentSecurityPolicy('production');
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('allows development server connections only in development', () => {
    const policy = getShellContentSecurityPolicy('development');
    expect(policy).toContain("connect-src 'self' ws: http: https:");
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
  });
});
