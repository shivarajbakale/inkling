import { type Settings } from '../core';
/**
 * Turns `key value` pairs from outside the source (a fence's info string, a
 * command-line flag, a React prop) into setting overrides.
 *
 * Each pair is read by the parser itself, as if it were a line of source, so
 * whatever the language accepts (`layout down`, a new layout name, a paper)
 * works here too, and a bad value gets the parser's own message. Shared by
 * the Node renderer, the Markdown plugins, the CLI and the React wrapper; it
 * needs no DOM.
 */
export interface OverrideProblem {
    key: string;
    value: string;
    message: string;
}
/** Keys that are settings. Anything else is not an override. */
export declare const SETTING_KEYS: readonly ['paper', 'pen', 'hand', 'mess', 'seed', 'layout', 'direction'];
export declare function isSettingKey(key: string): boolean;
export declare function readOverrides(pairs: Record<string, string | number | undefined | null>): {
    overrides: Partial<Settings>;
    problems: OverrideProblem[];
};
