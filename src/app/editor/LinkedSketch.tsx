import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Group, Menu, Text, TextInput } from '@mantine/core';
import { IconCheck, IconCircle, IconHighlight, IconMessage2, IconTrash, IconX } from '@tabler/icons-react';
import { LAYOUTS, type Diagram, type Doc } from '../../core';
import { hasMark, type EditAction, type MarkKind } from '../edits';
import { Sketch } from '../Sketch';

interface Props {
  source: string;
  doc: Doc;
  /** The line under the mouse in the editor: its elements get a halo. */
  hoverLine: number | null;
  /** Bumped to redraw with the animation. */
  playToken: number;
  autoplay: boolean;
  speed: number;
  onDiagram: (d: Diagram | null, error?: string) => void;
  /** Select this source range in the editor. */
  onSelect: (from: number, to: number) => void;
  onEdit: (action: EditAction) => void;
  /** Read-only views show the drawing without any editing. */
  readOnly?: boolean;
}

interface LabelEdit {
  kind: 'node' | 'edge';
  id: string;
  index: number;
  value: string;
  x: number;
  y: number;
  w: number;
}

interface NodeMenu {
  id: string;
  x: number;
  y: number;
}

/** Bounds of an element relative to a container, in CSS pixels. */
function boundsIn(el: Element, container: Element) {
  const c = container.getBoundingClientRect();
  const texts = el.querySelectorAll('text');
  const list = texts.length ? Array.from(texts) : [el];
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const x of list) {
    const rc = x.getBoundingClientRect();
    l = Math.min(l, rc.left);
    t = Math.min(t, rc.top);
    r = Math.max(r, rc.right);
    b = Math.max(b, rc.bottom);
  }
  return { x: (l + r) / 2 - c.left, y: (t + b) / 2 - c.top, w: r - l };
}

const markItems: { mark: MarkKind; on: string; off: string; icon: typeof IconCircle }[] = [
  { mark: 'circle', on: 'Circle it', off: 'Remove circle', icon: IconCircle },
  { mark: 'highlight', on: 'Highlight it', off: 'Remove highlight', icon: IconHighlight },
  { mark: 'check', on: 'Add a check', off: 'Remove check', icon: IconCheck },
  { mark: 'cross', on: 'Add a cross', off: 'Remove cross', icon: IconX },
];

/**
 * The drawing, linked to the source: click selects the line, double-click
 * edits a label in place, right-click opens a menu of marks, and in the free
 * layout a drag writes the node's position.
 */
