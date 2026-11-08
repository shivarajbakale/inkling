import type { AnnotationKind, Doc, FrameKind, Shape } from '../types';
export declare const SHAPES: Shape[];
export declare const SHAPE_ALIASES: Record<string, Shape>;
export declare const MARKS: AnnotationKind[];
export declare const SETTINGS: readonly ['title', 'layout', 'direction', 'paper', 'pen', 'hand', 'mess', 'seed', 'steps', 'inkling', 'root', 'center', 'footer', 'colors', 'gap', 'branches'];
/** Statements of the chart layout. */
export declare const CHART_WORDS: string[];
/** Sequence frames. */
export declare const FRAME_WORDS: FrameKind[];
export declare const KEYWORDS: string[];
/** Options written as key=value, and which statements take them. */
export declare const NODE_OPTIONS: string[];
export declare const EDGE_OPTIONS: string[];
/** A slug for ids made from text: lower case, words joined by hyphens. */
export declare const slug: (text: string) => string;
/** Parses Inkling source. Never throws: problems become diagnostics and the line is skipped. */
export declare function parse(source: string): Doc;
