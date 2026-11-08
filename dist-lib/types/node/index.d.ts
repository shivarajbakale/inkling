import { type Diagnostic, type Doc, type Settings } from '../core';
export { complete, hover, symbols, definition, REFERENCE } from '../core';
export type { CompletionItem, Completions, Hover, DocSymbol } from '../core';
export { parse, setDirective, format, layout, checkScene, describe, describeLines, embedFonts, LAYOUTS, PAPERS, PENS, HANDS, COLORS, FONT_CSS_URL } from '../core';
export type { Diagnostic, Doc, Settings, Span, EmbedOptions } from '../core';
export { readOverrides, SETTING_KEYS, isSettingKey, type OverrideProblem } from './settings';
export interface RenderToSVGOptions extends Partial<Settings> {
    /**
     * Prefix for ids inside the SVG (clip paths, patterns). Diagrams inlined in
     * one page need different prefixes. Defaults to one made from the source,
     * so the same input always gives the same output.
     */
    idPrefix?: string;
    /**
     * The stylesheet the SVG imports its handwriting fonts from. Defaults to
     * Google Fonts. Pass your own URL to self-host them, or null when the page
     * already loads them (the SVG then carries no @import).
     */
    fontCss?: string | null;
}
/** A tree of the drawn SVG, for tools that build their own documents (rehype, MDX). */
export interface SVGTree {
    tagName: string;
    attributes: Record<string, string>;
    children: (SVGTree | string)[];
}
export interface RenderResult {
    /** The finished drawing as SVG markup. */
    svg: string;
    /** The same drawing as a plain tree. */
    tree: SVGTree;
    /** The parsed source, with any overrides applied. */
    doc: Doc;
    /** Everything wrong: the source's own diagnostics, layout warnings and bad overrides. */
    diagnostics: Diagnostic[];
    width: number;
    height: number;
}
/** Renders source and returns the SVG with everything known about it. Never throws. */
export declare function renderDiagram(source: string, options?: RenderToSVGOptions): RenderResult;
/** Draws source as a finished SVG string. Settings in `options` override the source's. */
export declare function renderToSVG(source: string, options?: RenderToSVGOptions): string;
/** The handwriting font stylesheet the SVGs import by default. */
export declare const DEFAULT_FONT_CSS = "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Kalam:wght@400;700&family=Patrick+Hand&family=Gochi+Hand&family=Architects+Daughter&display=swap";
