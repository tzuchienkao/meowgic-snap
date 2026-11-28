import { describe, it, expect } from 'vitest';
import { getRetryAfterSeconds, getSupabaseErrorKind, SupabaseErrorKind } from '../../utils/supabaseErrors';

describe('utils/supabaseErrors', () => {
  it.each([
    [{ name: 'AuthApiError', status: 429, code: 'over_email_send_rate_limit' }, SupabaseErrorKind.RateLimit],
    [{ status: 429 }, SupabaseErrorKind.RateLimit],
    [{ code: 'over_request_rate_limit' }, SupabaseErrorKind.RateLimit],
    [{ name: 'AuthRetryableFetchError', status: 0, message: '{}' }, SupabaseErrorKind.Network],
    [new TypeError('Failed to fetch'), SupabaseErrorKind.Network],
    [{ message: 'TypeError: NetworkError when attempting to fetch resource.' }, SupabaseErrorKind.Network],
    [{ status: 400, code: 'email_address_invalid' }, SupabaseErrorKind.InvalidInput],
    [{ status: 400, code: 'captcha_failed' }, SupabaseErrorKind.Captcha],
    [{ code: 'otp_expired' }, SupabaseErrorKind.Expired],
    [{ code: 'bad_code_verifier' }, SupabaseErrorKind.Expired],
    [{ code: 'PGRST301' }, SupabaseErrorKind.Expired],
    [{ status: 401 }, SupabaseErrorKind.Expired],
    [{ status: 500, message: 'Internal Server Error' }, SupabaseErrorKind.Unknown],
    [new TypeError("Cannot read properties of undefined (reading 'auth')"), SupabaseErrorKind.Unknown],
    [null, SupabaseErrorKind.Unknown],
    ['boom', SupabaseErrorKind.Unknown],
  ])('%o → %s', (error, kind) => {
    expect(getSupabaseErrorKind(error)).toBe(kind);
  });

  it('getRetryAfterSeconds reads the wait from a rate-limit message', () => {
    expect(getRetryAfterSeconds({ message: 'For security purposes, you can only request this after 42 seconds.' })).toBe(42);
    expect(getRetryAfterSeconds({ message: 'Email rate limit exceeded' })).toBeNull();
    expect(getRetryAfterSeconds(undefined)).toBeNull();
  });
});
