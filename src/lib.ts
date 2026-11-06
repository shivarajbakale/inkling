/**
 * Inkling as a library. Import this file (or load the built
 * `inkling.iife.js`) and `<inkling-diagram>` is ready to use.
 *
 *   import { mount, drawInto } from './vendor/inkling/inkling.js';
 *   await drawInto(document.querySelector('#here'), 'a -> b : hello');
 */
import { mount, Player, type Diagram, type Settings } from './core';
import { defineInkling, loadHands } from './embed/element';

export { mount, render, parse, layout, checkScene, setDirective, tokenize, tokenizeLine, Player, PAPERS, PENS, HANDS, COLORS, FONT_CSS_URL } from './core';
export type { Diagnostic, Diagram, Doc, Settings, Span, StepInfo, Token, TokenType } from './core';
export { InklingDiagram, defineInkling, loadHands, setFontSource } from './embed/element';

export const version = '0.3.0';

export interface DrawOptions extends Partial<Settings> {
  /** Play the draw-on animation once it is drawn. */
  animate?: boolean;
}

/**
 * Waits for the handwriting fonts, then draws into `container`.
 * Use this instead of `mount` unless you load the fonts yourself.
 */
export async function drawInto(container: Element, source: string, options: DrawOptions = {}): Promise<Diagram> {
  await loadHands();
  const { animate, ...overrides } = options;
  const diagram = mount(container, source, overrides);
  if (animate) new Player(diagram).play(true);
  return diagram;
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') defineInkling();
