// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { render } from '../src/core';
import { remarkInkling } from '../src/markdown/remark';
import { readOverrides, renderDiagram, renderToSVG } from '../src/node';
import { FIXTURES } from './fixtures';

/** The parts of a drawing that matter: canvas, every path and every text. */
function fingerprint(svg: Element) {
  return {
    viewBox: svg.getAttribute('viewBox'),
    paths: Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d')),
    texts: Array.from(svg.querySelectorAll('text')).map((t) => t.textContent),
  };
}

/** Parses as strict XML: a standalone .svg file must be well-formed. */
function parseSVG(markup: string): Element {
  const doc = new JSDOM(markup, { contentType: 'image/svg+xml' }).window.document;
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc.documentElement;
}

function browserRender(source: string): Element {
  return render(source, {}, { idPrefix: 'g', document: new JSDOM('').window.document }).drawing.svg;
}

describe('renderToSVG matches the browser render', () => {
  for (const [name, source] of Object.entries(FIXTURES)) {
    it(`${name}: Node SVG = jsdom render = golden`, () => {
      const node = fingerprint(parseSVG(renderToSVG(source, { idPrefix: 'g' })));
      expect(node).toEqual(fingerprint(browserRender(source)));
      const golden = resolve(__dirname, 'golden', name.replace(/\//g, '__') + '.svg');
      // Goldens come from jsdom's serializer, which writes xmlns twice, so read them as HTML.
      if (existsSync(golden)) expect(node).toEqual(fingerprint(new JSDOM(readFileSync(golden, 'utf8')).window.document.querySelector('svg')!));
      expect(node.paths.length).toBeGreaterThan(5);
    });

    it(`${name}: attributes in the browser's order`, () => {
      const names = (root: Element) => [root, ...Array.from(root.querySelectorAll('*'))].map((e) => e.getAttributeNames().join(' '));
      expect(names(parseSVG(renderToSVG(source, { idPrefix: 'g' })))).toEqual(names(browserRender(source)));
    });

    it(`${name}: Markdown SVG mode = jsdom render`, async () => {
      const md = '```inkling mode=svg\n' + source.replace(/\n+$/, '') + '\n```\n';
      const html = String(await unified().use(remarkParse).use(remarkInkling, { warn: () => {} }).use(remarkRehype).use(rehypeStringify).process(md));
      const svg = new JSDOM(html).window.document.querySelector('figure.inkling svg');
      expect(svg).not.toBeNull();
      expect(fingerprint(svg!)).toEqual(fingerprint(browserRender(source)));
    });
  }
});

describe('renderToSVG', () => {
  const src = 'title "Tom & <Jerry>"\na: box "x < y & \\"z\\""\na -> b : "hi"';

  it('escapes text and is well-formed XML', () => {
    const svg = renderToSVG(src);
    const el = parseSVG(svg);
    expect(Array.from(el.querySelectorAll('text')).map((t) => t.textContent).join(' ')).toContain('x < y');
    expect(el.querySelector('title')?.textContent).toBe('Tom & <Jerry>');
    expect(svg.match(/xmlns="/g)).toHaveLength(1);
  });

  it('shows text finished, not masked for animation', () => {
    const el = parseSVG(renderToSVG(src));
    const widths = Array.from(el.querySelectorAll('clipPath rect')).map((r) => Number(r.getAttribute('width')));
    expect(widths.length).toBeGreaterThan(0);
    for (const w of widths) expect(w).toBeGreaterThan(0);
  });

  it('is deterministic, and ids differ between different diagrams', () => {
    expect(renderToSVG(src)).toBe(renderToSVG(src));
    const ids = (s: string) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const a = ids(renderToSVG('a -> b'));
    const b = ids(renderToSVG('c -> d'));
    expect(a.some((x) => b.includes(x))).toBe(false);
    expect(renderToSVG('a -> b', { idPrefix: 'zz' })).toContain('id="zz-');
  });

  it('applies overrides the way a source line would', () => {
    const plain = renderDiagram('a -> b');
    const napkin = renderDiagram('a -> b', { paper: 'napkin', seed: 4 });
    expect(napkin.doc.paper).toBe('napkin');
    expect(napkin.doc.seed).toBe(4);
    expect(napkin.svg).not.toBe(plain.svg);
    // An override wins over the source, even when it names the default.
    expect(renderDiagram('paper chalkboard\na -> b', { paper: 'notebook' }).doc.paper).toBe('notebook');
    expect(readOverrides({ layout: 'down' }).overrides.direction).toBe('down');
  });

  it('reports bad overrides instead of crashing', () => {
    const r = renderDiagram('a -> b', { paper: 'nope', mess: 7 });
    expect(r.diagnostics.filter((d) => d.code === 'E-BAD-OVERRIDE')).toHaveLength(2);
    expect(r.diagnostics[0].message).toMatch(/paper=nope/);
    expect(r.svg).toContain('<svg');
  });

  it('can point at another font stylesheet, or none', () => {
    expect(renderToSVG('a -> b', { fontCss: '/fonts.css' })).toContain("@import url('/fonts.css')");
    expect(renderToSVG('a -> b', { fontCss: null })).not.toContain('@import');
  });

  it('returns a tree matching the markup', () => {
    const r = renderDiagram('a -> b');
    expect(r.tree.tagName).toBe('svg');
    expect(r.tree.attributes.viewBox).toBe(parseSVG(r.svg).getAttribute('viewBox'));
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });
});
