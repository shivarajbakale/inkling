/** "Did you mean" suggestions by edit distance. */

function distance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[n];
}

/** The closest candidate, if it is close enough to be a likely typo. */
export function closest(word: string, candidates: Iterable<string>): string | undefined {
  const w = word.toLowerCase();
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = distance(w, c.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const limit = w.length <= 3 ? 1 : w.length <= 6 ? 2 : 3;
  return bestD > 0 && bestD <= limit ? best : undefined;
}

export function didYouMean(word: string, candidates: Iterable<string>): string | undefined {
  const c = closest(word, candidates);
  return c ? `Did you mean "${c}"?` : undefined;
}