export function LinkedSketch({ source, doc, hoverLine, playToken, autoplay, speed, onDiagram, onSelect, onEdit, readOnly }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [label, setLabel] = useState<LabelEdit | null>(null);
  const [menu, setMenu] = useState<NodeMenu | null>(null);
  const [dragHint, setDragHint] = useState(false);
  const drag = useRef<{ g: SVGGElement; id: string; x0: number; y0: number; transform: string; moved: boolean; scale: number } | null>(null);
  const suppressClick = useRef(false);
  // A click waits a moment, so the two clicks of a double-click do not also move the cursor.
  const clickTimer = useRef(0);
  const free = doc.layout === 'free';

  // Halo on whatever the hovered line defines.
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    root.querySelectorAll('.ink-halo').forEach((e) => e.classList.remove('ink-halo'));
    if (hoverLine != null) root.querySelectorAll(`[data-ink-line="${hoverLine}"]`).forEach((e) => e.classList.add('ink-halo'));
  }, [hoverLine, diagram]);

  const target = (ev: { target: EventTarget | null }, kinds = '[data-ink-from]') => (ev.target as Element | null)?.closest?.(kinds) ?? null;

  const commitLabel = () => {
    if (!label) return;
    const text = label.value.replace(/\\n/g, '\n').trim();
    if (label.kind === 'node') onEdit({ type: 'nodeLabel', id: label.id, text });
    else onEdit({ type: 'edgeLabel', index: label.index, text });
    setLabel(null);
  };

  return (
    <Box pos="relative" ref={box}>
      {dragHint && !readOnly && (
        <Alert
          pos="absolute"
          top={8}
          left={8}
          right={8}
          style={{ zIndex: 3 }}
          color="blue"
          withCloseButton
          onClose={() => setDragHint(false)}
          title="Nodes are placed for you in this layout"
        >
          <Group gap="xs" justify="space-between">
            <Text size="sm">Switch to free layout to place nodes by hand.</Text>
            {'free' in LAYOUTS && (
              <Button
                size="compact-sm"
                variant="default"
                onClick={() => {
                  onEdit({ type: 'setting', key: 'layout', value: 'free' });
                  setDragHint(false);
                }}
              >
                Switch to free layout
              </Button>
            )}
          </Group>
        </Alert>
      )}
      <Box
        className={readOnly ? undefined : 'ink-linked'}
        onClick={(ev) => {
          if (readOnly) return;
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          const el = target(ev);
          window.clearTimeout(clickTimer.current);
          if (!el || ev.detail > 1) return;
          clickTimer.current = window.setTimeout(() => onSelect(Number(el.getAttribute('data-ink-from')), Number(el.getAttribute('data-ink-to'))), 250);
        }}
        onDoubleClick={(ev) => {
          window.clearTimeout(clickTimer.current);
          if (readOnly || !box.current) return;
          const el = target(ev, '[data-ink-kind="node"],[data-ink-kind="edge"]');
          if (!el) return;
          const kind = el.getAttribute('data-ink-kind') as 'node' | 'edge';
          const id = el.getAttribute('data-ink-id')!;
          const index = Number(el.getAttribute('data-ink-index') ?? -1);
          let value = '';
          if (kind === 'node') value = doc.nodes.find((n) => n.id === id)?.label ?? '';
          else {
            const e = doc.edges[index];
            const sameLine = doc.edges.filter((x) => x.line === e?.line);
            if (!e || sameLine[sameLine.length - 1] !== e) return;
            value = e.label ?? '';
          }
          const b = boundsIn(el, box.current);
          setMenu(null);
          setLabel({ kind, id, index, value: value.replace(/\n/g, '\\n'), x: b.x, y: b.y, w: Math.max(160, Math.min(320, b.w + 40)) });
        }}
        onContextMenu={(ev) => {
          if (readOnly || !box.current) return;
          const el = target(ev, '[data-ink-kind="node"]');
          if (!el) return;
          ev.preventDefault();
          const c = box.current.getBoundingClientRect();
          setLabel(null);
          setMenu({ id: el.getAttribute('data-ink-id')!, x: ev.clientX - c.left, y: ev.clientY - c.top });
        }}
        onPointerDown={(ev) => {
          if (readOnly || ev.button !== 0) return;
          const g = target(ev, '[data-ink-kind="node"]') as SVGGElement | null;
          const svg = g?.ownerSVGElement;
          if (!g || !svg) return;
          const ctm = svg.getScreenCTM();
          drag.current = { g, id: g.getAttribute('data-ink-id')!, x0: ev.clientX, y0: ev.clientY, transform: g.getAttribute('transform') ?? '', moved: false, scale: ctm?.a || 1 };
        }}
        onPointerMove={(ev) => {
          const d = drag.current;
          if (!d) return;
          const dx = ev.clientX - d.x0;
          const dy = ev.clientY - d.y0;
          if (!d.moved && Math.hypot(dx, dy) < 5) return;
          if (!d.moved) {
            d.moved = true;
            if (!free) {
              setDragHint(true);
              drag.current = null;
              return;
            }
            (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
          }
          d.g.setAttribute('transform', `translate(${(dx / d.scale).toFixed(1)} ${(dy / d.scale).toFixed(1)}) ${d.transform}`);
        }}
        onPointerUp={(ev) => {
          const d = drag.current;
          drag.current = null;
          if (!d?.moved || !free) return;
          suppressClick.current = true;
          const dx = (ev.clientX - d.x0) / d.scale;
          const dy = (ev.clientY - d.y0) / d.scale;
          // Move from where the source says the node is, if it says; else from where it was drawn.
          const line = source.split('\n')[(doc.nodes.find((n) => n.id === d.id)?.line ?? 1) - 1] ?? '';
          const at = line.match(/\bat\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
          const drawn = d.transform.match(/translate\((-?[\d.]+)[ ,]+(-?[\d.]+)\)/);
          const x = at ? Number(at[1]) : Number(drawn?.[1] ?? 0);
          const y = at ? Number(at[2]) : Number(drawn?.[2] ?? 0);
          onEdit({ type: 'position', id: d.id, x: x + dx, y: y + dy });
        }}
      >
        <Sketch
          key={playToken}
          source={source}
          controls
          autoplay={autoplay}
          speed={speed}
          onDiagram={(d, err) => {
            setDiagram(d);
            onDiagram(d, err);
          }}
        />
      </Box>

      {label && (
        <TextInput
          aria-label="Label"
          autoFocus
          size="sm"
          value={label.value}
          onChange={(e) => setLabel({ ...label, value: e.currentTarget.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitLabel();
            if (e.key === 'Escape') setLabel(null);
          }}
          onBlur={commitLabel}
          onFocus={(e) => e.currentTarget.select()}
          pos="absolute"
          w={label.w}
          style={{ left: label.x, top: label.y, transform: 'translate(-50%, -50%)', zIndex: 4 }}
          description={undefined}
        />
      )}

      <Menu opened={!!menu} onChange={(o) => !o && setMenu(null)} position="bottom-start" withinPortal shadow="md" width={200}>
        <Menu.Target>
          <Box pos="absolute" style={{ left: menu?.x ?? 0, top: menu?.y ?? 0, width: 1, height: 1, pointerEvents: 'none' }} />
        </Menu.Target>
        <Menu.Dropdown>
          {menu && (
            <>
              <Menu.Label>{doc.nodes.find((n) => n.id === menu.id)?.label.replace(/\n/g, ' ') ?? menu.id}</Menu.Label>
              {markItems.map((m) => {
                const on = hasMark(source, m.mark, menu.id);
                return (
                  <Menu.Item key={m.mark} leftSection={<m.icon size={16} />} onClick={() => onEdit({ type: 'toggleMark', mark: m.mark, id: menu.id })}>
                    {on ? m.off : m.on}
                  </Menu.Item>
                );
              })}
              <Menu.Item leftSection={<IconMessage2 size={16} />} onClick={() => onEdit({ type: 'addNote', id: menu.id, text: 'note' })}>
                Add a note
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => onEdit({ type: 'deleteNode', id: menu.id })}>
                Delete
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
