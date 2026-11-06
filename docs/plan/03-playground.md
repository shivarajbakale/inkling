# Workstream 3 — Playground as a product

Goal: turn the playground from a demo into a tool someone uses every week to
explain things. It stays a static web app with no server; everything is stored in
the browser.

Needs the tokenizer, source positions and diagnostics from workstream 1 (v0.3.0).
It can run beside workstream 2; new layouts show up in it as they land.

## Users and jobs

- **The writer:** "I need a diagram for this doc or post in five minutes." Needs
  templates, fast feedback, and export or embed in one click.
- **The teacher:** "I explain the same ideas again and again." Needs a library of
  saved drawings, steps and a full-screen present mode.
- **The engineer:** "I want this in our docs and repo." Needs copyable source, the
  embed snippet and the Markdown fence.

## Screens

| Screen | Purpose |
| --- | --- |
| Library (new home) | Your drawings as thumbnails; new from blank or template |
| Editor | Source on one side, drawing on the other (today's playground, rebuilt) |
| Templates | Starting points grouped by layout |
| Present | Full screen, one step at a time |
| Syntax, How it works | As today, updated for the new language |
| Embed | As today, plus the React and Markdown snippets |

## E1. Code editor (about 4 days)

Replace the textarea with CodeMirror 6.

- **Highlighting:** a `StreamLanguage` built on the core tokenizer, so the editor
  and the parser always agree. Token classes map to Mantine theme colours in light
  and dark.
- **Diagnostics:** `@codemirror/lint` underlines each diagnostic's span, with the
  message and the "did you mean" hint. A quick fix applies the suggestion.
- **Autocomplete:** keywords; shapes after `:`; papers, pens, hands and colours
  after their keyword; node ids anywhere an id goes (from the last good parse);
  layout names; icon names after `icon`.
- **Keys:**
  - Cmd/Ctrl+Enter redraws with animation.
  - Cmd/Ctrl+S saves to the library.
  - Cmd/Ctrl+/ toggles a comment.
  - Alt+Up/Down moves lines.
- **Format:** a button and a key that normalise spacing around `->` and `:` and
  indent bullets. The formatter lives in core, so the CLI can use it too.
- **Mobile:** the editor and the drawing become two tabs below 768 px instead of
  sitting side by side.

## E2. Drawing and source linked both ways (about 4 days)

The draw step stamps `data-ink-id` and `data-ink-line` on each node, arrow and mark
group, using the spans from the parser.

- **Hover a line:** the matching element in the drawing gets a soft halo.
- **Click an element:** the editor selects its defining line and scrolls to it.
- **Double-click a label:** an inline text box over the drawing edits the label.
  Enter writes the new text into the source span.
- **Drag a node** in the free layout: writes `at x,y`. In other layouts, dragging
  offers "Switch to free layout to place nodes by hand".
- **Right-click a node:** a menu with circle it, highlight it, add a note, check,
  cross, and delete. Each action inserts or removes a source line.
- All of these go through one module, `src/app/edits.ts`, a set of pure functions
  `(source, action) => newSource`, with unit tests.

## E3. Library and autosave (about 4 days)

- **Storage:** IndexedDB through a thin wrapper of about 60 lines. Each drawing is
  stored as `{ id, name, source, createdAt, updatedAt, thumbnail }`, where the
  thumbnail is the finished SVG at small size.
- **Autosave:** the open drawing saves 1 s after typing stops. A "Saved" status
  shows in the editor header.
- **Library screen:** a grid of thumbnail cards, with search by name and content,
  sort by recent or name, and rename, duplicate and delete. Delete asks for
  confirmation in the page, not with `confirm()`.
- **Files:**
  - Import `.inkling` files with a file picker or by dropping them on the page.
  - Export the current drawing as a `.inkling` file.
  - Export everything as one JSON backup file, and import it back.
- **Empty state:** a first visit opens one example drawing, so the screen is never
  blank.
- **Storage failure** (private window, blocked storage): the app still works, and a
  banner says drawings will not be kept.

## E4. Templates (about 2 days)

- 2–3 templates per layout, about 20 in all, in `examples/templates/*.inkling`.
  Each has a front-matter comment with name, layout and a one-line description.
- Templates screen: filter by layout; each card has a live thumbnail and "Use
  this". Using one creates a new library drawing.
- "New drawing" opens a picker: Blank, or one template per layout.

## E5. Export and share (about 3 days)

- **SVG:** a self-contained file. The handwriting font is embedded as base64
  `@font-face`, trimmed to the characters used, so the file renders anywhere,
  including tools that block web fonts. The font-embedding helper goes in core,
  because the CLI and Markdown build mode need it too.
- **PNG:** the self-contained SVG drawn to a canvas at 1×, 2× or 3×, with a
  transparent or paper background.
- **Copy as:** embed snippet, Markdown fence, React snippet, or the source alone.
- **Share link:** the source deflated and base64url-encoded into the URL
  (`/#/d/<data>`). Opening it shows a read-only view with "Make a copy". This needs
  hosting that keeps the URL hash: GitHub Pages or any static host. The claude.ai
  preview page cannot carry it and stays a demo.
- **Downloads:** they work on a normal static host. Where the page is sandboxed and
  downloads are blocked, fall back to copy.

## E6. Present mode (about 1 day)

- Full screen (where allowed), the drawing scaled to fit, and the caption large
  below it.
- Keys: right arrow or space goes to the next step, left arrow goes back, Esc exits.
- A small progress row of step dots.
- Reuses `Player`; no new drawing code.

## E7. Look presets and settings (about 1 day)

- Presets that set paper, pen, hand and mess in one click:
  - **Teacher:** notebook, ballpoint, Caveat, 0.45.
  - **Engineer:** graph, pencil, Kalam, 0.3.
  - **Chalk talk:** chalkboard, chalk, Kalam, 0.5.
  - **Napkin:** napkin, marker, Gochi, 0.6.
  - **Whiteboard:** whiteboard, marker, Patrick, 0.35.
- Presets write the setting lines, as the current controls do.
- App settings: animation speed, autoplay on open, and editor font size. Stored in
  `localStorage`.

## E8. AI drafting through Claude Code (about 2 days, optional)

- `scripts/inkling.mjs check <file>` runs the parser in Node and prints diagnostics
  in the format `file:line: message`. It needs no DOM.
- A Claude Code skill, `.claude/skills/inkling/SKILL.md`, teaches the language
  with examples and tells Claude to run `check` until the file is clean.
- An in-app "Draft with AI" button is deferred. It would need an API key in the
  browser or a server, and neither fits a static app.

## Hosting

- Build with `npm run build` and deploy `dist/` to GitHub Pages from CI on every
  tag. The playground then has a stable URL, and share links work.
- The claude.ai page stays as a quick preview, updated by hand.

## Tests

- Unit tests: `edits.ts` (every source rewrite), the formatter, share-link encoding,
  and the storage wrapper using `fake-indexeddb`.
- Playwright end-to-end tests:
  - Type, the drawing updates, an error is underlined, and a quick fix clears it.
  - Click a node, and its line is selected.
  - Double-click a label, edit it, and the source changes.
  - Save, reload, and the drawing is in the library.
  - Use a template.
  - Export SVG; the file contains `@font-face`.
  - Open a share link.
  - Present mode, stepping with the keys.
- Screenshot checks of every screen in light and dark, at desktop and phone width.

**Done when (v0.6.0):** the end-to-end suite passes, every screen has light, dark and
phone screenshots reviewed, and the app is deployed on a stable URL.
