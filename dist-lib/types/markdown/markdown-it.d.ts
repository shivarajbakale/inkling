/**
 * markdown-it plugin: turns ```inkling fences into diagrams. For VitePress
 * and any other markdown-it setup.
 *
 *   import inklingMarkdownIt from './vendor/inkling/inkling-markdown-it.js';
 *   md.use(inklingMarkdownIt, { mode: 'svg' });
 *
 * markdown-it renders synchronously, so `embedFonts` is not available here;
 * use `fontCss` to point the SVGs at a stylesheet instead.
 */
import { type InklingMarkdownOptions } from './fence';
export type { InklingMarkdownOptions } from './fence';
export interface InklingMarkdownItOptions extends InklingMarkdownOptions {
    /**
     * The HTML becomes a Vue template (VitePress): mark each diagram `v-pre`
     * so Vue leaves its text alone, `{{ }}` included.
     */
    vue?: boolean;
}
export { parseInfo, type FenceInfo } from './info';
export declare function inklingMarkdownIt(instance: any, options?: InklingMarkdownItOptions): void;
export default inklingMarkdownIt;
