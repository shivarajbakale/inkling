import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createElement as h, StrictMode, useRef, useState, type RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Inkling, useInkling, type InklingHandle, type InklingProps } from '../src/react';

// No network in tests: the page "already has" the fonts.
const base = { fontCss: null } as const;
const STEPS = 'title "Three steps"\na -> b\nb -> c\nstep 1: a\nstep 2: b\nstep 3: c';

afterEach(cleanup);

async function ready(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('.inkling[data-ready]')).not.toBeNull());
}

describe('<Inkling>', () => {
  it('draws the source, with a description list and controls', async () => {
    const onReady = vi.fn();
    const { container } = render(h(Inkling, { ...base, source: 'title "Hello"\na -> b : "hi"', onReady }));
    await ready(container);
    expect(container.querySelectorAll('.inkling-stage svg')).toHaveLength(1);
    expect(container.querySelector('.inkling-sr li')?.textContent).toBe('a → b: hi.');
    expect(container.querySelector('.inkling-play')).not.toBeNull();
    expect(container.querySelector('.inkling-caption')?.textContent).toBe('Hello');
    expect(container.querySelector('.inkling')?.getAttribute('aria-label')).toMatch(/^Hello\./);
    expect(onReady).toHaveBeenCalledOnce();
    expect(onReady.mock.calls[0][0].svg).toBeTruthy();
  });

  it('settings props override the source', async () => {
    const { container } = render(h(Inkling, { ...base, source: 'paper notebook\na -> b', paper: 'chalkboard' }));
    await ready(container);
    expect((container.querySelector('.inkling-stage') as HTMLElement).style.background).toBe('rgb(36, 49, 44)');
  });

  it('controls={false} hides the play bar', async () => {
    const { container } = render(h(Inkling, { ...base, source: 'a -> b', controls: false }));
    await ready(container);
    expect(container.querySelector('.inkling-controls')).toBeNull();
  });

  it('reports diagnostics and shows errors', async () => {
    const onDiagnostics = vi.fn();
    const { container } = render(h(Inkling, { ...base, source: 'a: rectangel\na -> b', onDiagnostics, pen: 'crayonn' }));
    await ready(container);
    const list = onDiagnostics.mock.calls.at(-1)![0];
    expect(list.map((d: { code: string }) => d.code)).toEqual(expect.arrayContaining(['E-UNKNOWN-SHAPE', 'E-BAD-OVERRIDE']));
    expect(container.querySelector('.inkling-error')?.textContent).toMatch(/Line 1: No shape called "rectangel"/);
    expect(container.querySelector('.inkling-error')?.textContent).toMatch(/^pen="crayonn": No pen called/);
    expect(container.querySelector('.inkling-stage svg')).not.toBeNull();
  });

  it('redraws when the source changes, keeping one drawing', async () => {
    const { container, rerender } = render(h(Inkling, { ...base, source: 'a -> b' }));
    await ready(container);
    rerender(h(Inkling, { ...base, source: 'x -> y -> z' }));
    await waitFor(() => expect(container.querySelector('.inkling-sr')?.textContent).toContain('x → y'));
    await waitFor(() => expect(container.querySelectorAll('.inkling-stage text').length).toBeGreaterThanOrEqual(3));
    expect(container.querySelectorAll('.inkling-stage svg')).toHaveLength(1);
  });

  it('is idempotent in Strict Mode: mount, unmount, remount', async () => {
    const onReady = vi.fn();
    const props: InklingProps = { ...base, source: STEPS, onReady };
    const first = render(h(StrictMode, null, h(Inkling, props)));
    await ready(first.container);
    expect(first.container.querySelectorAll('svg.inkling-svg')).toHaveLength(1);
    first.unmount();
    expect(first.container.querySelectorAll('svg.inkling-svg')).toHaveLength(0);
    const second = render(h(StrictMode, null, h(Inkling, props)));
    await ready(second.container);
    // Let any stray effects finish, then count again.
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(second.container.querySelectorAll('svg.inkling-svg')).toHaveLength(1);
    expect(second.container.querySelectorAll('.inkling-dot')).toHaveLength(3);
  });

  it('exposes play controls and toSVG through a ref', async () => {
    let handle: RefObject<InklingHandle | null> = { current: null };
    function Host() {
      handle = useRef<InklingHandle>(null);
      return h(Inkling, { ...base, source: STEPS, ref: handle });
    }
    const { container } = render(h(Host));
    await ready(container);
    const svg = handle.current!.toSVG();
    expect(svg).toMatch(/^<svg/);
    expect(handle.current!.diagram!.steps).toHaveLength(3);
    act(() => handle.current!.seek(0));
    expect(handle.current!.player!.t).toBe(0);
    act(() => handle.current!.finish());
    expect(handle.current!.player!.t).toBe(handle.current!.diagram!.duration);
    act(() => handle.current!.prev());
    expect(handle.current!.player!.stepIndex).toBe(1);
    act(() => handle.current!.play());
    expect(handle.current!.player!.playing).toBe(true);
    act(() => handle.current!.pause());
    expect(handle.current!.player!.playing).toBe(false);
    expect(handle.current!.element).toBe(container.querySelector('.inkling'));
  });

  it('controlled step: the prop picks the step, the controls report changes', async () => {
    const onStepChange = vi.fn();
    let setStep: (n: number) => void = () => {};
    let handle: RefObject<InklingHandle | null> = { current: null };
    function Host() {
      const [step, set] = useState(0);
      setStep = set;
      handle = useRef<InklingHandle>(null);
      return h(Inkling, { ...base, source: STEPS, step, onStepChange: (i) => (onStepChange(i), set(i)), ref: handle });
    }
    const { container } = render(h(Host));
    await ready(container);
    const p = handle.current!.player!;
    // Starts at the end of step 0, without reporting a change.
    expect(p.stepIndex).toBe(0);
    expect(p.t).toBeCloseTo(p.diagram.steps[0].end, 5);
    expect(onStepChange).not.toHaveBeenCalled();
    act(() => setStep(2));
    expect(p.stepIndex).toBe(2);
    act(() => p.pause());
    // A dot click plays that step and reports it.
    fireEvent.click(container.querySelectorAll('.inkling-dot')[1]);
    expect(onStepChange).toHaveBeenLastCalledWith(1);
    expect(container.querySelectorAll('.inkling-dot')[1].getAttribute('aria-current')).toBe('step');
  });

  it('keyboard: space plays and pauses, arrows step', async () => {
    let handle: RefObject<InklingHandle | null> = { current: null };
    function Host() {
      handle = useRef<InklingHandle>(null);
      return h(Inkling, { ...base, source: STEPS, ref: handle });
    }
    const { container } = render(h(Host));
    await ready(container);
    const root = container.querySelector('.inkling') as HTMLElement;
    expect(root.tabIndex).toBe(0);
    const p = handle.current!.player!;
    fireEvent.keyDown(root, { key: ' ' });
    expect(p.playing).toBe(true);
    fireEvent.keyDown(root, { key: ' ' });
    expect(p.playing).toBe(false);
    act(() => p.seek(0));
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(p.playing).toBe(true);
    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(p.playing).toBe(false);
    expect(container.querySelector('.inkling-play')?.getAttribute('aria-label')).toBe('Play');
  });

  it('autoplay starts from a blank page', async () => {
    let handle: RefObject<InklingHandle | null> = { current: null };
    function Host() {
      handle = useRef<InklingHandle>(null);
      return h(Inkling, { ...base, source: 'a -> b', autoplay: true, ref: handle });
    }
    const { container } = render(h(Host));
    await ready(container);
    expect(handle.current!.player!.t).toBeLessThan(handle.current!.diagram!.duration);
  });

  it('shows ssrSvg until the drawing takes over', async () => {
    const { container } = render(h(Inkling, { ...base, source: 'a -> b', ssrSvg: '<svg class="from-build"></svg>' }));
    expect(container.querySelector('.inkling-ssr svg.from-build')).not.toBeNull();
    await ready(container);
    expect(container.querySelector('.inkling-ssr')).toBeNull();
    expect(container.querySelector('.inkling-stage svg')).not.toBeNull();
  });
});

describe('useInkling', () => {
  it('mounts into your own element and returns the player', async () => {
    let result: ReturnType<typeof useInkling> | null = null;
    function Custom() {
      result = useInkling('a -> b\nb -> c', { ...base, seed: 3 });
      return h('div', { className: 'mine', ref: result.ref });
    }
    const { container } = render(h(Custom));
    await waitFor(() => expect(result!.diagram).not.toBeNull());
    expect(container.querySelector('.mine svg')).not.toBeNull();
    expect(result!.player).not.toBeNull();
    expect(result!.doc.seed).toBe(3);
    expect(result!.diagnostics).toEqual([]);
  });
});
