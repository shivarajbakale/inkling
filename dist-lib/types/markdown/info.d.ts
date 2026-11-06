export type Mode = 'client' | 'svg';
export interface FenceInfo {
    /** Setting overrides as written, such as { paper: 'napkin' }. Checked later by the parser. */
    settings: Record<string, string>;
    autoplay: boolean;
    /** False for `controls=none`. */
    controls: boolean;
    /** Pixels, from `height=320`. */
    height?: number;
    alt?: string;
    mode?: Mode;
    /** Problems with the info string itself. */
    problems: string[];
}
/** Splits `a=1 b="x y" c` into pairs. Unquoted values end at whitespace. */
export declare function tokenizeInfo(meta: string): {
    key: string;
    value: string | null;
}[];
/** The language word a fence must start with. */
export declare const LANG = "inkling";
/** True when an info string (`inkling paper=x`) is an Inkling fence. */
export declare function isInklingInfo(info: string | null | undefined): boolean;
export declare function parseInfo(meta: string | null | undefined): FenceInfo;
