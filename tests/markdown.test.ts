// @vitest-environment node
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it, vi } from 'vitest';
import { inklingMarkdownIt } from '../src/markdown/markdown-it';
import { parseInfo, tokenizeInfo } from '../src/markdown/info';
import { remarkInkling, type InklingMarkdownOptions } from '../src/markdown/remark';

const quiet = { warn: () => {} };

async function viaRemark(md: string, options: InklingMarkdownOptions = {}, path?: string): Promise<string> {
  const file = { value: md, path } as unknown as string;
  return String(await unified().use(remarkParse).use(remarkInkling, options).use(remarkRehype).use(rehypeStringify).process(file));
}

function viaMarkdownIt(md: string, options: InklingMarkdownOptions = {}, env: Record<string, unknown> = {}): string {
  return new MarkdownIt().use(inklingMarkdownIt, options).render(md, env);
}

const RENDERERS = { remark: viaRemark, 'markdown-it': async (md: string, o?: InklingMarkdownOptions) => viaMarkdownIt(md, o) };

const page = (html: string) => new JSDOM(html).window.document;
const fence = (source: string, info = '') => '# Title\n\n```inkling' + (info ? ' ' + info : '') + '\n' + source + '\n```\n\nAfter.\n';

describe('info string', () => {
  it('reads settings, flags and quoted values', () => {
    const info = parseInfo('paper=chalkboard autoplay height=320 alt="The water \\"cycle\\"" controls=none mode=svg seed=3');
    expect(info.settings).toEqual({ paper: 'chalkboard', seed: '3' });
    expect(info.autoplay).toBe(true);
    expect(info.controls).toBe(false);
    expect(info.height).toBe(320);
    expect(info.alt).toBe('The water "cycle"');
    expect(info.mode).toBe('svg');
    expect(info.problems).toEqual([]);
  });

  it('accepts single quotes and empty info', () => {
    expect(tokenizeInfo(`alt='a b' x`)).toEqual([
      { key: 'alt', value: 'a b' },
      { key: 'x', value: null },
    ]);
    expect(parseInfo('')).toMatchObject({ settings: {}, autoplay: false, controls: true, problems: [] });
    expect(parseInfo(undefined).problems).toEqual([]);
  });

  it('names problems', () => {
    expect(parseInfo('colour=red').problems[0]).toMatch(/Unknown fence option "colour"/);
    expect(parseInfo('height=tall').problems[0]).toMatch(/height/);
    expect(parseInfo('mode=pdf').problems[0]).toMatch(/mode/);
    expect(parseInfo('paper').problems[0]).toMatch(/needs a value/);
  });
});

