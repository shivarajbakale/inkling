/**
 * Inkling for Node: draw a diagram to an SVG string with no browser.
 *
 *   import { renderToSVG } from './vendor/inkling/inkling-node.js';
 *   const svg = renderToSVG('a -> b : "hello"', { paper: 'napkin' });
 *
 * A DOM shim (linkedom) is bundled; text is measured from the built-in font
 * metrics, so the drawing is the same as the browser's. Used by the Markdown
 * plugins and the command line.
 */
import { parseHTML } from 'linkedom';
import { FONT_CSS_URL, render, type Diagnostic, type Doc, type Settings } from '../core';
import { readOverrides } from './settings';

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

/** Short stable hash, for default id prefixes. */
function hashId(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return 'ink' + (h >>> 0).toString(36);
}

function toTree(el: Element): SVGTree {
  const attributes: Record<string, string> = {};
  // linkedom lists attributes newest first; browsers keep the order they were set in.
  for (const a of Array.from(el.attributes).reverse()) attributes[a.name] = a.value;
  const children: (SVGTree | string)[] = [];
  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === 1) children.push(toTree(c as Element));
    else if (c.nodeType === 3 && c.textContent) children.push(c.textContent);
  }
  return { tagName: el.localName || el.tagName, attributes, children };
}

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => escText(s).replace(/"/g, '&quot;');

/** XML, as a browser's XMLSerializer writes it. */
function serialize(t: SVGTree): string {
  const attrs = Object.entries(t.attributes)
    .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
    .join('');
  if (!t.children.length) return `<${t.tagName}${attrs}/>`;
  return `<${t.tagName}${attrs}>${t.children.map((c) => (typeof c === 'string' ? escText(c) : serialize(c))).join('')}</${t.tagName}>`;
}

/** Renders source and returns the SVG with everything known about it. Never throws. */
export function renderDiagram(source: string, options: RenderToSVGOptions = {}): RenderResult {
  const { idPrefix, fontCss, ...settings } = options;
  const { overrides, problems } = readOverrides(settings as Record<string, string | number | undefined>);
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const { doc, drawing } = render(source, overrides, {
    document: document as unknown as Document,
    idPrefix: idPrefix ?? hashId(JSON.stringify([source, overrides])),
  });
  const svg = drawing.svg as SVGSVGElement;
  // A drawing starts with its text masked off, ready to be written on. Show it finished.
  for (const item of drawing.items)
    for (const p of item.pieces) if (p.mode === 'clip' && p.clip) p.clip.setAttribute('width', String((p.clipW ?? 0) + 40));
  if (fontCss !== undefined) {
    const style = svg.querySelector('defs > style');
    if (style) {
      if (fontCss === null) style.remove();
      else style.textContent = `@import url('${fontCss.replace(/'/g, '%27')}');`;
    }
  }
  const span = { line: 1, from: 0, to: 0 };
  const diagnostics: Diagnostic[] = [
    ...problems.map((p) => ({ code: 'E-BAD-OVERRIDE', severity: 'error' as const, message: `${p.key}=${p.value}: ${p.message}`, span })),
    ...doc.diagnostics,
  ];
  const tree = toTree(svg);
  return {
    svg: serialize(tree),
    tree,
    doc,
    diagnostics,
    width: Number(svg.getAttribute('width')) || 0,
    height: Number(svg.getAttribute('height')) || 0,
  };
}

/** Draws source as a finished SVG string. Settings in `options` override the source's. */
export function renderToSVG(source: string, options: RenderToSVGOptions = {}): string {
  return renderDiagram(source, options).svg;
}

/** The handwriting font stylesheet the SVGs import by default. */
export const DEFAULT_FONT_CSS = FONT_CSS_URL;
