import { FONT_CSS_URL, HANDS } from '../core';

/**
 * Loads the handwriting fonts once per stylesheet, like `loadHands` in the
 * web component (which cannot be imported here: its module defines a custom
 * element and so does not load on a server). Browser only.
 */
const loaded = new Map<string, Promise<unknown>>();

function linkStylesheet(url: string): Promise<void> {
  const already =
    document.querySelector(`link[data-inkling-fonts]`) ||
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).some((l) => l.href === url || l.href.includes('family=Caveat'));
  if (already) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.inklingFonts = '';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
    // Never wait forever on a stylesheet.
    setTimeout(resolve, 3000);
  });
}

/** `css`: the font stylesheet URL, or null when the page already loads the fonts. */
export function loadFonts(css: string | null = FONT_CSS_URL): Promise<unknown> {
  const key = css ?? '';
  let p = loaded.get(key);
  if (!p) {
    p = (css ? linkStylesheet(css) : Promise.resolve())
      .then(() => {
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (!fonts?.load) return;
        return Promise.all(
          Object.values(HANDS).flatMap((h) => [fonts.load(`${h.weight} 20px '${h.family}'`), fonts.load(`700 20px '${h.family}'`)]),
        );
      })
      .catch(() => undefined);
    loaded.set(key, p);
  }
  return p;
}
