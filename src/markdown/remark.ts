/**
 * remark plugin: turns ```inkling fences into diagrams. Works anywhere
 * remark runs: unified pipelines, MDX, Astro, Docusaurus, Next.js.
 *
 *   import remarkInkling from './vendor/inkling/inkling-remark.js';
 *   unified().use(remarkParse).use(remarkInkling, { mode: 'svg' }).use(remarkRehype).use(rehypeStringify)
 *
 * The output is hast (through `data.hName`), not raw HTML, so it needs no
 * `allowDangerousHtml` and works in MDX.
 */
import type { Root } from 'mdast';
import { embedFonts } from '../node';
import { renderFence, scriptNodes, type HElement, type HNode, type InklingMarkdownOptions } from './fence';
import { isInklingInfo } from './info';

export type { InklingMarkdownOptions } from './fence';
export { parseInfo, type FenceInfo } from './info';

interface MdNode {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  position?: { start: { line: number } };
  children?: MdNode[];
  data?: Record<string, unknown>;
}

interface VFileLike {
  path?: string;
  history?: string[];
  message?: (reason: string) => unknown;
}

function asMdast(node: HElement): MdNode {
  return {
    type: 'inklingDiagram',
    data: { hName: node.tagName, hProperties: node.properties, hChildren: node.children },
  };
}

function findStyle(node: HNode): HElement | null {
  if (node.type !== 'element') return null;
  if (node.tagName === 'style') return node;
  for (const c of node.children) {
    const s = findStyle(c);
    if (s) return s;
  }
  return null;
}

export function remarkInkling(options: InklingMarkdownOptions = {}) {
  // Synchronous unless fonts are being embedded, so `processSync` works.
  return function transform(root: Root, file?: VFileLike): Root | Promise<Root> {
    const tree = root as unknown as MdNode;
    const path = file?.path ?? file?.history?.[0];
    const warn =
      options.warn ??
      ((m: string) => {
        file?.message?.(m);
        console.warn(m);
      });
    let needsScript = false;
    let hydrated = false;
    const pending: Promise<void>[] = [];

    const visit = (parent: MdNode) => {
      const kids = parent.children;
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) {
        const node = kids[i];
        if (node.type === 'code' && isInklingInfo(node.lang)) {
          const result = renderFence(node.value ?? '', node.meta, { ...options, warn }, { file: path, line: node.position?.start.line });
          needsScript ||= result.needsScript;
          hydrated ||= result.mode === 'svg' && !!options.hydrate && !!result.svg;
          if (options.embedFonts && result.svg) {
            const svgNode = result.node.children.find((c): c is HElement => c.type === 'element' && c.tagName === 'svg');
            pending.push(
              embedFonts(result.svg).then((embedded) => {
                const css = embedded.match(/<style>([\s\S]*?)<\/style>/)?.[1];
                const style = svgNode && findStyle(svgNode);
                if (css !== undefined && style) style.children = [{ type: 'text', value: css }];
              }),
            );
          }
          kids[i] = asMdast(result.node);
        } else visit(node);
      }
    };
    visit(tree);
    const finish = () => {
      if (needsScript && tree.children) for (const s of scriptNodes(options, hydrated)) tree.children.push(asMdast(s));
    };
    if (!pending.length) {
      finish();
      return root;
    }
    return Promise.all(pending).then(() => {
      finish();
      return root;
    });
  };
}

export default remarkInkling;
