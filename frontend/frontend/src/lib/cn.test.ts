import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins truthy parts and normalizes whitespace', () => {
    expect(cn('a', false, 'b', null, '  c  ')).toBe('a b c');
  });

  it('returns empty string when nothing truthy', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});
