import { act, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Inkling } from '../src/react';

describe('<Inkling> hydration', () => {
  it('hydrates server HTML without mismatches, then draws', async () => {
    const props = { source: 'title "Hi"\na -> b\nstep 1: a\nstep 2: b', fontCss: null, paper: 'graph' };
    const container = document.createElement('div');
    container.innerHTML = renderToString(h(Inkling, props));
    document.body.appendChild(container);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, h(Inkling, props), { onRecoverableError });
    });
    await waitFor(() => expect(container.querySelector('.inkling[data-ready] svg.inkling-svg')).not.toBeNull());
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
    act(() => root.unmount());
    container.remove();
  });
});
