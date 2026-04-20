import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { getErrorMessage } from './error';

describe('getErrorMessage', () => {
  it('uses ApiError.getDetail for JSON body', () => {
    const e = new ApiError('HTTP 400', 400, JSON.stringify({ detail: 'Nope' }));
    expect(getErrorMessage(e)).toBe('Nope');
  });

  it('falls back to Error.message', () => {
    expect(getErrorMessage(new Error('x'))).toBe('x');
  });

  it('stringifies unknown values', () => {
    expect(getErrorMessage(42)).toBe('42');
  });
});
