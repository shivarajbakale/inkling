/** Creating SVG elements in whichever document the drawing targets. */

export const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;
/** The document drawing happens in: the page's, or a DOM shim's in Node. */
let D: Document;

export function useDocument(d: Document) {
  D = d;
}

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = D.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
}
