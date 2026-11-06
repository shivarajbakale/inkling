import type { Scene } from './scene';
export interface SceneProblem {
    kind: 'node-overlap' | 'outside';
    ids: string[];
    /** Overlap in square pixels, or distance outside in pixels. */
    amount: number;
}
/**
 * Checks a laid-out scene for things a reader would see as broken: nodes on
 * top of each other, or nodes off the canvas. Used by tests and by the
 * playground's debug overlay.
 */
export declare function checkScene(scene: Scene, tolerance?: number): SceneProblem[];
