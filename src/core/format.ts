import { tokenizeLine, type Token } from './syntax/tokens';

/**
 * Tidies Inkling source without changing what it means:
 * - one space around arrows; `id: shape`, `a -> b : label`, `key=value`, `a, b`
 * - two-space indentation inside groups; bullet indentation kept, in steps of two
 * - no trailing spaces, at most one blank line in a row, one newline at the end
 *
 * Lines the formatter does not fully understand are only trimmed.
 * Formatting twice gives the same result as formatting once.
 */
export function format(source: string): string {
  const out: string[] = [];
  let depth = 0;
  let blank = false;
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((raw, i) => {
    const toks = tokenizeLine(raw, i + 1, 0);
    const comment = toks.find((t) => t.type === 'comment');
    const body = toks.filter((t) => t.type !== 'comment');
    if (!toks.length) {
      if (out.length && !blank) out.push('');
      blank = true;
      return;
    }
    blank = false;
    if (body[0]?.type === 'rbrace') depth = Math.max(0, depth - 1);
    const pad = '  '.repeat(depth);

    let text: string;
    if (!body.length) text = '';
    else if (body[0].type === 'bullet') {
      // Bullets carry meaning in their indentation: keep it, normalised to steps of two.
      const lead = raw.slice(0, body[0].from).replace(/\t/g, '  ').length;
      const levels = Math.floor(lead / 2);
      out.push('  '.repeat(levels) + '- ' + raw.slice(body[1]?.from ?? body[0].to, comment ? comment.from : raw.length).trim() + (comment ? ` ${comment.text}` : ''));
      return;
    } else if (body.some((t) => t.type === 'word' || t.error)) text = raw.slice(body[0].from, body[body.length - 1].to).trim();
    else if (body[0].type === 'ident' && body[0].value === 'title' && body[1]?.type !== 'colon' && body[1]?.type !== 'arrow') {
      text = 'title ' + raw.slice(body[0].to, comment ? comment.from : raw.length).trim();
    } else {
      const colonAt = body.findIndex((t) => t.type === 'colon');
      const head = colonAt === -1 ? body : body.slice(0, colonAt);
      if (head.some((t) => t.type === 'arrow') && colonAt !== -1) {
        // Arrow labels may be unquoted free text: keep everything after the colon as written.
        const label = raw.slice(body[colonAt].to, comment ? comment.from : raw.length).trim();
        text = join(head) + (label ? ` : ${label}` : ' :');
      } else text = join(body);
    }
    const line = text ? pad + text + (comment ? ` ${comment.text}` : '') : pad + (comment?.text ?? '');
    out.push(line.replace(/\s+$/, ''));
    if (body[body.length - 1]?.type === 'lbrace') depth++;
  });

  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n') + '\n';
}

/** Joins tokens with Inkling's spacing rules. */
function join(toks: Token[]): string {
  let s = '';
  toks.forEach((t, k) => {
    const prev = toks[k - 1];
    if (k > 0) {
      const tight = t.type === 'colon' || t.type === 'comma' || t.type === 'equals' || prev.type === 'equals' || t.type === 'dots' || prev.type === 'dots';
      if (!tight) s += ' ';
    }
    s += t.text;
  });
  return s;
}