describe.each(Object.entries(RENDERERS))('%s plugin', (_name, run) => {
  it('client mode: a fence becomes <inkling-diagram> with the source as text', async () => {
    const doc = page(await run(fence('a -> b : "hi"', 'paper=napkin autoplay controls=none height=300 alt="Two boxes"'), quiet));
    const el = doc.querySelector('inkling-diagram')!;
    expect(el).not.toBeNull();
    expect(el.textContent!.trim()).toBe('a -> b : "hi"');
    expect(el.getAttribute('paper')).toBe('napkin');
    expect(el.hasAttribute('autoplay')).toBe(true);
    expect(el.getAttribute('controls')).toBe('none');
    expect(el.getAttribute('aria-label')).toBe('Two boxes');
    expect(el.getAttribute('style')).toContain('min-height:300px');
    expect(doc.querySelector('h1')?.textContent).toBe('Title');
    expect(doc.body.textContent).toContain('After.');
  });

  it('escapes sources that try to break out', async () => {
    const nasty = 'a: box "</inkling-diagram><script>alert(1)</script>"\nb: box "\'quoted\' & \\"double\\""\na -> b';
    // CommonMark unescapes backslashes in info strings, so quotes inside a value use the other quote.
    const html = await run(fence(nasty, `alt='say "hi" <b>'`), quiet);
    const doc = page(html);
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(doc.querySelectorAll('inkling-diagram')).toHaveLength(1);
    expect(doc.querySelector('inkling-diagram')!.textContent!.trim()).toBe(nasty);
    expect(doc.querySelector('inkling-diagram')!.getAttribute('aria-label')).toBe('say "hi" <b>');
    expect(html).not.toContain('<script>');
  });

  it('settings the element cannot take as attributes go into the source', async () => {
    const doc = page(await run(fence('a -> b', 'layout=down'), quiet));
    expect(doc.querySelector('inkling-diagram')!.textContent).toMatch(/layout down/);
  });

  it('leaves other fences alone', async () => {
    const doc = page(await run('```js\nconst a = "<b>";\n```\n', quiet));
    expect(doc.querySelector('inkling-diagram')).toBeNull();
    expect(doc.querySelector('code')?.textContent).toContain('const a = "<b>";');
  });

  it('svg mode: an inline figure with a caption, no script needed', async () => {
    const doc = page(await run(fence('title "Light"\nsun ~> leaf', 'paper=chalkboard height=200'), { mode: 'svg', ...quiet }));
    const fig = doc.querySelector('figure.inkling')!;
    expect(fig).not.toBeNull();
    const svg = fig.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toMatch(/^-?\d+ -?\d+ \d+ \d+$/);
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(2);
    expect(svg.getAttribute('style')).toContain('height:200px');
    expect(svg.getAttribute('aria-label')).toBe('Light');
    expect(fig.querySelector('figcaption')?.textContent).toBe('Light');
    expect(fig.hasAttribute('data-inkling-source')).toBe(false);
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    // The chalkboard override reached the drawing.
    expect(fig.innerHTML).toContain('#24312c');
  });

  it('svg mode escapes labels inside the SVG', async () => {
    const doc = page(await run(fence('a: box "</svg><script>x()</script> & <b>"\na -> b'), { mode: 'svg', ...quiet }));
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(doc.querySelector('figure svg text')).not.toBeNull();
    expect(doc.querySelector('figure')!.textContent).toContain('<script>x()</script>');
  });

  it('a fence can choose its own mode', async () => {
    const doc = page(await run(fence('a -> b', 'mode=svg') + fence('c -> d'), quiet));
    expect(doc.querySelectorAll('figure.inkling svg')).toHaveLength(1);
    expect(doc.querySelectorAll('inkling-diagram')).toHaveLength(1);
  });

  it('hydrate adds the source and settings so the script can upgrade the figure', async () => {
    const doc = page(await run(fence('a -> b : "x"', 'paper=napkin autoplay'), { mode: 'svg', hydrate: true, injectScript: '/inkling.iife.js', ...quiet }));
    const fig = doc.querySelector('figure.inkling')!;
    expect(fig.getAttribute('data-inkling-source')).toBe('a -> b : "x"');
    expect(fig.getAttribute('data-inkling-paper')).toBe('napkin');
    expect(fig.hasAttribute('data-inkling-autoplay')).toBe(true);
    const scripts = doc.querySelectorAll('script');
    expect(scripts[0].getAttribute('src')).toBe('/inkling.iife.js');
    expect(scripts[1].textContent).toContain('data-inkling-source');
  });

  it('injectScript adds one script tag, and only when needed', async () => {
    const two = page(await run(fence('a -> b') + fence('c -> d'), { injectScript: '/s/inkling.iife.js', ...quiet }));
    expect(Array.from(two.querySelectorAll('script')).map((s) => s.getAttribute('src'))).toEqual(['/s/inkling.iife.js']);
    const none = page(await run('# No diagrams\n', { injectScript: '/s/inkling.iife.js', ...quiet }));
    expect(none.querySelectorAll('script')).toHaveLength(0);
    const svgOnly = page(await run(fence('a -> b'), { mode: 'svg', injectScript: '/s/inkling.iife.js', ...quiet }));
    expect(svgOnly.querySelectorAll('script')).toHaveLength(0);
  });

  it('errors: an error box and a warning in svg mode', async () => {
    const warn = vi.fn();
    const doc = page(await run(fence('a: rectangel "x"'), { mode: 'svg', warn }));
    expect(doc.querySelector('figure')).toBeNull();
    expect(doc.querySelector('.inkling-error')?.textContent).toMatch(/No shape called "rectangel"/);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/:4: No shape called "rectangel"/);
  });

  it('errors: client mode warns but leaves the element to show the error', async () => {
    const warn = vi.fn();
    const doc = page(await run(fence('a: rectangel "x"'), { warn }));
    expect(doc.querySelector('inkling-diagram')).not.toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('strict fails the build with file:line', async () => {
    await expect(run(fence('a -> b\nb: rectangel'), { strict: true, mode: 'svg' })).rejects.toThrow(/markdown:5: No shape called "rectangel"/);
    await expect(run(fence('a -> b', 'paper=notbook'), { strict: true })).rejects.toThrow(/paper=notbook/);
    await expect(run(fence('a -> b', 'colour=red'), { strict: true })).rejects.toThrow(/Unknown fence option/);
    await expect(run(fence('a -> b'), { strict: true, mode: 'svg' })).resolves.toContain('<svg');
  });

  it('a bad fence option in svg mode is reported, not drawn wrong', async () => {
    const warn = vi.fn();
    const doc = page(await run(fence('a -> b', 'paper=notbook'), { mode: 'svg', warn }));
    expect(doc.querySelector('.inkling-error')?.textContent).toMatch(/notbook/);
  });

  it('fontCss points SVGs at the site stylesheet', async () => {
    const html = await run(fence('a -> b'), { mode: 'svg', fontCss: '/fonts/hands.css', ...quiet });
    expect(html).toContain("@import url('/fonts/hands.css')");
    const none = await run(fence('a -> b'), { mode: 'svg', fontCss: null, ...quiet });
    expect(none).not.toContain('@import');
  });
});

describe('file names in messages', () => {
  it('remark uses the vfile path', async () => {
    await expect(viaRemark(fence('a: rectangel'), { strict: true }, 'docs/intro.md')).rejects.toThrow(/docs\/intro\.md:4:/);
  });

  it('markdown-it uses env.relativePath (VitePress) or env.path', () => {
    expect(() => viaMarkdownIt(fence('a: rectangel'), { strict: true }, { relativePath: 'guide/a.md' })).toThrow(/guide\/a\.md:4:/);
    expect(() => viaMarkdownIt(fence('a: rectangel'), { strict: true }, { path: 'b.md' })).toThrow(/b\.md:4:/);
  });
});

describe('remark embedFonts', () => {
  it('replaces the @import with embedded fonts (fetch stubbed)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('css2')) return new Response(`@font-face { font-family: 'Caveat'; src: url(https://fonts.example/caveat.woff2) format('woff2'); }`);
      return new Response(new Uint8Array([1, 2, 3]));
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const html = await viaRemark(fence('hand caveat\na -> b'), { mode: 'svg', embedFonts: true, ...quiet });
      expect(html).not.toContain('@import');
      expect(html).toContain('data:font/woff2;base64,AQID');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('works with processSync when nothing is async', () => {
    const out = unified().use(remarkParse).use(remarkInkling, quiet).use(remarkRehype).use(rehypeStringify).processSync(fence('a -> b'));
    expect(String(out)).toContain('<inkling-diagram>');
  });
});
