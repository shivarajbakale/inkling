// @vitest-environment node
import { parseHTML } from 'linkedom';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { render } from '../src/core';
import { FIXTURES } from './fixtures';

/** The parts of a drawing that matter: canvas, every path and every text. */
function fingerprint(svg: Element) {
  return {
    viewBox: svg.getAttribute('viewBox'),
    paths: Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d')),
    texts: Array.from(svg.querySelectorAll('text')).map((t) => t.textContent),
  };
}

describe('rendering outside a browser', () => {
  it('has no global document here', () => {
    expect(typeof document).toBe('undefined');
  });

  for (const [name, source] of Object.entries(FIXTURES)) {
    it(`${name} draws the same with linkedom as with jsdom`, () => {
      const { document: shim } = parseHTML('<!doctype html><html><body></body></html>');
      const viaShim = render(source, {}, { idPrefix: 'g', document: shim as unknown as Document }).drawing.svg;
      const viaJsdom = render(source, {}, { idPrefix: 'g', document: new JSDOM('').window.document }).drawing.svg;
      expect(fingerprint(viaShim as unknown as Element)).toEqual(fingerprint(viaJsdom));
      expect(viaShim.querySelectorAll('path').length).toBeGreaterThan(5);
    });
  }
});
