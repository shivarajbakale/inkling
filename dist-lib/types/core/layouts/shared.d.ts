import type { Doc, NodeDef } from '../types';
export declare const BASE_SIZE = 19;
export interface Sized {
    w: number;
    h: number;
    labelDy: number;
    lw: number;
    lh: number;
}
/** Text style shared by every layout. */
export declare function textMetrics(doc: Doc): {
    px: number;
    family: string;
    weight: number;
};
export declare function shapeSize(def: NodeDef, lw: number, lh: number): {
    w: number;
    h: number;
    labelDy: number;
};
/** Measures every node's label and works out its box. */
export declare function sizeNodes(doc: Doc): Map<string, Sized>;
export declare function titleHeight(doc: Doc): number;
