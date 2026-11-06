'use client';
/**
 * Inkling for React.
 *
 *   import { Inkling } from './vendor/inkling/inkling-react.js';
 *   <Inkling source={source} paper="napkin" autoplay />
 *
 * Built on the core directly (not the web component), so props are typed,
 * events are callbacks and server rendering is safe: on the server it renders
 * a box of the right shape, the accessible description and any errors; the
 * drawing appears on the client.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import { describeLines, layout as layoutScene, mount, PAPERS, parse, Player, type Diagnostic, type Diagram, type Doc, type Settings } from '../core';
import { readOverrides, SETTING_KEYS } from '../node/settings';
import { loadFonts } from './fonts';

export type { Diagnostic, Diagram, Doc, Settings } from '../core';
export { Player } from '../core';

export interface UseInklingOptions extends Partial<Settings> {
  /** Draw on when first scrolled into view. Ignored with reduced motion. */
  autoplay?: boolean;
  /** Controlled step: index into `diagram.steps`. Changing it plays that step. */
  step?: number;
  /** Called when the step being shown changes, by playing or by the controls. */
  onStepChange?: (step: number) => void;
  /** Called once the drawing is on the page. */
  onReady?: (diagram: Diagram) => void;
  /** Called with every problem in the source (and in the setting props) whenever they change. */
  onDiagnostics?: (list: Diagnostic[]) => void;
  /** Handwriting font stylesheet. Defaults to Google Fonts; null if the page loads the fonts itself. */
  fontCss?: string | null;
}

export interface PlayState {
  playing: boolean;
  /** Index into `diagram.steps`. */
  step: number;
  /** At the end of the animation. */
  done: boolean;
  /** Something has been drawn (time is past zero). */
  started: boolean;
}

export interface UseInklingResult {
  /** Put this on the element the drawing goes in. Leave the element empty. */
  ref: RefObject<HTMLDivElement | null>;
  /** The mounted drawing, once ready; null on the server and before fonts load. */
  diagram: Diagram | null;
  diagnostics: Diagnostic[];
  player: Player | null;
  state: PlayState;
  /** The parsed source with setting props applied. Available on the server too. */
  doc: Doc;
}

const settingsOf = (o: UseInklingOptions) => Object.fromEntries(SETTING_KEYS.map((k) => [k, o[k] as string | number | undefined]));

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The drawing without any chrome, for building your own controls. Mounts
 * into `ref` on the client; safe to call on the server.
 */
