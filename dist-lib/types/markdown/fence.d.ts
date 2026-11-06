/**
 * One ```inkling fence → one element tree. Shared by the remark and
 * markdown-it plugins: remark hands the tree to rehype as hast, markdown-it
 * prints it with `toHTML`. Both modes and the error box are built here.
 */
import { type Diagnostic } from '../node';
import { type Mode } from './info';
export interface InklingMarkdownOptions {
    /**
     * `client` (default): the fence becomes `<inkling-diagram>`, drawn and
     * animated in the browser by inkling.iife.js. `svg`: drawn at build time
     * and inlined, with no JavaScript needed. A fence can override it with
     * `mode=svg` or `mode=client`.
     */
    mode?: Mode;
    /**
     * URL of inkling.iife.js. When set, a page with any client-mode (or
     * hydrated) diagram gets one `<script>` tag for it. Leave it out if the
     * site loads the script itself.
     */
    injectScript?: string;
    /** SVG mode: add `data-inkling-source` so the script, if present, upgrades the drawing to an animated one. */
    hydrate?: boolean;
    /** Fail the build on any error in a diagram, instead of drawing an error box. */
    strict?: boolean;
    /**
     * SVG mode: where the SVG imports its fonts from. Defaults to Google
     * Fonts; pass your own stylesheet URL, or null when the site already loads
     * them.
     */
    fontCss?: string | null;
    /**
     * SVG mode, remark only: embed the fonts in each SVG, trimmed to the
     * characters used. Fetches them at build time.
     */
    embedFonts?: boolean;
    /** Class on the `<figure>` (SVG mode) and the error box. Defaults to "inkling". */
    className?: string;
    /** Where problems are reported when not strict. Defaults to console.warn. */
    warn?: (message: string) => void;
}
/** A minimal hast-shaped tree: what both plugins output. */
export type HNode = HElement | {
    type: 'text';
    value: string;
};
export interface HElement {
    type: 'element';
    tagName: string;
    properties: Record<string, string | boolean>;
    children: HNode[];
}
export interface FenceContext {
    /** File being built, for messages. */
    file?: string;
    /** Line of the opening ``` in that file (1-based). */
    line?: number;
}
export interface FenceResult {
    node: HElement;
    mode: Mode;
    /** Needs inkling.iife.js on the page to come alive. */
    needsScript: boolean;
    diagnostics: Diagnostic[];
    /** Errors formatted as `file:line: message`. */
    errors: string[];
    /** SVG mode: the SVG markup, before any font embedding. */
    svg?: string;
}
export declare function renderFence(source: string, meta: string | null | undefined, options: InklingMarkdownOptions, ctx?: FenceContext): FenceResult;
/**
 * Turns static, hydratable figures into live `<inkling-diagram>` elements
 * once inkling.iife.js has loaded. Added to the page with `hydrate` and
 * `injectScript`.
 */
export declare const HYDRATE_SCRIPT = "(function(){function up(){if(!window.customElements||!customElements.get('inkling-diagram'))return;document.querySelectorAll('figure[data-inkling-source]').forEach(function(f){var d=document.createElement('inkling-diagram');for(var i=0;i<f.attributes.length;i++){var a=f.attributes[i];if(a.name.indexOf('data-inkling-')===0&&a.name!=='data-inkling-source')d.setAttribute(a.name.slice(13),a.value)}d.setAttribute('source',f.getAttribute('data-inkling-source'));f.replaceWith(d)})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',up);else up()})();";
/** The script tags a page with diagrams needs, as trees. */
export declare function scriptNodes(options: InklingMarkdownOptions, hydrated: boolean): HElement[];
/** Prints a tree as HTML. Text and attributes are escaped, so no source can break out of its element. */
export declare function toHTML(node: HNode, parentTag?: string, inSvg?: boolean): string;
