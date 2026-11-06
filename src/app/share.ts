/**
 * Share links: the source, deflated and base64url-encoded into the URL hash
 * as `#/d/<data>`. Nothing is uploaded; the link is the drawing.
 *
 * The first character says how the rest is encoded: `z` for deflate-raw,
 * `u` for plain UTF-8 (used when the browser has no CompressionStream).
 */

const toB64url = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const body = new Response(bytes as BufferSource).body!.pipeThrough(stream);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

export async function encodeShare(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  if (typeof CompressionStream === 'function') {
    try {
      return 'z' + toB64url(await pipe(bytes, new CompressionStream('deflate-raw')));
    } catch {
      /* fall through to plain */
    }
  }
  return 'u' + toB64url(bytes);
}

/** Decodes share data. Throws an Error with a plain message when the link is broken. */
export async function decodeShare(data: string): Promise<string> {
  const kind = data[0];
  const rest = data.slice(1);
  let bytes: Uint8Array;
  try {
    bytes = fromB64url(rest);
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'u') throw new Error('unknown kind');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('This share link is damaged or incomplete. Ask for the link again, and check that it was copied in full.');
  }
}

export const SHARE_PREFIX = '#/d/';

/** The full link for a source, on the current page. */
export async function shareUrl(source: string, base = `${location.origin}${location.pathname}`): Promise<string> {
  return `${base}${SHARE_PREFIX}${await encodeShare(source)}`;
}

/** The data part of a share hash, or null if the hash is not a share link. */
export function shareData(hash: string): string | null {
  return hash.startsWith(SHARE_PREFIX) ? hash.slice(SHARE_PREFIX.length) : null;
}
