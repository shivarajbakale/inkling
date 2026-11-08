#!/usr/bin/env node
// The Inkling language server: diagnostics, quick fixes, completion, hover,
// formatting, go to definition and an outline, over stdio. No dependencies;
// everything it needs is in dist-lib/inkling-node.js. Editors start it as
//   node /path/to/inkling/bin/inkling-lsp.mjs
// See the README for Neovim, Helix and Zed settings.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [join(here, '..', 'dist-lib', 'inkling-node.js'), join(here, '..', 'inkling-node.js'), join(here, 'inkling-node.js')];
const libPath = candidates.find((p) => existsSync(p));
if (!libPath) {
  process.stderr.write('inkling-lsp: cannot find inkling-node.js. In a clone of Inkling, run `npm run build:lib` first.\n');
  process.exit(2);
}
const ink = await import(pathToFileURL(libPath).href);
const pkg = join(here, '..', 'package.json');
const version = existsSync(pkg) ? JSON.parse(readFileSync(pkg, 'utf8')).version : undefined;

/* ── JSON-RPC over stdio: Content-Length framed messages ─────────────────── */

let buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = buffer.subarray(0, headerEnd).toString('ascii');
    const m = header.match(/Content-Length:\s*(\d+)/i);
    if (!m) {
      buffer = buffer.subarray(headerEnd + 4);
      continue;
    }
    const length = Number(m[1]);
    if (buffer.length < headerEnd + 4 + length) return;
    const body = buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString('utf8');
    buffer = buffer.subarray(headerEnd + 4 + length);
    let msg;
    try {
      msg = JSON.parse(body);
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    handle(msg);
  }
});
process.stdin.on('end', () => process.exit(shutdown ? 0 : 1));

function send(msg) {
  const json = Buffer.from(JSON.stringify(msg), 'utf8');
  process.stdout.write(`Content-Length: ${json.length}\r\n\r\n`);
  process.stdout.write(json);
}
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const notify = (method, params) => send({ jsonrpc: '2.0', method, params });

/* ── Documents and positions ─────────────────────────────────────────────── */

const docs = new Map();
let shutdown = false;

