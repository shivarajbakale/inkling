import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import {
  addNote,
  applyEdit,
  applyFix,
  applyPreset,
  currentPreset,
  deleteNode,
  hasMark,
  quote,
  ref,
  setEdgeLabel,
  setNodeLabel,
  setPosition,
  toggleMark,
} from '../src/app/edits';

const errors = (s: string) => parse(s).diagnostics.filter((d) => d.severity === 'error');

describe('quote and ref', () => {
  it('escapes quotes, backslashes and newlines', () => {
    expect(quote('say "hi"\nnow \\')).toBe('"say \\"hi\\"\\nnow \\\\"');
  });
  it('quotes names that are not bare identifiers', () => {
    expect(ref('api')).toBe('api');
    expect(ref('load-balancer')).toBe('load-balancer');
    expect(ref('Load balancer')).toBe('"Load balancer"');
  });
});

describe('setNodeLabel', () => {
  it('replaces an existing label', () => {
    expect(setNodeLabel('api: box "API" yellow\n', 'api', 'Gateway')).toBe('api: box "Gateway" yellow\n');
  });
  it('adds a label after the shape', () => {
    expect(setNodeLabel('api: round color=red\n', 'api', 'API')).toBe('api: round "API" color=red\n');
  });
  it('adds a label after an icon name', () => {
    expect(setNodeLabel('s: icon server\n', 's', 'Server')).toBe('s: icon server "Server"\n');
  });
  it('adds a label straight after the colon when there is no shape', () => {
    expect(setNodeLabel('a: yellow\n', 'a', 'A')).toBe('a: "A" yellow\n');
  });
  it('keeps comments', () => {
    expect(setNodeLabel('a: box "A" # first\n', 'a', 'B')).toBe('a: box "B" # first\n');
  });
  it('escapes the new text', () => {
    const out = setNodeLabel('a: box "A"\n', 'a', 'two\nlines "q"');
    expect(parse(out).nodes[0].label).toBe('two\nlines "q"');
  });
  it('removes the label when the text is empty', () => {
    expect(setNodeLabel('a: box "A"\n', 'a', '')).toBe('a: box\n');
  });
  it('gives a node made by an arrow its own line, indented like the arrow', () => {
    const src = 'group g {\n  a -> b\n}\n';
    const out = setNodeLabel(src, 'b', 'Bee');
    expect(out).toBe('group g {\n  b: "Bee"\n  a -> b\n}\n');
    const d = parse(out);
    expect(d.nodes.find((n) => n.id === 'b')?.label).toBe('Bee');
    expect(d.nodes.find((n) => n.id === 'b')?.group).toBe('g');
    expect(errors(out)).toEqual([]);
  });
  it('leaves the source alone for an unknown node', () => {
    expect(setNodeLabel('a -> b\n', 'zzz', 'x')).toBe('a -> b\n');
  });
  it('works through applyEdit', () => {
    expect(applyEdit('a: box "A"', { type: 'nodeLabel', id: 'a', text: 'B' })).toBe('a: box "B"');
  });
});

describe('setEdgeLabel', () => {
  it('replaces a quoted label and keeps options after it', () => {
    expect(setEdgeLabel('a -> b : "old" color=red\n', 0, 'new')).toBe('a -> b : "new" color=red\n');
  });
  it('replaces an unquoted label', () => {
    expect(setEdgeLabel('a -> b : old text here\n', 0, 'new')).toBe('a -> b : "new"\n');
  });
  it('replaces an unquoted label but keeps trailing options and the comment', () => {
    expect(setEdgeLabel('a -> b : old pen=marker # c\n', 0, 'new')).toBe('a -> b : "new" pen=marker # c\n');
  });
  it('adds a label to an arrow without one', () => {
    expect(setEdgeLabel('a -> b color=red\n', 0, 'go')).toBe('a -> b color=red : "go"\n');
    expect(parse(setEdgeLabel('a -> b color=red\n', 0, 'go')).edges[0]).toMatchObject({ label: 'go', color: 'red' });
  });
  it('removes the label when the text is empty', () => {
    expect(setEdgeLabel('a -> b : "x"\n', 0, '')).toBe('a -> b\n');
  });
  it('only labels the last arrow of a chain', () => {
    const src = 'a -> b -> c : "x"\n';
    expect(setEdgeLabel(src, 1, 'y')).toBe('a -> b -> c : "y"\n');
    expect(setEdgeLabel(src, 0, 'y')).toBe(src);
  });
});

describe('setPosition', () => {
  it('appends at x,y to a definition, before options', () => {
    expect(setPosition('api: box "API" color=red\n', 'api', 200.4, 119.6)).toBe('api: box "API" at 200,120 color=red\n');
  });
  it('replaces an existing at', () => {
    expect(setPosition('api: box "API" at 10,20\n', 'api', 30, 40)).toBe('api: box "API" at 30,40\n');
  });
  it('replaces a relative placement and its gap', () => {
    expect(setPosition('db: db "Orders" below api gap=80\n', 'db', 5, 6)).toBe('db: db "Orders" at 5,6\n');
    expect(setPosition('db: db "Orders" right of api\n', 'db', 5, 6)).toBe('db: db "Orders" at 5,6\n');
  });
  it('keeps a comment at the end', () => {
    expect(setPosition('a: box # here\n', 'a', 1, 2)).toBe('a: box at 1,2 # here\n');
  });
  it('defines a node made by an arrow', () => {
    expect(setPosition('a -> b\n', 'b', 1, 2)).toBe('b: box at 1,2\na -> b\n');
  });
});

