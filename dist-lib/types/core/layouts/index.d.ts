import type { LayoutFn, Scene } from '../scene';
import type { Doc } from '../types';
/** Every layout by name. New layouts register here. */
export declare const LAYOUTS: Record<string, LayoutFn>;
/** Places, humanises and routes: everything before ink. */
export declare function layout(doc: Doc): Scene;