/** LSP positions are line and UTF-16 column; Inkling spans are UTF-16 offsets, the same as JavaScript strings. */
function offsetAt(text, pos) {
  let offset = 0;
  for (let line = 0; line < pos.line; line++) {
    const nl = text.indexOf('\n', offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
  }
  const end = text.indexOf('\n', offset);
  return Math.min(offset + pos.character, end === -1 ? text.length : end);
}
function positionAt(text, offset) {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const line = before.split('\n').length - 1;
  return { line, character: before.length - (before.lastIndexOf('\n') + 1) };
}
const rangeOf = (text, span) => ({ start: positionAt(text, span.from), end: positionAt(text, span.to) });

/** Parser problems plus the layout's own warnings, as the drawing would report them. */
function problems(text) {
  const doc = ink.parse(text);
  const out = [...doc.diagnostics];
  try {
    out.push(...ink.layout(doc).warnings);
  } catch {
    // A crash in a layout is a bug; the parser's problems still help.
  }
  return out;
}

function publish(uri) {
  const text = docs.get(uri);
  if (text === undefined) return;
  notify('textDocument/publishDiagnostics', {
    uri,
    diagnostics: problems(text).map((d) => ({
      range: rangeOf(text, d.span),
      severity: d.severity === 'error' ? 1 : 2,
      code: d.code,
      source: 'inkling',
      message: d.hint ? `${d.message} ${d.hint}` : d.message,
      relatedInformation: d.related?.map((r) => ({ location: { uri, range: rangeOf(text, r) }, message: 'The same name is used here too.' })),
    })),
  });
}

/* ── Requests ────────────────────────────────────────────────────────────── */

const COMPLETION_KIND = { keyword: 14, value: 12, shape: 7, name: 6, option: 10, color: 16, icon: 12 };
const SYMBOL_KIND = { node: 19, group: 5, set: 19, frame: 3, step: 24 };

const handlers = {
  initialize: () => ({
    capabilities: {
      textDocumentSync: { openClose: true, change: 1 },
      completionProvider: { triggerCharacters: [' ', '=', ':', '&'] },
      hoverProvider: true,
      documentFormattingProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
      codeActionProvider: { codeActionKinds: ['quickfix'] },
    },
    serverInfo: { name: 'inkling', version },
  }),
  shutdown: () => {
    shutdown = true;
    return null;
  },
  'textDocument/completion': ({ textDocument, position, context }) => {
    const text = docs.get(textDocument.uri) ?? '';
    // Typing a word invokes completion (kind 1); a trigger character (kind 2) only offers where the next word is clear.
    const r = ink.complete(text, offsetAt(text, position), { explicit: !context || context.triggerKind !== 2 });
    if (!r) return { isIncomplete: false, items: [] };
    const range = rangeOf(text, { from: r.from, to: r.to });
    return {
      isIncomplete: false,
      items: r.items.map((it) => ({
        label: it.label,
        kind: COMPLETION_KIND[it.kind],
        detail: it.detail,
        documentation: it.doc ? { kind: 'markdown', value: it.doc } : undefined,
        sortText: `${(it.boost ?? 0) > 0 ? 'a' : (it.boost ?? 0) < 0 ? 'c' : 'b'}${it.label}`,
        textEdit: { range, newText: it.insert ?? it.label },
      })),
    };
  },
  'textDocument/hover': ({ textDocument, position }) => {
    const text = docs.get(textDocument.uri) ?? '';
    const h = ink.hover(text, offsetAt(text, position));
    return h ? { contents: { kind: 'markdown', value: h.text }, range: rangeOf(text, h) } : null;
  },
  'textDocument/formatting': ({ textDocument }) => {
    const text = docs.get(textDocument.uri) ?? '';
    const tidy = ink.format(text);
    return tidy === text ? [] : [{ range: rangeOf(text, { from: 0, to: text.length }), newText: tidy }];
  },
  'textDocument/definition': ({ textDocument, position }) => {
    const text = docs.get(textDocument.uri) ?? '';
    const span = ink.definition(text, offsetAt(text, position));
    return span ? { uri: textDocument.uri, range: rangeOf(text, span) } : null;
  },
  'textDocument/documentSymbol': ({ textDocument }) => {
    const text = docs.get(textDocument.uri) ?? '';
    return ink.symbols(text).map((s) => ({ name: s.name, detail: s.detail, kind: SYMBOL_KIND[s.kind], range: rangeOf(text, s.span), selectionRange: rangeOf(text, s.span) }));
  },
  'textDocument/codeAction': ({ textDocument, range }) => {
    const text = docs.get(textDocument.uri) ?? '';
    const from = offsetAt(text, range.start);
    const to = offsetAt(text, range.end);
    return problems(text)
      .filter((d) => d.fix && d.span.from <= to && d.span.to >= from)
      .map((d) => {
        const t = d.fix.text;
        const title = t.includes('\n') ? `Add "${t.trim()}"` : d.fix.span.from === d.fix.span.to ? `Insert "${t}"` : `Change to "${t}"`;
        return {
          title,
          kind: 'quickfix',
          isPreferred: true,
          diagnostics: [{ range: rangeOf(text, d.span), severity: d.severity === 'error' ? 1 : 2, code: d.code, source: 'inkling', message: d.message }],
          edit: { changes: { [textDocument.uri]: [{ range: rangeOf(text, d.fix.span), newText: t }] } },
        };
      });
  },
};

const notifications = {
  exit: () => process.exit(shutdown ? 0 : 1),
  'textDocument/didOpen': ({ textDocument }) => {
    docs.set(textDocument.uri, textDocument.text);
    publish(textDocument.uri);
  },
  'textDocument/didChange': ({ textDocument, contentChanges }) => {
    const last = contentChanges[contentChanges.length - 1];
    if (last) docs.set(textDocument.uri, last.text);
    publish(textDocument.uri);
  },
  'textDocument/didClose': ({ textDocument }) => {
    docs.delete(textDocument.uri);
    notify('textDocument/publishDiagnostics', { uri: textDocument.uri, diagnostics: [] });
  },
};

function handle(msg) {
  const isRequest = msg.id !== undefined && msg.id !== null;
  if (!isRequest) {
    try {
      notifications[msg.method]?.(msg.params ?? {});
    } catch (e) {
      process.stderr.write(`inkling-lsp: ${msg.method}: ${e?.stack ?? e}\n`);
    }
    return;
  }
  const fn = handlers[msg.method];
  if (!fn) return send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } });
  if (shutdown && msg.method !== 'shutdown') return send({ jsonrpc: '2.0', id: msg.id, error: { code: -32600, message: 'Server is shutting down' } });
  try {
    reply(msg.id, fn(msg.params ?? {}));
  } catch (e) {
    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e?.message ?? e) } });
  }
}
