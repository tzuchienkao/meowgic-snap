import { SupabaseErrorKind } from '~/utils/supabaseErrors';
import { EMAIL_ERRORS } from '~/utils/validators';

/** Supabase's default wait between two magic links to the same email */
export const MAGIC_LINK_COOLDOWN_SECONDS = 60;

/** 登入 dialog: why the magic link was not sent */
export const LOGIN_ERROR_MESSAGES: Record<SupabaseErrorKind, string> = {
  [SupabaseErrorKind.RateLimit]: '寄太多次了喵，等倒數結束再寄',
  [SupabaseErrorKind.Network]: '連不上網路喵，檢查一下再寄',
  [SupabaseErrorKind.InvalidInput]: EMAIL_ERRORS.invalid,
  [SupabaseErrorKind.Expired]: '魔法連結沒有寄出去喵，再試一次看看',
  [SupabaseErrorKind.Unknown]: '魔法連結沒有寄出去喵，再試一次看看',
};

/** /auth/callback: the link did not sign the visitor in */
export const CALLBACK_ERROR_MESSAGES = {
  expired: '這個登入連結過期或已經用過了喵，再寄一次新的',
  failed: '登入沒有成功喵，再寄一次魔法連結看看',
} as const;
