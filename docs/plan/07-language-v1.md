# Workstream 7: Language tools and freezing the language at v1.0

Goal: writing Inkling is easy in any editor, mistakes explain themselves, and
source that parses in 1.0 keeps parsing forever. This comes last, after
workstreams 5 and 6, because they add syntax, and the language should be frozen
only once.

| Part | Tag | Size |
| --- | --- | --- |
| A. Better errors | v0.11.0 | about 4 days |
| B. Editor tools in the core, and a language server | v0.11.0 | about 6 days |
| C. Freeze: spec, compatibility corpus, policy | v1.0.0 | about 4 days |

---

## A. Better errors (v0.11.0)

The parser never throws and already has 60-odd codes in `docs/errors.md`. The
gaps are coverage and wording.

- **Every code is tested and documented.** A test reads `docs/errors.md` and the
  parser source, then fails if a code is used but not documented, documented but
  not used, or has no test that triggers it.
- **A fix wherever the fix is mechanical.** Today only typos carry a `fix`. Add
  fixes for a missing closing quote, a missing `}`, `->` written as `- >` or `=>`,
  `:` missing after an id (`a box "A"`), and a node used in a layout that doesn't
  take it.
- **Errors about the layout.** A statement that only means something in another
  layout (`row` in flow, `candles` in tree) is a warning today or ignored. Make it
  `W-WRONG-LAYOUT`: "`row` is for `layout compare`." Its fix adds the layout line
  when the file has none.
- **Errors that know the source.** Name suggestions also look at ids defined in
  the file (`a -> serer`: Did you mean "server"?), not only at keywords.
- **Several errors from one cause.** When one line causes several errors (an
  undefined id used ten times), report it once and list the other places
  as related spans.
- **A fuzz test for wording.** Mutate every gallery example a character at a time.
  The parser must never throw, and every diagnostic must have a non-empty message
  and a span inside the source.
- The CLI's `check` prints the hint and fix the way compilers do: the line,
  a caret under the span, then the hint.

## B. Editor tools in the core, and a language server (v0.11.0)

Completion lives in the playground today (`src/app/editor/language.ts`) and only
CodeMirror can use it. Move the logic to the core so every editor gets the same
behaviour.

- **`src/core/complete.ts`:** `complete(source, offset)` returns
  `{ from, to, items: { label, kind, detail, doc }[] }`. It is a port of
  `completeInkling`, framework-free, with new context:
  - It completes the words of the file's layout first (`row` in compare, `set` in
    venn, frames in sequence).
  - It completes set, quadrant and column names where those are expected.
  - It completes inside `{ … }` frames and groups.
- **`hover(source, offset)`:** a short doc for a keyword, a shape, an option or a
  setting value, from the same tables that produce the Syntax page, so the two can
  never disagree.
- **`symbols(source)`:** nodes, groups and steps with their spans, for outline
  views and "go to definition."
- The playground's CodeMirror extension becomes a thin adapter over these three
  functions. Its behaviour must not change; the existing editor tests prove it.
- **`bin/inkling-lsp.mjs`:** a language server over stdio with no new
  dependencies. It hand-writes the small part of JSON-RPC it needs: `initialize`,
  `didOpen`, `didChange`, `publishDiagnostics` (from `parse`), `completion`,
  `hover`, `formatting` (from `format`), `definition` and `documentSymbol`.
  Neovim, Helix, Zed and others can use it with a few lines of config, and the
  README shows them.
- A VS Code extension stays out of scope, as decided on 2026-11-06. With the
  language server in place it would be a short follow-up.
- Tests: the language server runs as a child process in Vitest, with a recorded
  session (open, type, complete, format), and the replies are checked against a
  snapshot.

## C. Freeze at v1.0.0

What freezing means: **any source that parses without errors in 1.0 parses the
same way, without errors, in every 1.x release.** Drawings can still get better
(layouts, routing, fonts), so golden files may change in minor releases. The
meaning of the text can't.

- **`docs/language.md`, the spec.** A grammar for each statement, the list of
  reserved words, the rules for how keywords and ids are told apart, and each
  layout's statements. It is generated in part from the same tables as the Syntax
  page, so it can't drift.
- **Reserved words for later.** Reserve words that are likely to be needed after
  1.0 (`import`, `use`, `style`, `class`, `link`, `theme`, `if`) now, as a
  warning: "`style` is reserved for a future version." That way adding them
  later isn't a breaking change.
- **Compatibility corpus.** `tests/compat/1.0/` holds every gallery example,
  template, fixture, golden source and README snippet, plus a hand-written file per
  statement with every option. A test parses each one and compares the `Doc` to a
  stored snapshot. Any difference in a 1.x release fails the build. New files may
  be added, but existing ones can never change.
- **Deprecation policy.** Something deprecated in 1.x still works and gives a
  `W-DEPRECATED` warning with a fix. It can be removed only in 2.0, and only
  for files that say `inkling 2`.
- **Version line.** `inkling 1` stays optional and means "read as 1.x." A future
  `inkling 2` file is read with 2.0 rules, and the 1.x renderer refuses it
  clearly (`E-VERSION-TOO-NEW`) instead of drawing it wrong.
- **Last look before the freeze.** One pass over the whole language for names
  that are hard to remember or inconsistent, such as `round` against `circle`,
  `steps auto` against `footer off`. Change them before 1.0, each with a
  `W-DEPRECATED` alias. After 1.0 it's too late.
- Release: `v1.0.0` follows the usual release process, plus a note in the README
  on what the 1.x promise covers.

## Done when

- **v0.11.0:** the errors-coverage test passes; every mechanical fix applies
  cleanly in the playground; the language server passes its recorded session
  test; the playground editor uses the core completion with no change in
  behaviour.
- **v1.0.0:** `docs/language.md` is published; the compatibility corpus is in CI;
  the policy is in the README; the naming pass is done.

## Risks

| Risk | Plan |
| --- | --- |
| Freezing too early locks in mistakes | The freeze waits for workstreams 5 and 6, and part C starts with the naming pass |
| The language server's hand-written JSON-RPC misses edge cases | Only the methods listed are supported, and unknown requests get a proper `MethodNotFound` reply |
| Doc snapshots in the corpus are noisy (spans, order) | Snapshot a normalised `Doc`: spans as line:column, and diagnostics sorted |