export function useInkling(source: string, options: UseInklingOptions = {}): UseInklingResult {
  const ref = useRef<HTMLDivElement | null>(null);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [state, setState] = useState<PlayState>({ playing: false, step: 0, done: true, started: true });
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const settingsKey = JSON.stringify(settingsOf(options));
  const { overrides, problems } = useMemo(() => readOverrides(settingsOf(options)), [settingsKey]);
  const problemDiagnostics = useMemo<Diagnostic[]>(
    () =>
      problems.map((p) => ({
        code: 'E-BAD-OVERRIDE',
        severity: 'error',
        message: `${p.key}="${p.value}": ${p.message}`,
        span: { line: 1, from: 0, to: 0 },
      })),
    [problems],
  );
  const doc = useMemo(() => ({ ...parse(source), ...overrides }), [source, overrides]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>(() => [...problemDiagnostics, ...doc.diagnostics]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;
    let p: Player | null = null;
    let io: IntersectionObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    loadFonts(latest.current.fontCss).then(() => {
      if (cancelled) return;
      const d = mount(container, source, overrides);
      let quiet = true;
      let lastKey = '';
      let lastStep = -1;
      const player = new Player(d, (pl) => {
        const next = { playing: pl.playing, step: pl.stepIndex, done: pl.t >= d.duration - 0.01, started: pl.t > 0 };
        // One React update per change of state, not per animation frame.
        const key = `${next.playing}${next.step}${next.done}${next.started}`;
        if (key !== lastKey) {
          lastKey = key;
          setState(next);
        }
        if (!quiet && next.step !== lastStep) latest.current.onStepChange?.(next.step);
        lastStep = next.step;
      });
      p = player;
      const { step, autoplay } = latest.current;
      if (step !== undefined && d.steps.length) {
        player.seek(d.steps[Math.max(0, Math.min(d.steps.length - 1, step))].end);
      } else if (autoplay && !reducedMotion()) {
        player.seek(0);
        if (typeof IntersectionObserver === 'undefined') player.play(true);
        else {
          io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              player.play(true);
              io?.disconnect();
            }
          });
          io.observe(container);
          // Never leave a drawing blank if it never scrolls into view.
          timer = setTimeout(() => {
            if (player.t === 0 && !player.playing) player.finish();
          }, 6000);
        }
      } else player.finish();
      quiet = false;
      const list = [...problemDiagnostics, ...d.doc.diagnostics];
      setDiagram(d);
      setPlayer(player);
      setDiagnostics(list);
      latest.current.onReady?.(d);
      latest.current.onDiagnostics?.(list);
    });
    return () => {
      // Idempotent: Strict Mode runs this and the effect again. The drawing
      // stays until the next one replaces it, so editing does not flicker.
      cancelled = true;
      io?.disconnect();
      clearTimeout(timer);
      p?.destroy();
    };
  }, [source, overrides, problemDiagnostics]);

  // Clear the container on unmount.
  useEffect(() => {
    const container = ref.current;
    return () => container?.replaceChildren();
  }, []);

  // Controlled step.
  const step = options.step;
  useEffect(() => {
    if (!player || step === undefined || !player.diagram.steps.length) return;
    const i = Math.max(0, Math.min(player.diagram.steps.length - 1, step));
    if (player.stepIndex === i) return;
    if (reducedMotion()) {
      player.pause();
      player.seek(player.diagram.steps[i].end);
    } else player.playStep(i);
  }, [player, step]);

  return { ref, diagram, diagnostics, player, state, doc };
}

export interface InklingHandle {
  play(): void;
  pause(): void;
  /** Play the next step. */
  next(): void;
  /** Back to the end of the previous step. */
  prev(): void;
  /** Jump to the finished drawing. */
  finish(): void;
  /** Show the drawing `t` seconds into its animation. */
  seek(t: number): void;
  playStep(index: number): void;
  /** The finished drawing as an SVG string; empty before it is ready. */
  toSVG(): string;
  readonly diagram: Diagram | null;
  readonly player: Player | null;
  readonly element: HTMLDivElement | null;
}

export interface InklingProps extends UseInklingOptions {
  source: string;
  /** The built-in play bar. Defaults to true. */
  controls?: boolean;
  /** SVG from `renderToSVG` at build time: shown until the live drawing takes over. */
  ssrSvg?: string;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. Defaults to the diagram's title. */
  'aria-label'?: string;
}

const CSS = `
.inkling{position:relative;border-radius:var(--inkling-radius,14px);overflow:hidden;background:var(--inkling-chrome,transparent);color:var(--inkling-text,inherit)}
.inkling:focus-visible{outline:2px solid var(--inkling-accent,#4d7c0f);outline-offset:2px}
.inkling-stage{line-height:0;overflow-x:auto}
.inkling-stage svg,.inkling-ssr svg{display:block;max-width:100%;height:auto;margin:0 auto}
.inkling-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:0;padding:0}
.inkling-controls{display:flex;align-items:center;gap:10px;padding:8px 12px;min-height:40px;box-sizing:border-box}
.inkling-controls button{all:unset;cursor:pointer;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px}
.inkling-controls button:focus-visible{outline:2px solid var(--inkling-accent,#4d7c0f)}
.inkling-dots{display:flex;gap:5px}
.inkling-controls .inkling-dot{width:8px;height:8px;border-radius:50%;background:var(--inkling-dot,color-mix(in oklab,currentColor 22%,transparent))}
.inkling-controls .inkling-dot[data-on]{background:var(--inkling-accent,#4d7c0f)}
.inkling-caption{flex:1;min-width:0;color:var(--inkling-dim,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inkling-error{margin:0;padding:12px 14px;color:var(--inkling-error,#c02626);font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap}
`;

