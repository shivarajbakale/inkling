import type { Doc } from '../types';
import type { Item, StepInfo } from './pieces';

/** Orders the drawn items into steps and gives each a start time. */
export function schedule(items: Item[], doc: Doc): { steps: StepInfo[]; duration: number } {
  items.sort((a, b) => a.step - b.step || a.rank - b.rank);
  const stepIndices = Array.from(new Set(items.filter((i) => i.step >= 0).map((i) => i.step))).sort((a, b) => a - b);
  const steps: StepInfo[] = [];
  let t = 0;
  let k = 0;
  if (items.length && items[0].step < 0) {
    items[0].start = 0;
    t = items[0].dur * 0.85;
    k = 1;
  }
  for (const s of stepIndices) {
    const start = t;
    let end = t;
    while (k < items.length && items[k].step === s) {
      items[k].start = t;
      end = Math.max(end, t + items[k].dur);
      t += items[k].dur * 0.78;
      k++;
    }
    t = end + 0.3;
    steps.push({ index: s, caption: doc.steps.find((d) => d.index === s)?.caption, start, end });
  }
  const duration = items.reduce((m, i) => Math.max(m, i.start + i.dur), 0);
  return { steps, duration };
}
