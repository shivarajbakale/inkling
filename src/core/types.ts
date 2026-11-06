/** The parsed form of an Inkling source file. */

export type Shape =
  | 'box'
  | 'round'
  | 'circle'
  | 'diamond'
  | 'cloud'
  | 'db'
  | 'sticky'
  | 'person'
  | 'text';

export type EdgeKind = 'solid' | 'dashed' | 'squiggle';

export type AnnotationKind = 'circle' | 'underline' | 'strike' | 'highlight' | 'note' | 'cross' | 'check';

export interface NodeDef {
  id: string;
  shape: Shape;
  label: string;
  fill?: string;
  line: number;
  implicit?: boolean;
}

export interface EdgeDef {
  from: string;
  to: string;
  kind: EdgeKind;
  both: boolean;
  label?: string;
  line: number;
}

export interface AnnotationDef {
  kind: AnnotationKind;
  target: string;
  text?: string;
  color?: string;
  at?: number;
  line: number;
}

export interface StepDef {
  index: number;
  items: string[];
  caption?: string;
  line: number;
}

export interface ParseError {
  line: number;
  message: string;
}

export type Direction = 'right' | 'down';

export interface Settings {
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
  errors: ParseError[];
}
