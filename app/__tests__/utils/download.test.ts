import { describe, it, expect, vi, afterEach } from 'vitest';
import { drawSlipImage, measureSlipHeight, SLIP_PIXEL_RATIO } from '../../utils/download';
import { buildSlipImageModel } from '../../utils/exporters';
import { DEFAULT_DENOMINATIONS } from '../../utils/moneyParser';

interface IDrawCall {
  op: string;
  args: unknown[];
  fillStyle: unknown;
  font: unknown;
}

/** Recording 2D context (happy-dom has no canvas API). */
function stubCanvas() {
  const calls: IDrawCall[] = [];
  const state: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
      return (...args: unknown[]) => {
        calls.push({ op: String(prop), args, fillStyle: target.fillStyle, font: target.font });
      };
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  });
  const size = { width: 0, height: 0 };
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  Object.defineProperty(proto, 'getContext', {
    value: function (this: HTMLCanvasElement) {
      size.width = this.width;
      size.height = this.height;
      return ctx;
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(proto, 'toBlob', {
    value: (cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' })),
    configurable: true,
    writable: true,
  });
  return { calls, size };
}

const model = buildSlipImageModel({
  totalAmount: 24608,
  totals: { 1000: 23, 500: 2, 100: 5, 50: 1, 10: 5, 5: 1, 1: 3 },
  denominations: DEFAULT_DENOMINATIONS,
  calculatedAt: new Date(2026, 10, 24, 14, 32, 5),
  entryCount: 3,
  name: '十一月',
});

describe('drawSlipImage', () => {
  afterEach(() => {
    const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
    delete proto.getContext;
    delete proto.toBlob;
    vi.restoreAllMocks();
  });

  it('draws a 1080px-wide PNG whose height grows with the rows', async () => {
    const { size } = stubCanvas();
    const blob = await drawSlipImage(model);
    expect(blob.type).toBe('image/png');
    expect(size.width).toBe(1080);
    expect(size.height).toBe(measureSlipHeight(model) * SLIP_PIXEL_RATIO);
    expect(measureSlipHeight({ ...model, lines: model.lines.slice(1) })).toBe(measureSlipHeight(model) - 46);
  });

  it('paints title, time with count, amount, every row with 小計, and the footer', async () => {
    const { calls } = stubCanvas();
    await drawSlipImage(model);
    const texts = calls.filter((c) => c.op === 'fillText').map((c) => c.args[0]);
    expect(texts.slice(0, 4)).toEqual([
      '神機喵算 領款明細｜十一月',
      '計算時間 2026/11/24 14:32:05 · 共 3 筆',
      '24,608',
      ' 元',
    ]);
    expect(texts).toContain('NT$1,000');
    expect(texts).toContain('23 張');
    expect(texts).toContain('小計 23,000');
    expect(texts).toContain('小計 3');
    expect(texts.at(-1)).toBe('<(ΦωΦ)> 喵 喵 喵幫你算');
    calls.filter((c) => c.op === 'fillText').forEach((c) => expect(String(c.font)).toContain('Chiron GoRound TC'));
  });

  it('draws two rotated cat ears and puts the rows on a white card', async () => {
    const { calls } = stubCanvas();
    await drawSlipImage(model);
    expect(calls.filter((c) => c.op === 'rotate')).toHaveLength(2);
    const fills = calls.filter((c) => c.op === 'fill').map((c) => c.fillStyle);
    // 2 ears + hero (hero colour), card (white), 7 rows (bill / coin colours)
    expect(fills.slice(0, 3)).toEqual(['#34404E', '#34404E', '#34404E']);
    expect(fills[3]).toBe('#FFFFFF');
    expect(fills.slice(4)).toEqual([...Array(3).fill('#D3DEE9'), ...Array(4).fill('#E9EEF3')]);
  });

  it('reads colours from the --ms-slip-* CSS variables', async () => {
    document.documentElement.style.setProperty('--ms-slip-card', '#FAFAFA');
    try {
      const { calls } = stubCanvas();
      await drawSlipImage(model);
      expect(calls.filter((c) => c.op === 'fill')[3]!.fillStyle).toBe('#FAFAFA');
    } finally {
      document.documentElement.style.removeProperty('--ms-slip-card');
    }
  });

  it('rejects when the canvas has no 2D context', async () => {
    stubCanvas();
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null, configurable: true, writable: true });
    await expect(drawSlipImage(model)).rejects.toThrow('Canvas 2D is not available');
  });
});
