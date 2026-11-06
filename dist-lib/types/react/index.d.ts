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
import { type CSSProperties, type RefObject } from 'react';
import { Player, type Diagnostic, type Diagram, type Doc, type Settings } from '../core';
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
/**
 * The drawing without any chrome, for building your own controls. Mounts
 * into `ref` on the client; safe to call on the server.
 */
export declare function useInkling(source: string, options?: UseInklingOptions): UseInklingResult;
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
/** A hand-drawn diagram from Inkling source. */
export declare const Inkling: import("react").ForwardRefExoticComponent<InklingProps & import("react").RefAttributes<InklingHandle>>;
