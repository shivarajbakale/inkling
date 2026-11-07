import { expect, it } from 'vitest';
import { embedFonts, render } from '../src/core';

// A tiny stand-in for a WOFF2 file: the signature, then padding.
const woff2 = new Uint8Array(120);
woff2.set([0x77, 0x4f, 0x46, 0x32]);

it('replaces the font import with inline, subset font faces', async () => {
  const { drawing } = render('title "Hi"\na -> b', {}, { idPrefix: 'f' });
  const svg = new XMLSerializer().serializeToString(drawing.svg);
  const asked: string[] = [];
  const fakeFetch = (async (url: string) => {
    asked.push(url);
    if (url.includes('css2')) return new Response("@font-face { font-family: 'Caveat'; src: url(https://x/caveat.woff2) format('woff2'); }");
    return new Response(woff2);
  }) as typeof fetch;
  const out = await embedFonts(svg, { fetch: fakeFetch });
  expect(out).not.toContain('@import');
  expect(out).toContain("url(data:font/woff2;base64,d09GMgAA");
  // Only the characters used are requested.
  expect(decodeURIComponent(asked[0])).toMatch(/text=[Hiab]+/);
});

it('refuses to embed an error page as a font, after one retry', async () => {
  const { drawing } = render('a -> b', {}, { idPrefix: 'f' });
  const svg = new XMLSerializer().serializeToString(drawing.svg);
  let fontCalls = 0;
  const fakeFetch = (async (url: string) => {
    if (url.includes('css2')) return new Response("@font-face { font-family: 'Caveat'; src: url(https://x/caveat.ttf); }");
    fontCalls++;
    return new Response('<!DOCTYPE html><html>Too many requests</html>'.padEnd(200));
  }) as typeof fetch;
  await expect(embedFonts(svg, { fetch: fakeFetch })).rejects.toThrow(/Could not download fonts .*not a font/);
  expect(fontCalls).toBe(2);
});
