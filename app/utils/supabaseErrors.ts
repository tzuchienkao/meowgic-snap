/**
 * Supabase errors → a few kinds the UI can act on. Auth errors (AuthApiError) carry `status` (e.g. 429)
 * and `code` (e.g. over_email_send_rate_limit); PostgREST errors carry `code` (e.g. PGRST301); a lost
 * connection shows up as AuthRetryableFetchError / a TypeError from fetch.
 */
export enum SupabaseErrorKind {
  /** Too many requests: wait before trying again */
  RateLimit = 'rate_limit',
  /** No connection */
  Network = 'network',
  /** The server rejected the input (e.g. an email it won't send to) */
  InvalidInput = 'invalid_input',
  /** The sign-in link or the session is no longer valid: sign in again */
  Expired = 'expired',
  Unknown = 'unknown',
}

/** Generic copy per kind; a screen can say it more precisely (see constants/auth.ts) */
export const SUPABASE_ERROR_MESSAGES: Record<SupabaseErrorKind, string> = {
  [SupabaseErrorKind.RateLimit]: '太頻繁了喵，請等一下再試',
  [SupabaseErrorKind.Network]: '連不上網路喵，檢查一下再試',
  [SupabaseErrorKind.InvalidInput]: '資料格式不對喵，檢查一下再試',
  [SupabaseErrorKind.Expired]: '登入過期了喵，請重新登入',
  [SupabaseErrorKind.Unknown]: '出了點問題喵，再試一次看看',
};

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_UNAUTHORIZED = 401;

const RATE_LIMIT_CODES = ['over_email_send_rate_limit', 'over_request_rate_limit', 'over_sms_send_rate_limit'];
const INVALID_INPUT_CODES = ['email_address_invalid', 'validation_failed'];
const EXPIRED_CODES = [
  'otp_expired',
  'flow_state_not_found',
  'flow_state_expired',
  'bad_code_verifier',
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  // PostgREST: JWT invalid / expired
  'PGRST301',
  'PGRST303',
];
const NETWORK_ERROR_NAME = 'AuthRetryableFetchError';
const NETWORK_MESSAGE_PATTERN = /failed to fetch|networkerror|load failed|network request failed/i;
/** "For security purposes, you can only request this after 42 seconds." */
const RETRY_AFTER_PATTERN = /after (\d+) seconds?/i;

interface IErrorFields {
  name?: unknown;
  status?: unknown;
  code?: unknown;
  message?: unknown;
}

const fieldsOf = (error: unknown): IErrorFields => (error && typeof error === 'object' ? (error as IErrorFields) : {});

export const getSupabaseErrorKind = (error: unknown): SupabaseErrorKind => {
  const { name, status, code, message } = fieldsOf(error);
  const codeText = typeof code === 'string' ? code : '';
  if (status === HTTP_TOO_MANY_REQUESTS || RATE_LIMIT_CODES.includes(codeText)) return SupabaseErrorKind.RateLimit;
  if (INVALID_INPUT_CODES.includes(codeText)) return SupabaseErrorKind.InvalidInput;
  if (EXPIRED_CODES.includes(codeText) || status === HTTP_UNAUTHORIZED) return SupabaseErrorKind.Expired;
  // fetch rejects with a TypeError whose message depends on the browser
  const isNetworkMessage = typeof message === 'string' && NETWORK_MESSAGE_PATTERN.test(message);
  if (status === 0 || name === NETWORK_ERROR_NAME || isNetworkMessage) return SupabaseErrorKind.Network;
  return SupabaseErrorKind.Unknown;
};

/** Seconds to wait, when a rate-limit error says so in its message */
export const getRetryAfterSeconds = (error: unknown): number | null => {
  const { message } = fieldsOf(error);
  const match = typeof message === 'string' ? RETRY_AFTER_PATTERN.exec(message) : null;
  return match ? Number(match[1]) : null;
};