describe('marks and notes', () => {
  it('adds a mark at the end', () => {
    expect(toggleMark('a -> b\n', 'circle', 'a')).toBe('a -> b\ncircle a\n');
    expect(toggleMark('a -> b', 'check', 'b')).toBe('a -> b\ncheck b\n');
  });
  it('removes a mark that is already there', () => {
    const src = 'a -> b\ncircle a @2\nhighlight a pink\n';
    expect(hasMark(src, 'circle', 'a')).toBe(true);
    expect(toggleMark(src, 'circle', 'a')).toBe('a -> b\nhighlight a pink\n');
    expect(toggleMark(src, 'highlight', 'a')).toBe('a -> b\ncircle a @2\n');
  });
  it('quotes names with spaces', () => {
    const out = toggleMark('"Load balancer" -> api\n', 'cross', 'Load balancer');
    expect(out).toBe('"Load balancer" -> api\ncross "Load balancer"\n');
    expect(parse(out).annotations[0]).toMatchObject({ kind: 'cross', target: 'Load balancer' });
  });
  it('adds a note', () => {
    const out = addNote('a -> b\n', 'a', 'slow "here"');
    expect(parse(out).annotations[0]).toMatchObject({ kind: 'note', target: 'a', text: 'slow "here"' });
  });
  it('adds a note to an empty source', () => {
    expect(addNote('', 'a', 'x')).toBe('note a "x"\n');
  });
});

describe('deleteNode', () => {
  it('removes the definition, its arrows and its marks', () => {
    const src = 'a: box "A"\nb: box "B"\na -> b : "go"\nb -> a\ncircle a\nnote b "kept"\ncircle a -> b\n';
    expect(deleteNode(src, 'a')).toBe('b: box "B"\nnote b "kept"\n');
  });
  it('splits a chain around the deleted node', () => {
    expect(deleteNode('a -> b -> c -> d : "end"\n', 'b')).toBe('c -> d : "end"\n');
    expect(deleteNode('a -> b -> c -> d : "end"\n', 'c')).toBe('a -> b\n');
    expect(deleteNode('a -> b -> c -> d -> e\n', 'c')).toBe('a -> b\nd -> e\n');
  });
  it('keeps arrow options on each piece of a split chain', () => {
    expect(deleteNode('a -> b -> c -> d color=red : "x"\n', 'c')).toBe('a -> b color=red\n');
    expect(deleteNode('a -> b -> c -> d -> e color=red : "x"\n', 'c')).toBe('a -> b color=red\nd -> e color=red : "x"\n');
    const out = deleteNode('a -> b -> c -> d color=red : "x"\n', 'b');
    expect(out).toBe('c -> d color=red : "x"\n');
    expect(parse(out).edges[0]).toMatchObject({ from: 'c', to: 'd', color: 'red', label: 'x' });
  });
  it('removes it from steps and drops steps left empty', () => {
    const src = 'b: box\na -> b\nstep 1: a, b "first"\nstep 2: a\nstep 3: a "only caption"\n';
    expect(deleteNode(src, 'a')).toBe('b: box\nstep 1: b "first"\nstep 3: "only caption"\n');
  });
  it('also removes nodes that only an arrow to it created', () => {
    expect(deleteNode('a -> b\ncircle b\nstep 1: a, b\n', 'a')).toBe('');
  });
  it('removes it from a one-line group', () => {
    expect(deleteNode('a -> b\ngroup g "G" { a, b }\n', 'a')).toBe('group g "G" { b }\n');
    expect(deleteNode('a: box\nc: box\ngroup g { a }\n', 'a')).toBe('c: box\n');
  });
  it('removes a node defined inside a group block', () => {
    const src = 'group g {\n  a: box "A"\n  b: box "B"\n}\na -> b\n';
    const out = deleteNode(src, 'a');
    expect(out).toBe('group g {\n  b: box "B"\n}\n');
    expect(errors(out)).toEqual([]);
  });
  it('leaves the source alone for an unknown node', () => {
    expect(deleteNode('a -> b\n', 'x')).toBe('a -> b\n');
  });
  it('never leaves errors behind on the gallery-style example', () => {
    const src = 'you: person "You"\nbrowser: box "Browser"\nyou -> browser : types\nbrowser -> resolver\ncircle resolver @2\nstep 1: you, browser "a"\nstep 2: resolver "b"\n';
    for (const id of ['you', 'browser', 'resolver']) expect(errors(deleteNode(src, id))).toEqual([]);
  });
});

describe('fixes and presets', () => {
  it('applies a parser fix', () => {
    const src = 'api: boxx "API"\n';
    const d = parse(src).diagnostics[0];
    expect(d.fix).toBeTruthy();
    expect(applyFix(src, d.fix!)).toBe('api: box "API"\n');
  });
  it('writes the four setting lines of a preset', () => {
    const out = applyPreset('title "T"\npaper notebook\na -> b\n', 'chalk');
    const d = parse(out);
    expect([d.paper, d.pen, d.hand, d.mess]).toEqual(['chalkboard', 'chalk', 'kalam', 0.5]);
    expect(out.startsWith('title "T"\npaper chalkboard\n')).toBe(true);
    expect(currentPreset(d)).toBe('chalk');
  });
  it('every preset parses cleanly', () => {
    for (const p of ['teacher', 'engineer', 'chalk', 'napkin', 'whiteboard']) expect(errors(applyPreset('a -> b', p))).toEqual([]);
  });
  it('ignores an unknown preset', () => {
    expect(applyPreset('a -> b', 'nope')).toBe('a -> b');
  });
  it('formats through applyEdit', () => {
    expect(applyEdit('a->b', { type: 'format' })).toBe('a -> b\n');
    expect(applyEdit('a -> b', { type: 'setting', key: 'paper', value: 'graph' })).toBe('paper graph\na -> b');
  });
});
