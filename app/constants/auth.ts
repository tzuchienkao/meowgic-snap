import { SupabaseErrorKind } from '~/utils/supabaseErrors';
import { EMAIL_ERRORS } from '~/utils/validators';

/** Wait between two magic links to the same email (Supabase Auth → Rate Limits, set to 120s) */
export const MAGIC_LINK_COOLDOWN_SECONDS = 120;

/** 登入 dialog: why the magic link was not sent */
export const LOGIN_ERROR_MESSAGES: Record<SupabaseErrorKind, string> = {
  [SupabaseErrorKind.RateLimit]: '寄太多次了喵，等倒數結束再寄',
  [SupabaseErrorKind.Network]: '連不上網路喵，檢查一下再寄',
  [SupabaseErrorKind.InvalidInput]: EMAIL_ERRORS.invalid,
  [SupabaseErrorKind.Captcha]: '人機驗證沒有通過喵，再驗證一次',
  [SupabaseErrorKind.Expired]: '魔法連結沒有寄出去喵，再試一次看看',
  [SupabaseErrorKind.Unknown]: '魔法連結沒有寄出去喵，再試一次看看',
};

/** 登入 dialog: the Turnstile widget could not load or run */
export const CAPTCHA_LOAD_FAILED_MESSAGE = '人機驗證載入失敗喵，重新整理頁面再試一次';

/** /auth/callback: the link did not sign the visitor in */
export const CALLBACK_ERROR_MESSAGES = {
  expired: '這個登入連結過期或已經用過了喵，再寄一次新的',
  failed: '登入沒有成功喵，再寄一次魔法連結看看',
} as const;
