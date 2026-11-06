/**
 * One ```inkling fence → one element tree. Shared by the remark and
 * markdown-it plugins: remark hands the tree to rehype as hast, markdown-it
 * prints it with `toHTML`. Both modes and the error box are built here.
 */
import { parse, readOverrides, renderDiagram, setDirective, type Diagnostic, type SVGTree } from '../node';
import { parseInfo, type Mode } from './info';

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
export type HNode = HElement | { type: 'text'; value: string };
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

const el = (tagName: string, properties: Record<string, string | boolean> = {}, children: HNode[] = []): HElement => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const text = (value: string): HNode => ({ type: 'text', value });

function fromSVGTree(t: SVGTree): HElement {
  return el(
    t.tagName,
    { ...t.attributes },
    t.children.map((c) => (typeof c === 'string' ? text(c) : fromSVGTree(c))),
  );
}

/** Inkling attributes `<inkling-diagram>` understands. Other settings go into the source. */
const ELEMENT_ATTRS = new Set(['paper', 'pen', 'hand', 'mess', 'seed']);

function where(ctx: FenceContext, sourceLine: number): string {
  const line = (ctx.line ?? 0) + sourceLine;
  return `${ctx.file ?? 'markdown'}:${line}`;
}

export function renderFence(source: string, meta: string | null | undefined, options: InklingMarkdownOptions, ctx: FenceContext = {}): FenceResult {
  const info = parseInfo(meta);
  const mode: Mode = info.mode ?? options.mode ?? 'client';
  const cls = options.className ?? 'inkling';
  const errors: string[] = info.problems.map((p) => `${where(ctx, 0)}: ${p}`);
  const { problems } = readOverrides(info.settings);
  for (const p of problems) errors.push(`${where(ctx, 0)}: ${p.key}=${p.value}: ${p.message}`);
  const clean = Object.fromEntries(Object.entries(info.settings).filter(([k]) => !problems.some((p) => p.key === k)));

  let diagnostics: Diagnostic[];
  let node: HElement;
  let svg: string | undefined;
  if (mode === 'svg') {
    const r = renderDiagram(source, { ...clean, fontCss: options.fontCss });
    diagnostics = r.doc.diagnostics;
    svg = r.svg;
    const tree = fromSVGTree(r.tree);
    const style = [`max-width:100%`, info.height ? `height:${info.height}px;width:auto` : `height:auto`].join(';');
    tree.properties.style = style;
    if (info.alt !== undefined) tree.properties['aria-label'] = info.alt;
    else if (r.doc.title) tree.properties['aria-label'] = r.doc.title;
    const props: Record<string, string | boolean> = { class: cls };
    if (options.hydrate) {
      props['data-inkling-source'] = source;
      for (const [k, v] of Object.entries(clean)) props[`data-inkling-${k}`] = v;
      if (info.autoplay) props['data-inkling-autoplay'] = '';
      if (!info.controls) props['data-inkling-controls'] = 'none';
    }
    const children: HNode[] = [tree];
    if (r.doc.title) children.push(el('figcaption', {}, [text(r.doc.title)]));
    node = el('figure', props, children);
  } else {
    diagnostics = parse(source).diagnostics;
    // The element reads these settings as attributes; any others are written into the source.
    let body = source;
    const props: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(clean)) {
      if (ELEMENT_ATTRS.has(k)) props[k] = v;
      else body = setDirective(body, k, v);
    }
    if (info.autoplay) props.autoplay = true;
    if (!info.controls) props.controls = 'none';
    if (info.height) props.style = `display:block;min-height:${info.height}px`;
    if (info.alt !== undefined) props['aria-label'] = info.alt;
    node = el('inkling-diagram', props, [text(`\n${body.replace(/\n+$/, '')}\n`)]);
  }

  for (const d of diagnostics) if (d.severity === 'error') errors.push(`${where(ctx, d.span.line)}: ${d.message}${d.hint ? ` ${d.hint}` : ''} [${d.code}]`);

  if (errors.length && options.strict) throw new Error(`Inkling diagram has errors:\n${errors.join('\n')}`);
  if (errors.length) {
    (options.warn ?? console.warn)(`Inkling: ${errors.join('\n')}`);
    if (mode === 'svg') {
      // In place of the drawing: say what is wrong, where.
      node = el('div', { class: `${cls}-error`, role: 'alert' }, [el('pre', {}, [text(errors.join('\n'))])]);
      svg = undefined;
    }
  }
  return { node, mode, needsScript: mode === 'client' || (mode === 'svg' && !!options.hydrate && !!svg), diagnostics, errors, svg };
}

/**
 * Turns static, hydratable figures into live `<inkling-diagram>` elements
 * once inkling.iife.js has loaded. Added to the page with `hydrate` and
 * `injectScript`.
 */
export const HYDRATE_SCRIPT = `(function(){function up(){if(!window.customElements||!customElements.get('inkling-diagram'))return;document.querySelectorAll('figure[data-inkling-source]').forEach(function(f){var d=document.createElement('inkling-diagram');for(var i=0;i<f.attributes.length;i++){var a=f.attributes[i];if(a.name.indexOf('data-inkling-')===0&&a.name!=='data-inkling-source')d.setAttribute(a.name.slice(13),a.value)}d.setAttribute('source',f.getAttribute('data-inkling-source'));f.replaceWith(d)})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',up);else up()})();`;

/** The script tags a page with diagrams needs, as trees. */
export function scriptNodes(options: InklingMarkdownOptions, hydrated: boolean): HElement[] {
  if (!options.injectScript) return [];
  const out = [el('script', { src: options.injectScript }, [])];
  if (hydrated) out.push(el('script', {}, [text(HYDRATE_SCRIPT)]));
  return out;
}

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
/** Elements whose text the HTML parser takes literally. */
const RAW = new Set(['script', 'style']);

/** Prints a tree as HTML. Text and attributes are escaped, so no source can break out of its element. */
export function toHTML(node: HNode, parentTag = '', inSvg = false): string {
  if (node.type === 'text') {
    // Inside <svg> even <style> text is parsed normally, so it is escaped like any other.
    if (RAW.has(parentTag) && !inSvg) return node.value.replace(/<\/(script|style)/gi, '<\\/$1');
    return escText(node.value);
  }
  const svg = inSvg || node.tagName === 'svg';
  const attrs = Object.entries(node.properties)
    .filter(([, v]) => v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escAttr(String(v))}"`))
    .join('');
  if (svg && !node.children.length) return `<${node.tagName}${attrs}/>`;
  if (VOID.has(node.tagName)) return `<${node.tagName}${attrs}>`;
  return `<${node.tagName}${attrs}>${node.children.map((c) => toHTML(c, node.tagName, svg)).join('')}</${node.tagName}>`;
}
