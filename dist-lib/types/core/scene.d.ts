import type { Diagnostic, Doc, EdgeDef, GroupDef, NodeDef } from './types';
/**
 * The scene: everything a layout decides, before any ink. Every layout
 * produces one; the humaniser, the router and the drawing all consume it.
 */
export type Pt = [number, number];
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface SceneNode {
    def: NodeDef;
    /** Centre. Layouts set it; the humaniser nudges it. */
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
export interface SceneEdge {
    index: number;
    def: EdgeDef;
    /** Bend points chosen by the layout, between the two ends. Empty for a direct line. */
    route: Pt[];
    /** The final line, end to end, set by the router. */
    points: Pt[];
    /** Sideways offset of a direct line's midpoint; its sign says which side the label goes. */
    bend: number;
}
export interface SceneGroup {
    def: GroupDef;
    /** The dashed frame. */
    box: Box;
    /** The handwritten name, inside the frame's top-left corner. */
    tab: Box;
}
/** A label whose position the label pass chose: an arrow's label or a note. */
export interface PlacedLabel {
    key: string;
    text: string;
    px: number;
    box: Box;
}
/** Extra ink a layout needs that is not a node or an arrow. Layouts add kinds as they need them. */
export type Decoration = {
    kind: 'line';
    points: Pt[];
    dashed?: boolean;
    step?: number;
};
/** How far the humaniser may move things in this layout, at mess 1. */
export interface HumaniseLimits {
    tilt: number;
    stickyTilt: number;
    jitterX: number;
    jitterY: number;
}
export interface Scene {
    layout: string;
    nodes: Map<string, SceneNode>;
    edges: SceneEdge[];
    decorations: Decoration[];
    groups: SceneGroup[];
    /** Arrow labels (`edge:<index>`) and notes (`note:<annotation index>`), set by the label pass. */
    labels: Map<string, PlacedLabel>;
    titleBox?: Box;
    /** Problems the layout noticed, such as a very wide graph. */
    warnings: Diagnostic[];
    width: number;
    height: number;
    titleH: number;
    fontPx: number;
    family: string;
    weight: number;
    humanise: HumaniseLimits;
}
/** A layout places things. It never draws and never adds randomness. */
export type LayoutFn = (doc: Doc) => Scene;
/** Where the line from the centre toward (tx, ty) leaves the shape, plus a gap. */
export declare function boundaryPoint(n: SceneNode, tx: number, ty: number, gap?: number): [number, number];
