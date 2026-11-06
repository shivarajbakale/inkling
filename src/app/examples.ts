/** Gallery examples and doc samples, loaded from examples/*.inkling. */

export interface Example {
  id: string;
  name: string;
  blurb: string;
  source: string;
}

const gallery = import.meta.glob('../../examples/gallery/*.inkling', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const docs = import.meta.glob('../../examples/docs/*.inkling', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

/** Reads `# key: value` lines at the top of a file. */
export function frontMatter(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^#\s*(\w+):\s*(.*)$/);
    if (!m) break;
    out[m[1]] = m[2].trim();
  }
  return out;
}

export const EXAMPLES: Example[] = Object.keys(gallery)
  .sort()
  .map((path) => {
    const text = gallery[path];
    const meta = frontMatter(text);
    const id = path.split('/').pop()!.replace(/^\d+-/, '').replace(/\.inkling$/, '');
    // The front matter is for the gallery, not the source people edit.
    const source = text.replace(/^(#\s*\w+:.*\n)+/, '');
    return { id, name: meta.name ?? id, blurb: meta.blurb ?? '', source };
  });

const doc = (name: string) => docs[`../../examples/docs/${name}.inkling`];
export const ARCHITECTURE = doc('architecture');
export const EMBED_SAMPLE = doc('cache-aside');
