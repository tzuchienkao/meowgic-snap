import type { SupabaseErrorKind } from '~/utils/supabaseErrors';

/** What useAuth().signInWithMagicLink() resolves to: sent, or why not (and how long to wait, when known) */
export type ISignInResult =
  | { success: true }
  | { success: false; kind: SupabaseErrorKind; retryAfterSeconds: number | null };

export interface IUser {
  id: string;
  email: string;
  name: string;
  display_name?: string;
}