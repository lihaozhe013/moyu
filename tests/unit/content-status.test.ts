import { describe, expect, it } from 'vitest';
import { isCurrentContentEvent } from '../../src/main/window/content-status';

describe('content status event ordering', () => {
  it('accepts events for the active navigation', () => {
    expect(
      isCurrentContentEvent(
        'http://127.0.0.1:4311/',
        'http://127.0.0.1:4311/',
        'http://127.0.0.1:4311/',
      ),
    ).toBe(true);
    expect(isCurrentContentEvent('', 'http://127.0.0.1:4311/', '')).toBe(true);
  });

  it('ignores failures from an obsolete navigation', () => {
    expect(
      isCurrentContentEvent(
        'http://127.0.0.1:4311/old',
        'http://127.0.0.1:4311/new',
        'http://127.0.0.1:4311/new',
      ),
    ).toBe(false);
  });
});
