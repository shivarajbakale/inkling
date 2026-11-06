import { type Drawing, type StepInfo } from './draw';
import type { Doc, Settings } from './types';
export { parse, setDirective } from './parse';
export { PAPERS, PENS, HANDS, COLORS, FONT_CSS_URL } from './styles';
export type { Doc, ParseError, Settings } from './types';
export type { StepInfo } from './draw';
export interface Diagram {
    doc: Doc;
    svg: SVGSVGElement;
    steps: StepInfo[];
    duration: number;
    /** Shows the drawing as it would be `t` seconds into the draw-on animation. */
    seek(t: number): void;
    /** Serialised SVG with the drawing fully finished. */
    toSVG(): string;
    destroy(): void;
}
export declare function render(source: string, overrides?: Partial<Settings>): {
    doc: Doc;
    drawing: Drawing;
};
/** Renders source into a container. The drawing starts finished; call `seek` to animate. */
export declare function mount(container: Element, source: string, overrides?: Partial<Settings>): Diagram;
/**
 * Plays a diagram's draw-on animation. Pauses briefly at the end of each step
 * so a caption can be read.
 */
export declare class Player {
    t: number;
    playing: boolean;
    speed: number;
    private raf;
    private last;
    private holdUntil;
    private stopAt;
    diagram: Diagram;
    private onTick;
    constructor(diagram: Diagram, onTick?: (p: Player) => void);
    get stepIndex(): number;
    seek(t: number): void;
    play(fromStart?: boolean): void;
    /** Plays only the given step, then stops. */
    playStep(i: number): void;
    next(): void;
    prev(): void;
    pause(): void;
    finish(): void;
    destroy(): void;
    private frame;
}
