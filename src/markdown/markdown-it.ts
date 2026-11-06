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
import { renderFence, scriptNodes, toHTML, type InklingMarkdownOptions } from './fence';
import { isInklingInfo } from './info';

export type { InklingMarkdownOptions } from './fence';

export interface InklingMarkdownItOptions extends InklingMarkdownOptions {
  /**
   * The HTML becomes a Vue template (VitePress): mark each diagram `v-pre`
   * so Vue leaves its text alone, `{{ }}` included.
   */
  vue?: boolean;
}
export { parseInfo, type FenceInfo } from './info';

/* The few markdown-it shapes this plugin touches, so it has no dependency on markdown-it's types. */
interface Token {
  type: string;
  info: string;
  content: string;
  map: [number, number] | null;
  meta: unknown;
}
type Rule = (tokens: Token[], idx: number, options: unknown, env: Record<string, unknown>, self: unknown) => string;
interface MarkdownItLike {
  renderer: { rules: Record<string, Rule | undefined> };
  core: { ruler: { push(name: string, fn: (state: { tokens: Token[]; env: Record<string, unknown>; Token: new (type: string, tag: string, nesting: number) => Token }) => void): void } };
}

// `md` is typed loosely so any markdown-it version's instance can be passed to `md.use`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inklingMarkdownIt(instance: any, options: InklingMarkdownItOptions = {}): void {
  const md = instance as MarkdownItLike;
  const previous = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (!isInklingInfo(token.info)) return previous ? previous(tokens, idx, opts, env, self) : '';
    const meta = token.info.trim().replace(/^\S+\s*/, '');
    const file = (env?.relativePath ?? env?.path ?? env?.file) as string | undefined;
    const result = renderFence(token.content.replace(/\n$/, ''), meta, options, { file, line: token.map ? token.map[0] + 1 : undefined });
    if (options.vue) result.node.properties['v-pre'] = true;
    return toHTML(result.node) + '\n';
  };

  // One script tag per page, after the content, when anything needs it.
  if (options.injectScript) {
    md.core.ruler.push('inkling_script', (state) => {
      let client = false;
      let hydrated = false;
      for (const t of state.tokens) {
        if (t.type !== 'fence' || !isInklingInfo(t.info)) continue;
        const mode = /(?:^|\s)mode=(svg|client)\b/.exec(t.info)?.[1] ?? options.mode ?? 'client';
        if (mode === 'client') client = true;
        else if (options.hydrate) hydrated = true;
      }
      if (!client && !hydrated) return;
      const tok = new state.Token('html_block', '', 0);
      tok.content = scriptNodes(options, hydrated).map((n) => toHTML(n)).join('\n') + '\n';
      state.tokens.push(tok);
    });
  }
}

export default inklingMarkdownIt;
