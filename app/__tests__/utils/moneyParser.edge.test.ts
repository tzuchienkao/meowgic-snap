import { describe, it, expect } from 'vitest';
import {
  parseMoneySnap,
  calculateDenominations,
  countEntryLines,
  ALL_DENOMINATIONS,
  DEFAULT_DENOMINATIONS,
  isBill
} from '../../utils/moneyParser';

const snippet = (content: string) =>
  Array.from(content).length > 20 ? `${Array.from(content).slice(0, 20).join('')}…` : content;
const LINE_ERROR = (line: number, content: string, reason: string) => `第 ${line} 行「${snippet(content)}」${reason}`;
const COMMA_ERROR = (line: number, content: string) => LINE_ERROR(line, content, '少了逗號');
const NAME_MISSING_ERROR = (line: number, content: string) => LINE_ERROR(line, content, '少了姓名');
const AMOUNT_ERROR = (line: number, content: string) => LINE_ERROR(line, content, '不是金額');
const LIMIT_ERROR = '太多了喵，算不動 (=ΦдΦ=)（最多 1,000 筆）';
const CAP_ERROR = (line: number, content: string) => LINE_ERROR(line, content, '金額超過 999,999');

type RejectReason = 'comma' | 'name' | 'amount';
const REJECT_ERRORS: Record<RejectReason, (line: number, content: string) => string> = {
  comma: COMMA_ERROR,
  name: NAME_MISSING_ERROR,
  amount: AMOUNT_ERROR
};

const expectInvariants = (result: ReturnType<typeof parseMoneySnap>) => {
  expect(result.totalEntries).toBe(result.entries.length);
  expect(result.total).toBe(result.entries.reduce((s, e) => s + e.amount, 0));
  expect(result.totalNames).toBe(new Set(result.entries.map(e => e.name)).size);
  expect(result.success).toBe(result.entries.length > 0);
};

const expectRejected = (input: string, reason: RejectReason = 'amount') => {
  const result = parseMoneySnap(input);
  expect(result.success).toBe(false);
  expect(result.entries).toHaveLength(0);
  expect(result.errors).toEqual([REJECT_ERRORS[reason](1, input.trim())]);
  return result;
};

const expectSingleAmount = (input: string, amount: number) => {
  const result = parseMoneySnap(input);
  expect(result.errors).toEqual([]);
  expect(result.entries).toHaveLength(1);
  expect(result.entries[0]!.amount).toBe(amount);
  return result;
};

