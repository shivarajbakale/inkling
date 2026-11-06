// @vitest-environment node
// Runs bin/inkling.mjs as a user would. It uses the built dist-lib/inkling-node.js
// (committed, and rebuilt by `npm run check`).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const bin = join(root, 'bin', 'inkling.mjs');
const built = existsSync(join(root, 'dist-lib', 'inkling-node.js'));
const dir = mkdtempSync(join(tmpdir(), 'inkling-cli-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(args: string[], input?: string) {
  const r = spawnSync(process.execPath, [bin, ...args], { cwd: dir, input, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe.skipIf(!built)('inkling command line', () => {
  writeFileSync(join(dir, 'good.inkling'), 'title "Good"\na -> b : "hi"\n');
  writeFileSync(join(dir, 'bad.inkling'), 'a -> b\npapr notebook\nb: rectangel\n');
  mkdirSync(join(dir, 'docs', 'deep'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'one.inkling'), 'x -> y\n');
  writeFileSync(join(dir, 'docs', 'deep', 'two.inkling'), 'p -> q\n');

  it('check: clean file exits 0', () => {
    const r = run(['check', 'good.inkling']);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');
  });

  it('check: errors as file:line: message, exit 1', () => {
    const r = run(['check', 'bad.inkling', 'good.inkling']);
    expect(r.code).toBe(1);
    const lines = r.out.trim().split('\n');
    expect(lines[0]).toMatch(/^bad\.inkling:2: error: I don't understand this line\. Did you mean "paper"\? \[E-UNKNOWN-LINE\]$/);
    expect(lines[1]).toMatch(/^bad\.inkling:3: error: No shape called "rectangel"/);
    expect(r.err).toContain('2 files checked: 2 errors');
  });

  it('check reads stdin', () => {
    const r = run(['check', '-'], 'a: rectangel\n');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^<stdin>:1: error:/);
  });

  it('render: -o writes one SVG, overrides apply', () => {
    const r = run(['render', 'good.inkling', '-o', 'out.svg', '--paper', 'napkin', '--seed=7']);
    expect(r.code).toBe(0);
    const svg = readFileSync(join(dir, 'out.svg'), 'utf8');
    expect(svg).toMatch(/^<\?xml[^>]*>\n<svg/);
    expect(svg).toContain('#f4eee2');
  });

  it('render: a glob writes .svg next to each source', () => {
    const r = run(['render', 'docs/**/*.inkling', '-q']);
    expect(r.code).toBe(0);
    expect(existsSync(join(dir, 'docs', 'one.svg'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'deep', 'two.svg'))).toBe(true);
  });

  it('render: a bad override is an error, -o - writes to stdout', () => {
    const r = run(['render', 'good.inkling', '-o', '-', '--paper', 'nope', '--font-css', 'none']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/paper=nope/);
    expect(r.out).toContain('<svg');
    expect(r.out).not.toContain('@import');
  });

  it('format: prints, --check, --write', () => {
    writeFileSync(join(dir, 'messy.inkling'), 'a   ->   b\n\n\n\nb->c\n');
    const printed = run(['format', 'messy.inkling']);
    expect(printed.code).toBe(0);
    expect(printed.out).not.toBe('a   ->   b\n\n\n\nb->c\n');
    expect(run(['format', 'messy.inkling', '--check']).code).toBe(1);
    expect(run(['format', 'messy.inkling', '--write', '-q']).code).toBe(0);
    expect(readFileSync(join(dir, 'messy.inkling'), 'utf8')).toBe(printed.out);
    expect(run(['format', 'messy.inkling', '--check']).code).toBe(0);
  });

  it('usage errors exit 2', () => {
    expect(run(['draw', 'x']).code).toBe(2);
    expect(run(['render', 'missing.inkling']).code).toBe(2);
    expect(run(['render', 'good.inkling', 'bad.inkling', '-o', 'x.svg']).code).toBe(2);
    expect(run(['--help']).out).toContain('Usage: inkling');
  });
});
