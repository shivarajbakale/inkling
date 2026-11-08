// @vitest-environment node
// Runs bin/inkling-lsp.mjs as an editor would: a recorded session over stdio
// (open, see problems, complete, hover, quick fix, format, outline, close).
// It uses the built dist-lib/inkling-node.js, rebuilt by `npm run check`.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const built = existsSync(join(root, 'dist-lib', 'inkling-node.js'));

interface Message {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string };
}

class Client {
  proc: ChildProcessWithoutNullStreams;
  buf = Buffer.alloc(0);
  next = 1;
  waiting = new Map<number, (m: Message) => void>();
  notes: Message[] = [];
  noteWaiters: ((m: Message) => void)[] = [];
  constructor() {
    this.proc = spawn(process.execPath, [join(root, 'bin', 'inkling-lsp.mjs')], { cwd: root });
    this.proc.stdout.on('data', (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      for (;;) {
        const end = this.buf.indexOf('\r\n\r\n');
        if (end === -1) return;
        const len = Number(this.buf.subarray(0, end).toString().match(/Content-Length: (\d+)/)![1]);
        if (this.buf.length < end + 4 + len) return;
        const msg = JSON.parse(this.buf.subarray(end + 4, end + 4 + len).toString('utf8')) as Message;
        this.buf = this.buf.subarray(end + 4 + len);
        if (msg.id !== undefined && this.waiting.has(msg.id)) {
          this.waiting.get(msg.id)!(msg);
          this.waiting.delete(msg.id);
        } else {
          const w = this.noteWaiters.shift();
          if (w) w(msg);
          else this.notes.push(msg);
        }
      }
    });
  }
  write(msg: object) {
    const json = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...msg }), 'utf8');
    this.proc.stdin.write(`Content-Length: ${json.length}\r\n\r\n`);
    this.proc.stdin.write(json);
  }
  request(method: string, params: object = {}): Promise<Message> {
    const id = this.next++;
    return new Promise((done) => {
      this.waiting.set(id, done);
      this.write({ id, method, params });
    });
  }
  notify(method: string, params: object = {}) {
    this.write({ method, params });
  }
  notification(): Promise<Message> {
    const queued = this.notes.shift();
    return queued ? Promise.resolve(queued) : new Promise((done) => this.noteWaiters.push(done));
  }
}

describe.skipIf(!built)('language server', () => {
  let c: Client;
  const uri = 'file:///tmp/demo.inkling';
  const text = ['title "Demo"', 'server: box "Server"', 'web ->  serer', 'papr notebook', 'circle web'].join('\n');
  const doc = { textDocument: { uri } };

  beforeAll(() => {
    c = new Client();
  });
  afterAll(() => c.proc.kill());

  it('initializes with what it can do', async () => {
    const r = await c.request('initialize', { processId: null, rootUri: null, capabilities: {} });
    expect(r.result.capabilities).toMatchObject({
      hoverProvider: true,
      documentFormattingProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
      codeActionProvider: { codeActionKinds: ['quickfix'] },
      completionProvider: { triggerCharacters: expect.arrayContaining(['=']) },
    });
    expect(r.result.serverInfo.name).toBe('inkling');
    c.notify('initialized');
  });

  it('publishes problems when a file opens', async () => {
    c.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'inkling', version: 1, text } });
    const n = await c.notification();
    expect(n.method).toBe('textDocument/publishDiagnostics');
    expect(n.params.diagnostics.map((d: any) => [d.code, d.severity, d.range.start])).toEqual([
      ['W-NEW-NAME', 2, { line: 2, character: 8 }],
      ['E-UNKNOWN-LINE', 1, { line: 3, character: 0 }],
    ]);
    expect(n.params.diagnostics[1].message).toBe('I don\'t understand this line. Did you mean "paper"?');
  });

  it('offers quick fixes for the problems under the cursor', async () => {
    const r = await c.request('textDocument/codeAction', { ...doc, range: { start: { line: 3, character: 1 }, end: { line: 3, character: 1 } }, context: { diagnostics: [] } });
    expect(r.result).toHaveLength(1);
    expect(r.result[0]).toMatchObject({ title: 'Change to "paper"', kind: 'quickfix' });
    expect(r.result[0].edit.changes[uri]).toEqual([{ range: { start: { line: 3, character: 0 }, end: { line: 3, character: 4 } }, newText: 'paper' }]);
  });

  it('completes, with the replaced range', async () => {
    const r = await c.request('textDocument/completion', { ...doc, position: { line: 3, character: 4 }, context: { triggerKind: 1 } });
    const paper = r.result.items.find((i: any) => i.label === 'paper');
    expect(paper.textEdit).toEqual({ range: { start: { line: 3, character: 0 }, end: { line: 3, character: 4 } }, newText: 'paper' });
    expect(paper.kind).toBe(14);
    expect(paper.documentation.value).toMatch(/notebook, graph/);
  });

  it('a trigger character only completes where the next word is clear', async () => {
    c.notify('textDocument/didChange', { ...doc, contentChanges: [{ text: 'paper ' }] });
    await c.notification();
    const r = await c.request('textDocument/completion', { ...doc, position: { line: 0, character: 6 }, context: { triggerKind: 2, triggerCharacter: ' ' } });
    expect(r.result.items.map((i: any) => i.label)).toContain('chalkboard');
    c.notify('textDocument/didChange', { ...doc, contentChanges: [{ text }] });
    await c.notification();
    const quiet = await c.request('textDocument/completion', { ...doc, position: { line: 2, character: 7 }, context: { triggerKind: 2, triggerCharacter: ' ' } });
    expect(quiet.result.items).toEqual([]);
  });

  it('hovers, goes to definitions and lists symbols', async () => {
    const h = await c.request('textDocument/hover', { ...doc, position: { line: 4, character: 2 } });
    expect(h.result.contents.value).toMatch(/Loops around a node/);
    expect(h.result.range).toEqual({ start: { line: 4, character: 0 }, end: { line: 4, character: 6 } });
    const d = await c.request('textDocument/definition', { ...doc, position: { line: 1, character: 2 } });
    expect(d.result).toEqual({ uri, range: { start: { line: 1, character: 0 }, end: { line: 1, character: 20 } } });
    const s = await c.request('textDocument/documentSymbol', doc);
    expect(s.result.map((x: any) => [x.name, x.detail])).toEqual([['server', 'Server']]);
  });

  it('formats the whole file', async () => {
    const r = await c.request('textDocument/formatting', { ...doc, options: { tabSize: 2, insertSpaces: true } });
    expect(r.result).toHaveLength(1);
    expect(r.result[0].newText).toContain('web -> serer');
  });

  it('answers unknown methods with MethodNotFound', async () => {
    const r = await c.request('textDocument/rename', doc);
    expect(r.error!.code).toBe(-32601);
  });

  it('clears problems on close, then shuts down cleanly', async () => {
    c.notify('textDocument/didClose', doc);
    const n = await c.notification();
    expect(n.params).toEqual({ uri, diagnostics: [] });
    const r = await c.request('shutdown');
    expect(r.result).toBeNull();
    const code = await new Promise<number | null>((done) => {
      c.proc.on('exit', done);
      c.notify('exit');
    });
    expect(code).toBe(0);
  });
});
