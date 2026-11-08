import type { LayoutFn } from '../scene';
import type { NodeDef } from '../types';
import { flow } from './flow';

/**
 * State machines. States are round boxes placed by the flow engine, ranked
 * from the start dots (`start x`) so the happy path reads in one direction.
 * `final x` adds a bullseye. Groups are composite states. Self-loops and
 * arrows both ways between two states are handled by the router.
 */
export const state: LayoutFn = (doc) => {
  // States default to round boxes; a shape the author chose wins.
  const styled = (d: NodeDef): NodeDef => (d.shape === 'box' ? { ...d, shape: 'round' } : d);
  const nodes = doc.nodes.map(styled);
  const scene = flow({ ...doc, nodes });
  scene.layout = 'state';
  scene.humanise = { tilt: 2.4, stickyTilt: 6, jitterX: 10, jitterY: 8 };
  // The scene's nodes carry the restyled defs; tell the drawing about them.
  scene.defs = new Map(nodes.filter((n, k) => n !== doc.nodes[k]).map((n) => [n.id, n]));

  const starts = doc.nodes.filter((n) => n.shape === 'dot').map((n) => n.id);
  const states = doc.nodes.filter((n) => n.shape !== 'dot' && n.shape !== 'bullseye');
  const out = new Map<string, number[]>();
  doc.edges.forEach((e, i) => out.set(e.from, [...(out.get(e.from) ?? []), i]));

  const warn = (code: string, message: string, hint?: string, span = { line: 1, from: 0, to: 0 }) =>
    scene.warnings.push({ code, severity: 'warning', message, hint, span });
  let roots = starts;
  if (!starts.length && states.length) {
    warn('W-STATE-NO-START', 'This state machine has no start.', `Add  start ${states[0].id}  to mark where it begins.`);
    roots = [[...states].sort((a, b) => a.order - b.order)[0].id];
  }

  // Breadth-first from the starts: each state, with the arrows into it, is one step.
  const nodeStep = new Map<string, number>();
  const edgeStep = new Map<number, number>();
  let step = 1;
  let frontier = roots;
  for (const r of roots) nodeStep.set(r, 1);
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const i of out.get(id) ?? []) {
        const to = doc.edges[i].to;
        if (!nodeStep.has(to)) {
          nodeStep.set(to, ++step);
          next.push(to);
        }
        edgeStep.set(i, nodeStep.get(to)!);
      }
    }
    frontier = next;
  }
  // A start dot draws with its first state.
  for (const s of starts) {
    const first = (out.get(s) ?? []).map((i) => doc.edges[i].to)[0];
    if (first && nodeStep.has(first)) nodeStep.set(s, nodeStep.get(first)!);
  }
  const unreachable = states.filter((n) => !nodeStep.has(n.id));
  if (unreachable.length && (starts.length || roots.length))
    warn(
      'W-STATE-UNREACHABLE',
      `Nothing leads to ${unreachable.map((n) => `"${n.id}"`).join(', ')} from the start.`,
      'Add an arrow into it, or another start line.',
      unreachable[0].span,
    );
  for (const n of doc.nodes) if (!nodeStep.has(n.id)) nodeStep.set(n.id, ++step);
  doc.edges.forEach((e, i) => {
    if (!edgeStep.has(i)) edgeStep.set(i, Math.max(nodeStep.get(e.from)!, nodeStep.get(e.to)!));
  });
  scene.autoSteps = { nodes: nodeStep, edges: edgeStep };
  return scene;
};
