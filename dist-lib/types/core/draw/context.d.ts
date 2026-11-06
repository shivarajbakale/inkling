import type { Options } from 'roughjs/bin/core';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { Box, Pt, Scene, SceneNode } from '../scene';
import type { Paper, Pen } from '../styles';
import type { Doc } from '../types';
import type { Piece } from './pieces';
import type { TextStyle } from './text';
/** Everything the drawing passes share while one diagram is drawn. */
export interface DrawContext {
    doc: Doc;
    lay: Scene;
    uid: string;
    svg: SVGSVGElement;
    defs: SVGDefsElement;
    rc: RoughSVG;
    rand: () => number;
    /** Rough.js options for this pen, seeded by a key so each shape has its own wobble. */
    base: (seedKey: string, extra?: Options) => Options;
    roughness: number;
    textStyle: TextStyle;
    paper: Paper;
    pen: Pen;
    ink: string;
    mark: string;
    good: string;
    /** Vertical offset of the content, below the title. */
    oy: number;
    /** Scene nodes moved down by `oy`. */
    shifted: Map<string, SceneNode>;
    stepOf: Map<string, number>;
    rankInStep: Map<string, number>;
    add: (step: number, rank: number, pieces: Piece[], dur: number) => void;
    content: SVGGElement;
    edgeLayer: SVGGElement;
    nodeLayer: SVGGElement;
    markLayer: SVGGElement;
    /** Boxes taken by nodes, labels and the title, for placing notes and labels. */
    occupied: Box[];
    /** Boxes drawn outside the layout's area, which grow the canvas. */
    extra: Box[];
    /** Points sampled along every arrow, so notes avoid lines. */
    edgeSamples: Pt[];
    titleBox?: Box;
}
