import { describe, it, expect } from 'vitest';
import { validateEmail, EMAIL_ERRORS } from '../../utils/validators';

describe('validateEmail', () => {
  it.each(['', '   ', '\t'])('requires a value (%j)', (value) => {
    expect(validateEmail(value)).toBe(EMAIL_ERRORS.required);
  });

  it.each([
    'meow@mail.com',
    'a.b+tag@sub.example.co',
    'cat_01@example.com.tw',
    'UPPER@Example.COM',
    '  meow@mail.com  '
  ])('accepts %j', (value) => {
    expect(validateEmail(value)).toBe('');
  });

  it.each([
    ['no @', 'meowmail.com'],
    ['no domain', 'meow@'],
    ['no local part', '@mail.com'],
    ['no dot in domain', 'meow@mail'],
    ['one-letter TLD', 'meow@mail.c'],
    ['two @', 'me@ow@mail.com'],
    ['space inside', 'me ow@mail.com'],
    ['dot right after @', 'meow@.mail.com'],
    ['trailing dot', 'meow@mail.com.'],
    ['double dot in domain', 'meow@mail..com'],
    ['full-width @', 'meow＠mail.com'],
    ['numeric TLD', 'meow@mail.123']
  ])('rejects %s (%j)', (_label, value) => {
    expect(validateEmail(value)).toBe(EMAIL_ERRORS.invalid);
  });
});
