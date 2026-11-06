import { expect, it } from 'vitest';
import { embedFonts, render } from '../src/core';

it('replaces the font import with inline, subset font faces', async () => {
  const { drawing } = render('title "Hi"\na -> b', {}, { idPrefix: 'f' });
  const svg = new XMLSerializer().serializeToString(drawing.svg);
  const asked: string[] = [];
  const fakeFetch = (async (url: string) => {
    asked.push(url);
    if (url.includes('css2')) return new Response("@font-face { font-family: 'Caveat'; src: url(https://x/caveat.woff2) format('woff2'); }");
    return new Response(new Uint8Array([1, 2, 3]));
  }) as typeof fetch;
  const out = await embedFonts(svg, { fetch: fakeFetch });
  expect(out).not.toContain('@import');
  expect(out).toContain("url(data:font/woff2;base64,AQID) format('woff2')");
  // Only the characters used are requested.
  expect(decodeURIComponent(asked[0])).toMatch(/text=[Hiab]+/);
});
