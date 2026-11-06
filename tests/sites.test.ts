// @vitest-environment node
// The plain fixture sites in examples/sites/, built with the plugins from src/.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { build as buildMarkdownIt } from '../examples/sites/markdown-it/build.mjs';
import { build as buildUnified } from '../examples/sites/unified/build.mjs';
import { inklingMarkdownIt } from '../src/markdown/markdown-it';
import { remarkInkling } from '../src/markdown/remark';

const SITES = {
  unified: (mode: string) => buildUnified(remarkInkling, mode) as Promise<string>,
  'markdown-it': async (mode: string) => buildMarkdownIt(inklingMarkdownIt, mode) as string,
};

describe.each(Object.entries(SITES))('%s fixture site', (_name, build) => {
  it('client mode: two live elements, one build-time figure, one script', async () => {
    const doc = new JSDOM(await build('client')).window.document;
    expect(doc.querySelectorAll('inkling-diagram')).toHaveLength(2);
    expect(doc.querySelectorAll('figure.inkling svg')).toHaveLength(1);
    expect(Array.from(doc.querySelectorAll('script')).map((s) => s.getAttribute('src'))).toEqual(['inkling.iife.js']);
    const nasty = doc.querySelectorAll('inkling-diagram')[1];
    expect(nasty.getAttribute('paper')).toBe('napkin');
    expect(nasty.textContent).toContain('</inkling-diagram><script>alert(1)</script>');
    expect(doc.querySelector('pre code')?.textContent).toContain("'<inkling-diagram>'");
  });

  it('svg mode: three hydratable figures, the script and the upgrade', async () => {
    const doc = new JSDOM(await build('svg')).window.document;
    expect(doc.querySelectorAll('inkling-diagram')).toHaveLength(0);
    const figures = Array.from(doc.querySelectorAll('figure.inkling'));
    expect(figures).toHaveLength(3);
    for (const f of figures) {
      expect(f.querySelector('svg path')).not.toBeNull();
      expect(f.getAttribute('data-inkling-source')).toBeTruthy();
    }
    expect(figures[2].getAttribute('data-inkling-source')).toContain('<script>alert(1)</script>');
    expect(figures[2].textContent).toContain('<script>alert(1)</script>');
    expect(figures[0].querySelector('figcaption')?.textContent).toBe('Request, then response');
    const scripts = Array.from(doc.querySelectorAll('script'));
    expect(scripts).toHaveLength(2);
    expect(scripts[0].getAttribute('src')).toBe('inkling.iife.js');
    expect(scripts[1].textContent).toContain('figure[data-inkling-source]');
  });
});
