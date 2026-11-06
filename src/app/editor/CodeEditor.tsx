import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { lintGutter, lintKeymap } from '@codemirror/lint';
import { Annotation, Compartment, EditorSelection, EditorState, Prec } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder } from '@codemirror/view';
import { inkling } from './language';

export interface CodeEditorHandle {
  /** Selects a range and scrolls it into view. */
  select(from: number, to: number, focus?: boolean): void;
  focus(): void;
  view(): EditorView | null;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  /** Cmd/Ctrl+Enter */
  onRedraw?: () => void;
  /** Cmd/Ctrl+S */
  onSave?: () => void;
  /** Shift+Alt+F */
  onFormat?: () => void;
  /** The line under the mouse, or null when it leaves. */
  onHoverLine?: (line: number | null) => void;
  fontSize?: number;
  readOnly?: boolean;
  height?: string;
  label?: string;
}

/** Marks a change that came from the app (a control, a drag), not from typing. */
const external = Annotation.define<boolean>();

const baseTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--mantine-color-text)', height: '100%' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--mantine-font-family-monospace)', lineHeight: '1.65' },
  '.cm-content': { caretColor: 'var(--mantine-color-text)', padding: '8px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--mantine-color-text)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--mantine-color-dimmed)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'var(--app-wash)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--mantine-color-text)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--ink-code-selection) !important',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--app-surface)',
    color: 'var(--mantine-color-text)',
    border: '1px solid var(--mantine-color-default-border)',
    borderRadius: 'var(--mantine-radius-sm)',
    overflow: 'hidden',
    fontFamily: 'var(--mantine-font-family)',
    fontSize: '13px',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--mantine-color-brand-light)', color: 'var(--mantine-color-text)' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--mantine-font-family-monospace)' },
  '.cm-completionDetail': { color: 'var(--mantine-color-dimmed)', fontStyle: 'normal', marginLeft: '8px' },
  '.cm-diagnostic': { padding: '6px 10px', maxWidth: '420px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--mantine-color-red-6)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'var(--mantine-color-yellow-6)' },
  '.cm-diagnosticAction': {
    backgroundColor: 'var(--mantine-color-brand-filled)',
    color: 'var(--app-on-brand)',
    borderRadius: 'var(--mantine-radius-xs)',
    padding: '2px 8px',
    fontWeight: '600',
    marginLeft: '0',
    marginTop: '6px',
    display: 'inline-block',
  },
  '.cm-diagnosticSource': { display: 'none' },
  '.cm-placeholder': { color: 'var(--mantine-color-placeholder)' },
});

/** Turns `prev` into `next` with one change covering only what differs, so the cursor and undo survive. */
function diff(prev: string, next: string) {
  let a = 0;
  while (a < prev.length && a < next.length && prev[a] === next[a]) a++;
  let b = 0;
  while (b < prev.length - a && b < next.length - a && prev[prev.length - 1 - b] === next[next.length - 1 - b]) b++;
  return { from: a, to: prev.length - b, insert: next.slice(a, next.length - b) };
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cb = useRef(props);
  cb.current = props;
  const size = useRef(new Compartment());
  const ro = useRef(new Compartment());

  useEffect(() => {
    const call = (f?: () => void) => () => {
      f?.();
      return true;
    };
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: cb.current.value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          bracketMatching(),
          closeBrackets(),
          lintGutter(),
          EditorView.lineWrapping,
          placeholder('Write a diagram: a -> b'),
          inkling(),
          baseTheme,
          size.current.of(EditorView.theme({ '&': { fontSize: `${cb.current.fontSize ?? 13}px` } })),
          ro.current.of(EditorState.readOnly.of(!!cb.current.readOnly)),
          Prec.highest(
            keymap.of([
              { key: 'Mod-Enter', run: call(() => cb.current.onRedraw?.()) },
              { key: 'Mod-s', run: call(() => cb.current.onSave?.()), preventDefault: true },
              { key: 'Shift-Alt-f', run: call(() => cb.current.onFormat?.()) },
            ]),
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap, indentWithTab]),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            if (u.transactions.some((tr) => tr.annotation(external))) return;
            cb.current.onChange?.(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ 'aria-label': cb.current.label ?? 'Diagram source', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
          EditorView.domEventHandlers({
            mousemove: (ev, view) => {
              const pos = view.posAtCoords({ x: ev.clientX, y: ev.clientY });
              const line = pos == null ? null : view.state.doc.lineAt(pos).number;
              if (line !== lastHover) {
                lastHover = line;
                cb.current.onHoverLine?.(line);
              }
            },
            mouseleave: () => {
              lastHover = null;
              cb.current.onHoverLine?.(null);
            },
          }),
        ],
      }),
    });
    let lastHover: number | null = null;
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Changes from outside (controls, drags, menus) come in as a minimal edit.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur === props.value) return;
    const change = diff(cur, props.value);
    view.dispatch({ changes: change, annotations: external.of(true) });
  }, [props.value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: size.current.reconfigure(EditorView.theme({ '&': { fontSize: `${props.fontSize ?? 13}px` } })) });
  }, [props.fontSize]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: ro.current.reconfigure(EditorState.readOnly.of(!!props.readOnly)) });
  }, [props.readOnly]);

  useImperativeHandle(ref, () => ({
    select(from, to, focus = true) {
      const view = viewRef.current;
      if (!view) return;
      const len = view.state.doc.length;
      const sel = EditorSelection.range(Math.min(from, len), Math.min(to, len));
      view.dispatch({ selection: sel, effects: EditorView.scrollIntoView(sel, { y: 'center' }) });
      if (focus) view.focus();
    },
    focus: () => viewRef.current?.focus(),
    view: () => viewRef.current,
  }));

  return <div ref={host} className="ink-editor" style={{ height: props.height ?? '100%', minHeight: 0 }} />;
});
