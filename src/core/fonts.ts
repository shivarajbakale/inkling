import { HANDS } from './styles';

/**
 * Makes an SVG self-contained: replaces the Google Fonts @import with
 * @font-face rules that carry the font files inline, trimmed to the
 * characters the drawing uses. The result renders anywhere — image viewers,
 * design tools, email — without network access.
 *
 * Needs `fetch` (browsers, Node 18+). Fonts come from Google Fonts unless
 * `cssUrl` points somewhere else.
 */
export interface EmbedOptions {
  /** Builds the stylesheet URL for a family, weights and text. Defaults to Google Fonts with `text=` subsetting. */
  cssUrl?: (family: string, weights: number[], text: string) => string;
  fetch?: typeof fetch;
}

const googleCss = (family: string, weights: number[], text: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${weights.join(';')}&text=${encodeURIComponent(text)}`;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return typeof btoa === 'function' ? btoa(bin) : (globalThis as unknown as { Buffer: { from(s: string, e: string): { toString(e: string): string } } }).Buffer.from(bin, 'binary').toString('base64');
}

export async function embedFonts(svg: string, options: EmbedOptions = {}): Promise<string> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const cssUrl = options.cssUrl ?? googleCss;
  // Which family/weight pairs are used, and which characters.
  const used = new Map<string, { weights: Set<number>; chars: Set<string> }>();
  // Read each <text> tag's attributes in any order.
  const re = /<text\b([^>]*)>([^<]*)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const body = m[2];
    const family = attrs.match(/font-family="'([^']+)'/)?.[1];
    const weight = attrs.match(/font-weight="(\d+)"/)?.[1] ?? '400';
    if (!family) continue;
    const entry = used.get(family) ?? { weights: new Set(), chars: new Set() };
    entry.weights.add(Number(weight));
    for (const ch of body.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')) entry.chars.add(ch);
    used.set(family, entry);
  }
  const faces: string[] = [];
  for (const [family, { weights, chars }] of used) {
    if (!Object.values(HANDS).some((h) => h.family === family)) continue;
    const text = [...chars].join('');
    const css = await (await doFetch(cssUrl(family, [...weights].sort(), text))).text();
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const url = block.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, '');
      if (!url) continue;
      const data = toBase64(await (await doFetch(url)).arrayBuffer());
      const format = url.includes('.woff2') ? 'woff2' : url.includes('.woff') ? 'woff' : 'truetype';
      faces.push(block.replace(/src:[^;]+;/, `src: url(data:font/${format};base64,${data}) format('${format}');`));
    }
  }
  return svg.replace(/<style>@import url\([^)]*\);<\/style>/, `<style>${faces.join('\n')}</style>`);
}
