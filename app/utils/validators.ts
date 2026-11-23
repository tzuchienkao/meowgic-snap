/**
 * Form validators. Each returns an error message (DS copy: state the problem, then how to fix it)
 * or '' when the value is valid.
 */

// Practical email check: something@domain.tld — no spaces, one @, a dot in the domain,
// a 2+ letter TLD. (Full RFC 5322 is not the goal; the magic-link email is the real check.)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

export const EMAIL_ERRORS = {
  required: '請先輸入信箱喵',
  invalid: '信箱格式不對喵，例如 example@mail.com'
} as const;

export function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return EMAIL_ERRORS.required;
  if (!EMAIL_PATTERN.test(email)) return EMAIL_ERRORS.invalid;
  return '';
}
