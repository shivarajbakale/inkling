// @vitest-environment node
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, shareData, shareUrl } from '../src/app/share';
import { FIXTURES } from './fixtures';

describe('share links', () => {
  it('round-trips every fixture', async () => {
    for (const src of Object.values(FIXTURES)) expect(await decodeShare(await encodeShare(src))).toBe(src);
  });

  it('round-trips any text, including emoji and quotes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ unit: 'binary', maxLength: 400 }), async (s) => {
        expect(await decodeShare(await encodeShare(s))).toBe(s);
      }),
      { numRuns: 60 },
    );
  });

  it('is URL-safe and compressed', async () => {
    const src = 'a -> b : "hello"\n'.repeat(40);
    const data = await encodeShare(src);
    expect(data).toMatch(/^z[A-Za-z0-9_-]+$/);
    expect(data.length).toBeLessThan(src.length / 4);
  });

  it('reads the plain fallback', async () => {
    const plain = 'u' + Buffer.from('a -> b', 'utf8').toString('base64url');
    expect(await decodeShare(plain)).toBe('a -> b');
  });

  it('explains a damaged link', async () => {
    await expect(decodeShare('z@@@')).rejects.toThrow(/damaged or incomplete/);
    await expect(decodeShare('zAAAA')).rejects.toThrow(/damaged/);
    await expect(decodeShare('')).rejects.toThrow(/damaged/);
  });

  it('builds and reads the hash', async () => {
    const url = await shareUrl('a -> b', 'https://example.org/inkling/');
    expect(url.startsWith('https://example.org/inkling/#/d/z')).toBe(true);
    const data = shareData(new URL(url).hash)!;
    expect(await decodeShare(data)).toBe('a -> b');
    expect(shareData('#library')).toBeNull();
  });
});
