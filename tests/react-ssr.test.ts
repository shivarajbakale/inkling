// @vitest-environment node
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Inkling } from '../src/react';
import { renderToSVG } from '../src/node';

describe('<Inkling> on the server', () => {
  it('has no DOM here', () => {
    expect(typeof document).toBe('undefined');
  });

  it('renders a box of the right shape, the description and the controls, with no drawing', () => {
    const html = renderToString(h(Inkling, { source: 'title "Hi"\na -> b : "x"\nb -> c', paper: 'napkin' }));
    expect(html).toMatch(/aspect-ratio:\s*\d+ \/ \d+/);
    expect(html).toContain('background:#f4eee2');
    expect(html).toContain('<li>a → b: x.</li>');
    expect(html).toContain('inkling-controls');
    expect(html).not.toContain('inkling-svg');
  });

  it('renders errors on the server too', () => {
    const html = renderToString(h(Inkling, { source: 'a: rectangel' }));
    expect(html).toContain('No shape called');
  });

  it('renders ssrSvg from renderToSVG in place of the empty box', () => {
    const svg = renderToSVG('a -> b', { idPrefix: 'ssr' });
    const html = renderToString(h(Inkling, { source: 'a -> b', ssrSvg: svg }));
    expect(html).toContain('class="inkling-ssr"');
    expect(html).toContain('inkling-svg');
    expect(html).not.toMatch(/aspect-ratio/);
  });
});
