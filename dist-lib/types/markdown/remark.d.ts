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
import { type InklingMarkdownOptions } from './fence';
export type { InklingMarkdownOptions } from './fence';
export { parseInfo, type FenceInfo } from './info';
interface VFileLike {
    path?: string;
    history?: string[];
    message?: (reason: string) => unknown;
}
export declare function remarkInkling(options?: InklingMarkdownOptions): (root: Root, file?: VFileLike) => Root | Promise<Root>;
export default remarkInkling;
