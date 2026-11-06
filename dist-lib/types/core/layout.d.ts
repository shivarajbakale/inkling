import type { Doc, NodeDef } from './types';
export declare const BASE_SIZE = 19;
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface LaidNode {
    def: NodeDef;
    /** Centre after the human jitter. */
    cx: number;
    cy: number;
    w: number;
    h: number;
    rotate: number;
    /** Where the label sits, relative to the centre. */
    labelDy: number;
    labelW: number;
    labelH: number;
}
export interface LaidEdge {
    index: number;
    points: [number, number][];
    /** Sideways offset of a straight arrow's midpoint; its sign says which side the label goes. */
    bend: number;
}
export interface Layout {
    nodes: Map<string, LaidNode>;
    edges: LaidEdge[];
    width: number;
    height: number;
    titleH: number;
    fontPx: number;
    family: string;
    weight: number;
}
export declare function measure(text: string, px: number, family: string, weight: number): {
    w: number;
    h: number;
};
/** Where the line from the centre toward (tx, ty) leaves the shape, plus a gap. */
export declare function boundaryPoint(n: LaidNode, tx: number, ty: number, gap?: number): [number, number];
export declare function layout(doc: Doc): Layout;