describe('parseMoneySnap - edge cases', () => {
  describe('Empty and whitespace-only input', () => {
    it.each([
      ['empty string', ''],
      ['spaces only', '   '],
      ['newlines only', '\n\n'],
      ['tab only', '\t'],
      ['CRLF only', '\r\n\r\n'],
      ['mixed whitespace lines', ' \n\t\n  \r\n ']
    ])('should return an empty, error-free result for %s', (_label, input) => {
      const result = parseMoneySnap(input);
      expect(result).toEqual({
        success: false,
        entries: [],
        errors: [],
        total: 0,
        totalEntries: 0,
        totalNames: 0
      });
    });
  });

  describe('Trailing / blank lines', () => {
    it('should not report errors for trailing newline', () => {
      const result = parseMoneySnap('張三,100\n');
      expect(result.entries).toHaveLength(1);
      expect(result.errors).toEqual([]);
    });

    it('should not report errors for trailing whitespace-only lines', () => {
      const result = parseMoneySnap('張三,100\n   \n\t\n');
      expect(result.entries).toHaveLength(1);
      expect(result.errors).toEqual([]);
    });

    it('should accept a trailing lone CR on the last line (removed by trim)', () => {
      const result = parseMoneySnap('張三,100\r');
      expect(result.entries).toEqual([{ name: '張三', amount: 100 }]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Error line numbering', () => {
    it('should count blank lines when numbering errors', () => {
      const result = parseMoneySnap('\n\n張三');
      expect(result.errors).toEqual([COMMA_ERROR(3, '張三')]);
    });

    it('should count blank lines when numbering errors after CRLF normalization', () => {
      const result = parseMoneySnap('張三,100\r\n\r\nbad');
      expect(result.errors).toEqual([COMMA_ERROR(3, 'bad')]);
    });

    it('should report multiple errors in line order', () => {
      const result = parseMoneySnap('bad1\n張三,100\n\nbad2\n李四,abc');
      expect(result.errors).toEqual([COMMA_ERROR(1, 'bad1'), COMMA_ERROR(4, 'bad2'), AMOUNT_ERROR(5, '李四,abc')]);
      expect(result.entries).toEqual([{ name: '張三', amount: 100 }]);
    });
  });

  describe('Error message content', () => {
    it('should include the trimmed line content in the error', () => {
      const result = parseMoneySnap('   bad line   ');
      expect(result.errors).toEqual(['第 1 行「bad line」少了逗號']);
    });

    it('should truncate long line content to 20 characters with an ellipsis', () => {
      const result = parseMoneySnap('這是一行非常非常非常非常非常非常長的錯誤資料,abc');
      expect(result.errors).toEqual(['第 1 行「這是一行非常非常非常非常非常非常長的錯誤…」不是金額']);
    });

    it('should not truncate content of exactly 20 characters', () => {
      const line = '12345678901234567890';
      expect(parseMoneySnap(line).errors).toEqual([`第 1 行「${line}」少了逗號`]);
    });

    it('should count emoji as single characters when truncating', () => {
      const line = '😀'.repeat(25);
      expect(parseMoneySnap(line).errors).toEqual([`第 1 行「${'😀'.repeat(20)}…」少了逗號`]);
    });
  });

  describe('Partial success', () => {
    it('should report success true with non-empty errors when some lines are valid', () => {
      const result = parseMoneySnap('張三,100\nbad\n李四,200');
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([COMMA_ERROR(2, 'bad')]);
      expect(result.total).toBe(300);
      expectInvariants(result);
    });

    it('should report success false when every non-blank line is invalid', () => {
      const result = parseMoneySnap('bad\n\n張三,abc');
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([COMMA_ERROR(1, 'bad'), AMOUNT_ERROR(3, '張三,abc')]);
      expectInvariants(result);
    });
  });

  describe('Names', () => {
    it('should trim whitespace around names', () => {
      const result = parseMoneySnap('  張三  ,100');
      expect(result.entries).toEqual([{ name: '張三', amount: 100 }]);
    });

    it('should trim names so differently padded names count as one', () => {
      const result = parseMoneySnap(' 張三,1\n張三 ,2');
      expect(result.totalNames).toBe(1);
    });

    it('should treat names case-sensitively', () => {
      const result = parseMoneySnap('Alice,1\nalice,1');
      expect(result.totalNames).toBe(2);
    });

    it.each([
      ['English name', 'Alice Wang'],
      ['emoji name', '🐱咪咪'],
      ['Japanese name', 'たなか'],
      ['name with inner spaces', '王 小 明']
    ])('should accept %s', (_label, name) => {
      const result = parseMoneySnap(`${name},100`);
      expect(result.entries).toEqual([{ name, amount: 100 }]);
    });

    it('should reject whitespace-only name', () => {
      expectRejected('   ,100', 'name');
    });

    it('should strip CSV-style surrounding quotes from names and merge with unquoted names', () => {
      const result = parseMoneySnap('"張三",100\n張三,1\n\'張三\',2');
      expect(result.entries.map(e => e.name)).toEqual(['張三', '張三', '張三']);
      expect(result.totalNames).toBe(1);
    });

    it('should trim spaces inside stripped quotes', () => {
      expect(parseMoneySnap('" 張三 ",100').entries[0]!.name).toBe('張三');
    });

    it('should keep quotes that are not a surrounding pair', () => {
      expect(parseMoneySnap("O'Brien,100").entries[0]!.name).toBe("O'Brien");
      expect(parseMoneySnap('"張三,100').entries[0]!.name).toBe('"張三');
      expect(parseMoneySnap('"張三\',100').entries[0]!.name).toBe('"張三\'');
    });

    it('should reject a name that is empty after stripping quotes', () => {
      expectRejected('"",100', 'name');
      expectRejected('"  ",100', 'name');
    });

    it.each([
      ['姓名,金額'],
      ['"姓名","金額"'],
      ['姓名\t金額'],
      ['姓名，金額'],
      ['Name,Amount'],
      ['name,amount'],
      ['名字,金额']
    ])('should skip a header row %j on the first line', (header) => {
      const result = parseMoneySnap(`${header}\n張三,100`);
      expect(result.errors).toEqual([]);
      expect(result.entries).toEqual([{ name: '張三', amount: 100 }]);
    });

    it('should skip a header row that follows leading blank lines', () => {
      const result = parseMoneySnap('\n\n姓名,金額\n張三,100');
      expect(result.errors).toEqual([]);
      expect(result.entries).toHaveLength(1);
    });

    it('should NOT skip a header-like row that is not the first content line', () => {
      const result = parseMoneySnap('張三,100\n姓名,金額');
      expect(result.errors).toEqual([AMOUNT_ERROR(2, '姓名,金額')]);
      expect(result.entries).toHaveLength(1);
    });

    it('should only skip one header row', () => {
      const result = parseMoneySnap('姓名,金額\n姓名,金額\n張三,100');
      expect(result.errors).toEqual([AMOUNT_ERROR(2, '姓名,金額')]);
    });

    it('should NOT treat an unknown non-numeric first row as a header', () => {
      // Only known amount header words are skipped, so real data with a typo is still reported.
      const result = parseMoneySnap('張三,abc\n李四,100');
      expect(result.errors).toEqual([AMOUNT_ERROR(1, '張三,abc')]);
    });

    it('should report header-only input as empty (no entries, no errors)', () => {
      const result = parseMoneySnap('姓名,金額');
      expect(result.success).toBe(false);
      expect(result.entries).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Missing pieces', () => {
    it.each([
      ['name with trailing delimiter only', '張三,', 'amount'],
      ['single comma', ',', 'name'],
      ['single fullwidth comma', '，', 'name'],
      ['whitespace-only amount', '張三,   ', 'amount'],
      ['NT$ only as amount', '張三,NT$', 'amount'],
      ['$ only as amount', '張三,$', 'amount'],
      ['empty double quotes', '張三,""', 'amount'],
      ['empty single quotes', "張三,''", 'amount'],
      ['sign only', '張三,+', 'amount'],
      ['no delimiter, name only', '張三', 'comma'],
      ['no delimiter, digits only', '100', 'comma'],
      ['space as separator', '張三 100', 'comma'],
      ['empty name and amount after a comma', ',abc', 'name']
    ] as [string, string, RejectReason][])('should reject %s', (_label, input, reason) => {
      expectRejected(input, reason);
    });
  });

  describe('Currency and numeric formats', () => {
    it('should accept $ prefix', () => {
      expectSingleAmount('張三,$100', 100);
    });

    it('should accept ￥ prefix', () => {
      expectSingleAmount('張三,￥100', 100);
    });

    it('should accept single-quoted amount', () => {
      expectSingleAmount("張三,'100'", 100);
    });

    it('should accept fullwidth comma as thousand separator in amount', () => {
      expectSingleAmount('張三,"1，000"', 1000);
    });

    it('should accept currency symbol after the number', () => {
      // BY DESIGN — everything after the first delimiter is the amount; symbols/quotes/commas are stripped. currency symbols are removed anywhere in the string, so a suffix "$" is accepted.
      expectSingleAmount('張三,100$', 100);
    });

    it.each([
      ['currency symbols between digits', '張三,1$0$0'],
      ['quotes between digits', '張三,1"0"0'],
      ['letters between digits', '張三,100abc200'],
      ['two separate numbers', '張三,100 元 200'],
      ['decimal point before the number', '張三,.5'],
      ['decimal point after the number', '張三,100.'],
      ['minus after currency', '張三,NT$-100'],
      ['fullwidth minus', '張三,－100'],
      ['another column before the number', '張三,abc,100'],
      ['another column after the number', '張三,100,abc']
    ])('should reject %s (number must be one continuous run)', (_label, input) => {
      expectRejected(input);
    });

    it.each([
      ['元 suffix', '張三,100元', 100],
      ['元 suffix with space', '張三,100 元', 100],
      ['NT$ and 元', '張三,NT$ 1,000 元', 1000],
      ['TWD prefix', '張三,TWD 1,234', 1234],
      ['NTD suffix', '張三,500NTD', 500],
      ['塊 suffix', '張三,50塊', 50],
      ['fullwidth yen', '張三,￥800', 800],
      ['plus sign', '張三,+100', 100],
      ['quoted with 元', '張三,"1,000元"', 1000],
      ['halfwidth yen', '張三,¥800', 800],
      ['lowercase twd', '張三,twd 100', 100],
      ['plus before currency', '張三,+NT$100', 100],
      ['plus after currency', '張三,NT$+100', 100],
      ['smart quotes', '張三,“1,000”', 1000],
      ['currency after number', '張三,100$', 100]
    ])('should accept %s (known currency/unit around the number)', (_label, input, amount) => {
      expectSingleAmount(input, amount);
    });

    describe('Full-width characters (Chinese IME) are converted to half-width', () => {
      it.each([
        ['full-width digits', '張三,１００', 100],
        ['full-width digits with full-width comma grouping', '張三,１，０００', 1000],
        ['full-width digits with half-width comma grouping', '張三,１,０００', 1000],
        ['full-width dollar', '張三,＄100', 100],
        ['NT with full-width dollar', '張三,NT＄100', 100],
        ['full-width NT$', '張三,ＮＴ＄１００', 100],
        ['full-width plus', '張三,＋100', 100],
        ['full-width space around', '張三,\u3000NT$100\u3000', 100],
        ['full-width quotes', '張三,＂1,000＂', 1000],
        ['full-width delimiter and digits', '張三，５００元', 500]
      ])('should accept %s', (_label, input, amount) => {
        expectSingleAmount(input, amount);
      });

      it.each([
        ['full-width minus', '張三,－１００'],
        ['full-width parentheses', '張三,（１００）'],
        ['full-width decimal point', '張三,１００．５'],
        ['full-width percent', '張三,１００％'],
        ['full-width letters between digits', '張三,１Ａ０']
      ])('should still reject %s', (_label, input) => {
        expectRejected(input);
      });

      it('should not convert full-width characters in names', () => {
        expect(parseMoneySnap('ＡＢＣ,100').entries[0]!.name).toBe('ＡＢＣ');
      });
    });

    describe('Taiwan currency words', () => {
      it.each([
        ['新台幣 prefix', '張三,新台幣100', 100],
        ['新台幣 with 元', '張三,新台幣 1,000 元', 1000],
        ['台幣 with 元', '張三,台幣 100元', 100],
        ['元整 suffix', '張三,100 元整', 100],
        ['新台幣 and 元整', '張三,新台幣500元整', 500],
        ['NT space $', '張三,NT $100', 100],
        ['nt space $ lowercase', '張三,nt $ 100', 100]
      ])('should accept %s', (_label, input, amount) => {
        expectSingleAmount(input, amount);
      });

      it.each([
        ['Chinese numerals with 元整', '張三,新台幣伍佰元整'],
        ['整 without 元', '張三,100整'],
        ['NT alone', '張三,NT 100']
      ])('should reject %s', (_label, input) => {
        expectRejected(input);
      });
    });

    describe('Negative amounts are format errors (exchange tool: amounts must be positive)', () => {
      it.each([
        ['accounting parentheses', '張三,(100)'],
        ['accounting parentheses with currency', '張三,NT$(1,000)'],
        ['fullwidth parentheses', '張三,（100）'],
        ['trailing minus', '張三,100-'],
        ['leading minus', '張三,-100'],
        ['minus after currency', '張三,$-100'],
        ['fullwidth minus', '張三,－100'],
        ['refund keyword before', '張三,退款 100'],
        ['refund note after', '張三,100 (退)'],
        ['deduction keyword', '張三,扣 100'],
        ['english refund', '張三,refund 100']
      ])('should reject %s', (_label, input) => {
        expectRejected(input);
      });
    });

    describe('Unknown text around the number is a format error', () => {
      it.each([
        ['approximate', '張三,約100'],
        ['percentage', '張三,100%'],
        ['per month', '張三,100/月'],
        ['fullwidth period', '張三,100元。'],
        ['double plus sign', '張三,++100'],
        ['trailing plus', '張三,100+'],
        ['english words', '張三,100 dollars'],
        ['unknown currency', '張三,USD 100'],
        ['emoji', '張三,100💰']
      ])('should reject %s', (_label, input) => {
        expectRejected(input);
      });
    });

    it('should accept unbalanced quotes', () => {
      // BY DESIGN — everything after the first delimiter is the amount; symbols/quotes/commas are stripped. an unclosed quote is silently stripped.
      expectSingleAmount('張三,"100', 100);
    });

    it.each([
      ['scientific notation', '張三,1e5'],
      ['hex notation', '張三,0x10'],
      ['all zeros', '張三,0000'],
      ['+0', '張三,+0'],
      ['-0', '張三,-0'],
      ['spaces inside digits', '張三,1 000'],
      ['currency with negative sign', '張三,$-100'],
      ['decimal with thousand separators', '張三,"1,000.00"'],
      ['decimal zero', '張三,100.0'],
      ['Infinity literal', '張三,Infinity'],
      ['no digits at all', '張三,NT$元']
    ])('should reject %s', (_label, input) => {
      expectRejected(input);
    });

    it('should accept long leading-zero amount', () => {
      expectSingleAmount('張三,0000000000000000000001', 1);
    });
  });

  describe('Thousand separator validation', () => {
    it.each([
      ['張三,1,000', 1000],
      ['張三,"45,800"', 45800],
      ['張三,NT$999,999', 999999],
      ['張三,$1,234', 1234],
      ['張三,"1，000"', 1000],
      ['張三, NT$ 12,345 ', 12345],
      ['張三\t1,000', 1000]
    ])('should accept correctly grouped %j', (input, amount) => {
      expectSingleAmount(input, amount);
    });

    it.each([
      ['wrong group size', '張三,100,20'],
      ['commas in arbitrary positions', '張三,1,0,0'],
      ['empty column between name and amount', '張三,,100'],
      ['trailing comma', '張三,100,'],
      ['leading group too long', '張三,1000,000'],
      ['group of four digits', '張三,1,0000'],
      ['quoted bad grouping', '張三,"45,80"'],
      ['separator only', '張三,","']
    ])('should reject %s', (_label, input) => {
      expectRejected(input);
    });

    it('should still accept "100,200" because it is a valid thousands grouping', () => {
      // NOTE: inherent ambiguity — "張三,100,200" is indistinguishable from 100,200 and is read as 100200.
      expectSingleAmount('張三,100,200', 100200);
    });

    it('should reject grouped amounts over 999,999 with the per-entry cap error', () => {
      const result = parseMoneySnap('張三,1,000,000');
      expect(result.errors).toEqual([CAP_ERROR(1, '張三,1,000,000')]);
    });
  });

  describe('Delimiter precedence', () => {
    it('should prefer tab over comma, so commas in amount are thousand separators', () => {
      const result = expectSingleAmount('張三\t1,000', 1000);
      expect(result.entries[0]!.name).toBe('張三');
    });

    it('should reject when tab is the delimiter and the name side contains a comma', () => {
      // An extra comma-separated column: read with the comma as delimiter, "三\t100" is not an amount.
      expectRejected('張,三\t100');
    });

    it('should reject when tab is the delimiter and the name side contains a fullwidth comma', () => {
      expectRejected('張，三\t100');
    });

    it('should reject a second tab-separated column', () => {
      expectRejected('張三\t100\t200');
    });

    it('should fall back to comma when the only tab is trailing (trimmed away)', () => {
      const result = expectSingleAmount('張三,100\t', 100);
      expect(result.entries[0]!.name).toBe('張三');
    });

    it('should split on the earliest comma, half- or full-width', () => {
      expect(expectSingleAmount('張三，1,000', 1000).entries[0]!.name).toBe('張三');
      expect(expectSingleAmount('張三,1，000', 1000).entries[0]!.name).toBe('張三');
      expect(expectSingleAmount('張三，"45,800"', 45800).entries[0]!.name).toBe('張三');
    });

    it('should still reject an extra column after an earliest-comma split', () => {
      expectRejected('張，三,18500');
      expectRejected('王,五,100');
    });
  });

  describe('Line endings', () => {
    it('should treat a lone CR (old Mac / Excel export) as a line break', () => {
      const result = parseMoneySnap('張三,100\r李四,200');
      expect(result.entries).toEqual([
        { name: '張三', amount: 100 },
        { name: '李四', amount: 200 }
      ]);
      expect(result.errors).toEqual([]);
    });

    it('should handle mixed CR, LF and CRLF with correct error line numbers', () => {
      const result = parseMoneySnap('張三,100\rbad\r\n李四,200\nbad2');
      expect(result.entries).toHaveLength(2);
      expect(result.errors).toEqual([COMMA_ERROR(2, 'bad'), COMMA_ERROR(4, 'bad2')]);
    });

    it('should count consecutive CRs as blank lines', () => {
      const result = parseMoneySnap('張三,100\r\rbad');
      expect(result.errors).toEqual([COMMA_ERROR(3, 'bad')]);
    });
  });

  describe('Entry limit', () => {
    const validLines = (n: number, amount = 1) =>
      Array.from({ length: n }, (_, i) => `n${i},${amount}`);

    it('should not count invalid lines toward the 1000 limit', () => {
      const lines = validLines(1000);
      lines.splice(500, 0, 'bad', 'bad');
      const result = parseMoneySnap(lines.join('\n'));
      expect(result.entries).toHaveLength(1000);
      expect(result.errors).toEqual([COMMA_ERROR(501, 'bad'), COMMA_ERROR(502, 'bad')]);
      expect(result.errors).not.toContain(LIMIT_ERROR);
    });

    it('should return 1000 entries for 1001 valid lines with a single limit error', () => {
      const result = parseMoneySnap(validLines(1001).join('\n'));
      expect(result.entries).toHaveLength(1000);
      expect(result.errors).toEqual([LIMIT_ERROR]);
      expect(result.entries[999]!.name).toBe('n999');
      expectInvariants(result);
    });

    it('should report the limit error exactly once for many extra lines', () => {
      const result = parseMoneySnap(validLines(1500).join('\n'));
      expect(result.errors.filter(e => e === LIMIT_ERROR)).toHaveLength(1);
    });

    it('should stop processing after the limit, not reporting later invalid lines', () => {
      const lines = [...validLines(1001), 'bad-after-limit'];
      const result = parseMoneySnap(lines.join('\n'));
      expect(result.errors).toEqual([LIMIT_ERROR]);
    });

    it('should still report invalid lines between the 1000th entry and the next valid line', () => {
      const lines = [...validLines(1000), 'bad', 'extra,1', 'bad2'];
      const result = parseMoneySnap(lines.join('\n'));
      expect(result.errors).toEqual([COMMA_ERROR(1001, 'bad'), LIMIT_ERROR]);
    });

    it('should not emit a limit error when only invalid lines follow 1000 entries', () => {
      const lines = [...validLines(1000), 'bad'];
      const result = parseMoneySnap(lines.join('\n'));
      expect(result.errors).toEqual([COMMA_ERROR(1001, 'bad')]);
    });
  });

  describe('Per-entry amount cap (999,999)', () => {
    it('should accept an entry exactly at 999,999 and reject 1,000,000', () => {
      const result = parseMoneySnap('張三,999999\n李四,1000000\n王五,"999,999"\n趙六,NT$1,000,000');
      expect(result.entries).toEqual([
        { name: '張三', amount: 999999 },
        { name: '王五', amount: 999999 }
      ]);
      expect(result.errors).toEqual([CAP_ERROR(2, '李四,1000000'), CAP_ERROR(4, '趙六,NT$1,000,000')]);
      expectInvariants(result);
    });

    it('should keep processing after an over-cap line (not stop)', () => {
      const result = parseMoneySnap('張三,5000000000\nbad\n王五,1');
      expect(result.entries).toEqual([{ name: '王五', amount: 1 }]);
      expect(result.errors).toEqual([CAP_ERROR(1, '張三,5000000000'), COMMA_ERROR(2, 'bad')]);
    });

    it('should reject a single over-cap entry with success=false', () => {
      const result = parseMoneySnap('張三,10000000000');
      expect(result.success).toBe(false);
      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.errors).toEqual([CAP_ERROR(1, '張三,10000000000')]);
    });

    it('should treat digit strings beyond MAX_SAFE_INTEGER as over the cap', () => {
      const result = parseMoneySnap('張三,99999999999999999999999');
      expect(result.entries).toHaveLength(0);
      expect(result.errors).toEqual([CAP_ERROR(1, '張三,99999999999999999999999')]);
    });

    it('should report the per-entry cap on a line after 1000 entries instead of the limit error', () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `n${i},1`);
      lines.push('big,99999999999');
      const result = parseMoneySnap(lines.join('\n'));
      expect(result.entries).toHaveLength(1000);
      expect(result.errors).toEqual([CAP_ERROR(1001, 'big,99999999999')]);
    });
  });

  describe('UTF-8 BOM (Excel "CSV UTF-8" export)', () => {
    it('should ignore a leading BOM before data', () => {
      const result = parseMoneySnap('\uFEFF張三,100\n李四,200');
      expect(result.errors).toEqual([]);
      expect(result.entries[0]).toEqual({ name: '張三', amount: 100 });
    });

    it('should ignore a leading BOM before a header row', () => {
      const result = parseMoneySnap('\uFEFF姓名,金額\r\n張三,100');
      expect(result.errors).toEqual([]);
      expect(result.entries).toEqual([{ name: '張三', amount: 100 }]);
    });
  });

  describe('Zero-width characters (copied from web pages / chat apps)', () => {
    it.each([
      ['zero-width space', '\u200B'],
      ['zero-width non-joiner', '\u200C'],
      ['word joiner', '\u2060'],
      ['BOM in the middle', '\uFEFF']
    ])('should strip %s from names so the same person is merged', (_label, zw) => {
      const result = parseMoneySnap(`張${zw}三,1\n張三,2\n${zw}張三${zw},3`);
      expect(result.errors).toEqual([]);
      expect(result.entries.map(e => e.name)).toEqual(['張三', '張三', '張三']);
      expect(result.totalNames).toBe(1);
    });

    it('should strip zero-width characters inside amounts', () => {
      expectSingleAmount('張三,1\u200B00', 100);
      expectSingleAmount('張三,\u200BNT$1,\u200B000', 1000);
    });

    it('should treat a zero-width-only name as empty', () => {
      const result = parseMoneySnap('\u200B\u200B,100');
      expect(result.entries).toHaveLength(0);
      expect(result.errors).toEqual([NAME_MISSING_ERROR(1, ',100')]);
    });

    it('should treat a zero-width-only line as blank (no error, not counted)', () => {
      const result = parseMoneySnap('張三,1\n\u200B\u2060\n李四,2');
      expect(result.errors).toEqual([]);
      expect(countEntryLines('張三,1\n\u200B\n李四,2')).toBe(2);
    });

    it('should show the cleaned content in error messages', () => {
      expect(parseMoneySnap('b\u200Bad').errors).toEqual([COMMA_ERROR(1, 'bad')]);
    });

    it('should not count zero-width characters toward the 20-character name limit', () => {
      const name = '張'.repeat(20);
      expect(parseMoneySnap(`${name}\u200B\u200B,100`).entries).toEqual([{ name, amount: 100 }]);
    });

    it('should keep the zero-width joiner so emoji sequences stay intact', () => {
      const family = '👨\u200D👩\u200D👧';
      expect(parseMoneySnap(`${family},100`).entries[0]!.name).toBe(family);
    });

    it('should detect a header row containing zero-width characters', () => {
      const result = parseMoneySnap('姓\u200B名,金\u200B額\n張三,1');
      expect(result.errors).toEqual([]);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('Header row variants', () => {
    it.each([['姓名,金額(元)'], ['姓名,金額（元）'], ['姓名,金額 (NT$)'], ['"姓名","金額(元)"']])(
      'should skip header %j',
      (header) => {
        const result = parseMoneySnap(`${header}\n張三,100`);
        expect(result.errors).toEqual([]);
        expect(result.entries).toHaveLength(1);
      }
    );
  });

  describe('countEntryLines', () => {
    it.each([
      ['', 0],
      ['   \n\t\n', 0],
      ['張三,1\n\n李四,2', 2],
      ['姓名,金額\n張三,1\n李四,2', 2],
      ['\n\n姓名,金額\n張三,1', 1],
      ['\uFEFF姓名,金額\r\n張三,1', 1],
      ['姓名,金額', 0],
      ['張三,1\n姓名,金額', 2],
      ['bad\n張三,1', 2],
      ['張三,1\r李四,2\r\n王五,3', 3]
    ])('countEntryLines(%j) → %i', (input, expected) => {
      expect(countEntryLines(input)).toBe(expected);
    });
  });

  describe('Name length (max 20 characters)', () => {
    const NAME_ERROR = (line: number, content: string) => LINE_ERROR(line, content, '姓名超過 20 字');

    it('should accept a name of exactly 20 characters', () => {
      const name = '張'.repeat(20);
      expect(parseMoneySnap(`${name},100`).entries).toEqual([{ name, amount: 100 }]);
    });

    it('should reject a name of 21 characters with the name-length error', () => {
      const line = `${'張'.repeat(21)},100`;
      const result = parseMoneySnap(line);
      expect(result.entries).toHaveLength(0);
      expect(result.errors).toEqual([NAME_ERROR(1, line)]);
    });

    it('should count emoji as one character each', () => {
      expect(parseMoneySnap(`${'😀'.repeat(20)},100`).errors).toEqual([]);
      expect(parseMoneySnap(`${'😀'.repeat(21)},100`).entries).toHaveLength(0);
    });

    it('should measure the name after trimming and stripping quotes', () => {
      const name = 'A'.repeat(20);
      expect(parseMoneySnap(`  "${name}"  ,100`).entries).toEqual([{ name, amount: 100 }]);
    });

    it('should report the invalid amount (not name length) when the amount is also invalid', () => {
      const line = `${'張'.repeat(21)},abc`;
      expect(parseMoneySnap(line).errors).toEqual([AMOUNT_ERROR(1, line)]);
    });

    it('should report the invalid amount (not name length) for a zero amount', () => {
      const line = `${'張'.repeat(21)},0`;
      expect(parseMoneySnap(line).errors).toEqual([AMOUNT_ERROR(1, line)]);
    });

    it('should report name length (not the amount cap) when both apply', () => {
      const line = `${'張'.repeat(21)},1000000`;
      expect(parseMoneySnap(line).errors).toEqual([NAME_ERROR(1, line)]);
    });
  });

  describe('Per-person aggregated cap (999,999)', () => {
    const NAME_CAP_ERROR = (line: number, name: string, content: string) =>
      LINE_ERROR(line, content, `${name} 合計超過 999,999`);

    it('should accept a person whose aggregated total is exactly 999,999', () => {
      const result = parseMoneySnap('張三,500000\n張三,499999');
      expect(result.errors).toEqual([]);
      expect(result.total).toBe(999999);
      expect(result.totalNames).toBe(1);
    });

    it('should reject the line that pushes a person over 999,999', () => {
      const result = parseMoneySnap('張三,999999\n張三,999999');
      expect(result.entries).toEqual([{ name: '張三', amount: 999999 }]);
      expect(result.errors).toEqual([NAME_CAP_ERROR(2, '張三', '張三,999999')]);
      expectInvariants(result);
    });

    it('should keep processing and only reject further lines of the capped person', () => {
      const result = parseMoneySnap('張三,999999\n張三,1\n李四,999999\n張三,1');
      expect(result.entries).toEqual([
        { name: '張三', amount: 999999 },
        { name: '李四', amount: 999999 }
      ]);
      expect(result.errors).toEqual([
        NAME_CAP_ERROR(2, '張三', '張三,1'),
        NAME_CAP_ERROR(4, '張三', '張三,1')
      ]);
    });

    it('should not count a rejected over-cap line toward the person total', () => {
      const result = parseMoneySnap('張三,500000\n張三,600000\n張三,499999');
      expect(result.entries.map(e => e.amount)).toEqual([500000, 499999]);
      expect(result.errors).toEqual([NAME_CAP_ERROR(2, '張三', '張三,600000')]);
    });

    it('should report the single-entry cap (not the person cap) for a single over-cap line', () => {
      const result = parseMoneySnap('張三,1\n張三,1000000');
      expect(result.errors).toEqual([CAP_ERROR(2, '張三,1000000')]);
    });

    it('should treat names case-sensitively for the person cap (Amy vs amy)', () => {
      const result = parseMoneySnap('Amy,999999\namy,999999');
      expect(result.errors).toEqual([]);
      expect(result.totalNames).toBe(2);
    });

    it('should apply the person cap to the trimmed name', () => {
      const result = parseMoneySnap('張三,999999\n  張三  ,1');
      expect(result.errors).toEqual([NAME_CAP_ERROR(2, '張三', '張三  ,1')]);
    });
  });

  describe('Result invariants', () => {
    it.each([
      ['valid mixed', '張三,100\n李四\t2,000\n王五，NT$30\n張三,1'],
      ['with errors', 'bad\n張三,100\n,\n李四,"5,000"'],
      ['cap hit', '張三,9999999990\n李四,10\n王五,1000000']
    ])('should keep totals consistent with entries (%s)', (_label, input) => {
      expectInvariants(parseMoneySnap(input));
    });
  });
});

describe('calculateDenominations - edge cases', () => {
  const reconstruct = (d: Record<number, number>) =>
    Object.entries(d).reduce((s, [k, v]) => s + Number(k) * v, 0);
  const nonZero = (d: Record<number, number>) =>
    Object.fromEntries(Object.entries(d).filter(([, v]) => v > 0));

  describe('denomination sets', () => {
    it('ALL_DENOMINATIONS lists the ten NT$ denominations, large → small', () => {
      expect([...ALL_DENOMINATIONS]).toEqual([2000, 1000, 500, 200, 100, 50, 20, 10, 5, 1]);
      expect(ALL_DENOMINATIONS.filter(isBill)).toEqual([2000, 1000, 500, 200, 100]);
      expect(ALL_DENOMINATIONS.filter((d) => !isBill(d))).toEqual([50, 20, 10, 5, 1]);
    });

    it('DEFAULT_DENOMINATIONS is the common set (no 2000 / 200 / 20)', () => {
      expect([...DEFAULT_DENOMINATIONS]).toEqual([1000, 500, 100, 50, 10, 5, 1]);
      expect(DEFAULT_DENOMINATIONS.every((d) => (ALL_DENOMINATIONS as readonly number[]).includes(d))).toBe(true);
    });

    it('returns exactly the default keys when no set is given', () => {
      const result = calculateDenominations(123);
      expect(Object.keys(result.denominations).map(Number).sort((a, b) => b - a)).toEqual([1000, 500, 100, 50, 10, 5, 1]);
    });

    it('returns exactly the keys of a custom set', () => {
      const result = calculateDenominations(123, ALL_DENOMINATIONS);
      expect(Object.keys(result.denominations).map(Number).sort((a, b) => b - a)).toEqual([...ALL_DENOMINATIONS]);
    });
  });

  it.each([
    [2200, { 1000: 2, 100: 2 }],
    [300, { 100: 3 }],
    [3900, { 1000: 3, 500: 1, 100: 4 }],
    [18500, { 1000: 18, 500: 1 }],
    [40, { 10: 4 }]
  ])('default set breaks down %i greedily', (amount, expected) => {
    const result = calculateDenominations(amount);
    expect(nonZero(result.denominations)).toEqual(Object.fromEntries(Object.entries(expected)));
    expect(reconstruct(result.denominations)).toBe(amount);
    expect(result.remainder).toBe(0);
  });

  it.each([
    [2200, { 2000: 1, 200: 1 }],
    [3900, { 2000: 1, 1000: 1, 500: 1, 200: 2 }],
    [40, { 20: 2 }],
    [75, { 50: 1, 20: 1, 5: 1 }],
    [18500, { 2000: 9, 500: 1 }]
  ])('full set (with 2000 / 200 / 20) breaks down %i greedily', (amount, expected) => {
    const result = calculateDenominations(amount, ALL_DENOMINATIONS);
    expect(nonZero(result.denominations)).toEqual(Object.fromEntries(Object.entries(expected)));
    expect(reconstruct(result.denominations)).toBe(amount);
  });

  it('accepts a set in any order', () => {
    const result = calculateDenominations(1550, [1, 50, 1000, 500]);
    expect(nonZero(result.denominations)).toEqual({ 1000: 1, 500: 1, 50: 1 });
  });

  it('reports what cannot be made as remainder (e.g. NT$1 turned off)', () => {
    const result = calculateDenominations(1003, [1000, 500, 100, 50, 10, 5]);
    expect(nonZero(result.denominations)).toEqual({ 1000: 1 });
    expect(result.remainder).toBe(3);
  });

  it('should echo the unfloored input amount', () => {
    expect(calculateDenominations(1555.99).amount).toBe(1555.99);
  });

  it.each([
    [6, { 5: 1, 1: 1 }],
    [4, { 5: 0, 1: 4 }],
    [9, { 5: 1, 1: 4 }],
    [15, { 10: 1, 5: 1, 1: 0 }]
  ])('should use 5 and 1 coins correctly for %i', (amount, expected) => {
    const result = calculateDenominations(amount);
    for (const [k, v] of Object.entries(expected)) {
      expect(result.denominations[Number(k)]).toBe(v);
    }
    expect(reconstruct(result.denominations)).toBe(amount);
  });

  it('should break down the maximum total 9999999999', () => {
    const result = calculateDenominations(9999999999);
    expect(result.denominations).toEqual({
      1000: 9999999,
      500: 1,
      100: 4,
      50: 1,
      10: 4,
      5: 1,
      1: 4
    });
    expect(reconstruct(result.denominations)).toBe(9999999999);
  });

  it('should return all zeros for amounts below 1', () => {
    const result = calculateDenominations(0.99);
    expect(reconstruct(result.denominations)).toBe(0);
    expect(Object.values(result.denominations).every(v => v === 0)).toBe(true);
    expect(result.remainder).toBe(0);
  });

  it.each([
    ['negative', -150],
    ['NaN', NaN],
    ['-Infinity', -Infinity]
  ])('should return all zeros for %s input and echo it', (_label, amount) => {
    const result = calculateDenominations(amount);
    expect(Object.values(result.denominations).every(v => v === 0)).toBe(true);
    expect(result.amount).toBe(amount);
    expect(result.remainder).toBe(0);
  });

  it('should not hang on Infinity input', () => {
    // NOTE: current behaviour — Infinity yields { 1000: Infinity } because Infinity % 1000 is NaN and later comparisons fail.
    const result = calculateDenominations(Infinity);
    expect(result.denominations).toEqual({ 1000: Infinity, 500: 0, 100: 0, 50: 0, 10: 0, 5: 0, 1: 0 });
    expect(result.remainder).toBe(0);
  });
});