const Icon = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d={d} fill="currentColor" />
  </svg>
);
const PLAY = 'M3 1.5v11l9-5.5z';
const PAUSE = 'M3 1.5h3v11H3zM8 1.5h3v11H8z';
const REPLAY = 'M7 2a5 5 0 1 0 5 5h-1.6A3.4 3.4 0 1 1 7 3.6V6l3.2-3.2L7 -.4z';

/** Width / height the drawing will have, from the layout alone (no DOM), so the page does not jump. */
function aspectOf(doc: Doc): string | undefined {
  try {
    const scene = layoutScene(doc);
    if (scene.width > 0 && scene.height > 0) return `${Math.round(scene.width + 40)} / ${Math.round(scene.height + 32)}`;
  } catch {
    /* no estimate */
  }
  return undefined;
}

/** A hand-drawn diagram from Inkling source. */
export const Inkling = forwardRef<InklingHandle, InklingProps>(function Inkling(props, handle): ReactElement {
  const { source, controls = true, ssrSvg, className, style, 'aria-label': ariaLabel, ...options } = props;
  const ink = useInkling(source, options);
  const { diagram, player, state, doc, diagnostics } = ink;
  const root = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    handle,
    () => ({
      play: () => player?.play(),
      pause: () => player?.pause(),
      next: () => player?.next(),
      prev: () => player?.prev(),
      finish: () => player?.finish(),
      seek: (t: number) => player?.seek(t),
      playStep: (i: number) => player?.playStep(i),
      toSVG: () => diagram?.toSVG() ?? '',
      get diagram() {
        return diagram;
      },
      get player() {
        return player;
      },
      get element() {
        return root.current;
      },
    }),
    [diagram, player],
  );

  const lines = useMemo(() => describeLines(doc), [doc]);
  const aspect = useMemo(() => (ssrSvg ? undefined : aspectOf(doc)), [doc, ssrSvg]);
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const steps = diagram?.steps ?? [];
  const current = steps[state.step];
  const caption = current?.caption ? `${current.index}. ${current.caption}` : (doc.title ?? '');
  const toggle = () => (player?.playing ? player.pause() : player?.play());

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !player) return;
    if (e.key === ' ') toggle();
    else if (e.key === 'ArrowRight') player.next();
    else if (e.key === 'ArrowLeft') player.prev();
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={root}
      className={className ? `inkling ${className}` : 'inkling'}
      style={style}
      role="group"
      tabIndex={0}
      aria-label={`${ariaLabel ?? doc.title ?? 'Diagram'}. Space plays, arrow keys step.`}
      onKeyDown={onKeyDown}
      data-ready={diagram ? '' : undefined}
    >
      <style>{CSS}</style>
      <div
        ref={ink.ref}
        className="inkling-stage"
        style={{ background: PAPERS[doc.paper]?.ground, aspectRatio: diagram ? undefined : aspect }}
      />
      {!diagram && ssrSvg ? <div className="inkling-ssr" dangerouslySetInnerHTML={{ __html: ssrSvg }} /> : null}
      <ul className="inkling-sr">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {errors.length ? (
        <pre className="inkling-error" role="alert">
          {errors.map((e) => `${e.code === 'E-BAD-OVERRIDE' ? '' : `Line ${e.span.line}: `}${e.message}${e.hint ? ` ${e.hint}` : ''}`).join('\n')}
        </pre>
      ) : null}
      {controls ? (
        <div className="inkling-controls">
          <button
            type="button"
            className="inkling-play"
            disabled={!player}
            aria-label={state.playing ? 'Pause' : state.done ? 'Replay' : 'Play'}
            onClick={toggle}
          >
            <Icon d={state.playing ? PAUSE : state.done ? REPLAY : PLAY} />
          </button>
          {steps.length > 1 ? (
            <div className="inkling-dots">
              {steps.map((s, i) => (
                <button
                  type="button"
                  key={i}
                  className="inkling-dot"
                  data-on={i <= state.step && state.started ? '' : undefined}
                  aria-label={`Step ${s.index}${s.caption ? `: ${s.caption}` : ''}`}
                  aria-current={i === state.step ? 'step' : undefined}
                  onClick={() => player?.playStep(i)}
                />
              ))}
            </div>
          ) : null}
          <div className="inkling-caption">{caption}</div>
        </div>
      ) : null}
    </div>
  );
});
