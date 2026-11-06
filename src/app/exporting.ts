/** Getting a drawing out: files, the clipboard and snippets for other tools. */
import { notifications } from '@mantine/notifications';
import { embedFonts, PAPERS } from '../core';

export const CDN = 'https://cdn.inkling.dev/embed@0.1.js';

export function embedCode(source: string) {
  return `<script type="module" src="${CDN}"></script>\n<inkling-diagram autoplay>\n${source.trim()}\n</inkling-diagram>`;
}

export function markdownFence(source: string) {
  return '```inkling\n' + source.trim() + '\n```';
}

export function reactSnippet(source: string) {
  const body = source.trim().replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `import { Inkling } from 'inkling/react';\n\nconst source = \`\n${body}\n\`;\n\nexport function Diagram() {\n  return <Inkling source={source} autoplay />;\n}`;
}

export async function copy(text: string, what: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    notifications.show({ message: `${what} copied` });
    return true;
  } catch {
    notifications.show({ color: 'red', message: 'Your browser blocked copying. Select the text and copy it by hand.' });
    return false;
  }
}

/** A file name from a drawing name: lower case, dashes, no odd characters. */
export function fileName(name: string, ext: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'drawing'}.${ext}`;
}

/** True when this page probably cannot start downloads (it sits in a sandboxed frame). */
export function downloadsBlocked(): boolean {
  try {
    return window.self !== window.top && !!window.frameElement?.hasAttribute('sandbox');
  } catch {
    // A cross-origin parent: we cannot tell, so assume downloads may be blocked.
    return window.self !== window.top;
  }
}

/** Starts a download. Returns false when it could not, so the caller can fall back to copying. */
export function download(data: Blob, name: string): boolean {
  try {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  } catch {
    return false;
  }
}

/** The finished drawing as a self-contained SVG: fonts embedded, trimmed to the characters used. */
export async function selfContainedSVG(svg: string): Promise<{ svg: string; embedded: boolean }> {
  try {
    const out = await embedFonts(svg);
    return { svg: out, embedded: out.includes('@font-face') };
  } catch {
    return { svg, embedded: false };
  }
}

/** Removes the paper (ground, lines, grain) so only the ink is left. */
export function withoutPaper(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  for (const child of Array.from(root.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'defs' || tag === 'title' || tag === 'desc' || (tag === 'g' && child.getAttribute('class') === 'content')) continue;
    child.remove();
  }
  return new XMLSerializer().serializeToString(root);
}

/** Draws an SVG to a PNG at a scale, on its paper or transparent. */
export async function toPNG(svg: string, scale: number, background: 'paper' | 'transparent', paper?: string): Promise<Blob> {
  const src = background === 'transparent' ? withoutPaper(svg) : svg;
  const w = Number(src.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1] ?? 800);
  const h = Number(src.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1] ?? 600);
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The drawing could not be turned into an image.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d')!;
    if (background === 'paper' && paper && PAPERS[paper]) {
      ctx.fillStyle = PAPERS[paper].ground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Your browser could not make the PNG.'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
