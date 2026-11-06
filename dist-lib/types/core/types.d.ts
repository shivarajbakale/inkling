/** The parsed form of an Inkling source file. */
export type Shape = 'box' | 'round' | 'circle' | 'diamond' | 'cloud' | 'db' | 'sticky' | 'person' | 'icon' | 'text';
export type Size = 'small' | 'normal' | 'large';
export type EdgeKind = 'solid' | 'dashed' | 'squiggle';
export type AnnotationKind = 'circle' | 'underline' | 'strike' | 'highlight' | 'note' | 'cross' | 'check';
/** Where something was written: absolute offsets into the source, and its line. */
export interface Span {
    line: number;
    from: number;
    to: number;
}
export interface NodeDef {
    id: string;
    shape: Shape;
    label: string;
    /** Pencil hatching colour, from COLORS. */
    fill?: string;
    /** Ink colour for the outline and label, from INKS. */
    color?: string;
    /** A pen from PENS, overriding the drawing's pen for this node. */
    pen?: string;
    size?: Size;
    /** Icon name, when shape is 'icon'. */
    icon?: string;
    /** The group this node sits in. */
    group?: string;
    line: number;
    /** The statement that defines it. For a node made by an arrow, that arrow line. */
    span: Span;
    /** Statement index in the source, for layouts where source order matters. */
    order: number;
    implicit?: boolean;
}
export interface EdgeDef {
    from: string;
    to: string;
    kind: EdgeKind;
    both: boolean;
    label?: string;
    color?: string;
    pen?: string;
    line: number;
    span: Span;
    order: number;
}
export interface AnnotationDef {
    kind: AnnotationKind;
    /** A node id, a group id, or "a->b" for an arrow. */
    target: string;
    targetKind: 'node' | 'group' | 'edge';
    /** For arrow targets: index into Doc.edges, set once the arrow is found. */
    edgeIndex?: number;
    text?: string;
    color?: string;
    at?: number;
    line: number;
    span: Span;
    order: number;
}
export interface GroupDef {
    id: string;
    label: string;
    members: string[];
    /** Enclosing group, for one level of nesting. */
    parent?: string;
    line: number;
    span: Span;
    order: number;
}
export interface StepDef {
    index: number;
    items: string[];
    caption?: string;
    line: number;
    span: Span;
}
export interface Diagnostic {
    /** Stable code, such as E-UNKNOWN-SHAPE. Listed in docs/errors.md. */
    code: string;
    severity: 'error' | 'warning';
    message: string;
    /** A suggested fix, such as 'Did you mean "box"?' */
    hint?: string;
    /** Replacement text for the span, when the fix is mechanical. */
    fix?: {
        span: Span;
        text: string;
    };
    span: Span;
}
export type Direction = 'right' | 'down';
export interface Settings {
    /** Which layout places things: flow (default). */
    layout: string;
    direction: Direction;
    paper: string;
    pen: string;
    hand: string;
    mess: number;
    seed: number;
}
export interface Doc extends Settings {
    title?: string;
    nodes: NodeDef[];
    edges: EdgeDef[];
    annotations: AnnotationDef[];
    steps: StepDef[];
    groups: GroupDef[];
    /** `steps auto`: every node becomes its own step, in source order. */
    autoSteps: boolean;
    /** From an `inkling 1` line, if present. */
    version?: number;
    diagnostics: Diagnostic[];
}
