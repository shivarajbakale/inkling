import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Code,
  Grid,
  Group,
  Kbd,
  Menu,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconBrandReact,
  IconChevronDown,
  IconCode,
  IconCopy,
  IconDice5,
  IconDownload,
  IconFileText,
  IconLink,
  IconMarkdown,
  IconPhoto,
  IconPresentation,
  IconVectorBezier2,
  IconWand,
} from '@tabler/icons-react';
import { HANDS, PAPERS, PENS, parse, type Diagram } from '../core';
import { CodeEditor, type CodeEditorHandle } from './editor/CodeEditor';
import { LinkedSketch } from './editor/LinkedSketch';
import { applyEdit, currentPreset, PRESETS, type EditAction } from './edits';
import { copy, download, downloadsBlocked, embedCode, fileName, markdownFence, reactSnippet, selfContainedSVG, toPNG } from './exporting';
import type { AppSettings } from './settings';
import { shareUrl } from './share';
import type { Drawing } from './storage';

const opts = (rec: Record<string, { label: string }>) => Object.entries(rec).map(([value, v]) => ({ value, label: v.label }));

function summary(total: number, errors: number) {
  if (errors === 0) return `${total} warning${total > 1 ? 's' : ''}`;
  return `${errors} line${errors > 1 ? 's' : ''} skipped`;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

type Status = 'saved' | 'saving' | 'unsaved' | 'draft';

interface Props {
  drawing: Drawing;
  /** False for a drawing opened from an example that is not in the library yet. */
  stored: boolean;
  onSave: (d: Drawing) => Promise<void>;
  persistent: boolean;
  settings: AppSettings;
  onPresent: (source: string) => void;
}

export function Playground({ drawing, stored, onSave, persistent, settings, onPresent }: Props) {
  const [source, setSource] = useState(drawing.source);
  const [name, setName] = useState(drawing.name);
  const [debounced] = useDebouncedValue(source, 220);
  const doc = useMemo(() => parse(debounced), [debounced]);
  const live = useMemo(() => parse(source), [source]);
  const diagram = useRef<Diagram | null>(null);
  const [hasDiagram, setHasDiagram] = useState(false);
  const [crash, setCrash] = useState<string | undefined>();
  const [playToken, setPlayToken] = useState(0);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>(stored ? 'saved' : 'draft');
  const [tab, setTab] = useState<'source' | 'drawing'>('source');
  const [pngOpen, setPngOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const editor = useRef<CodeEditorHandle>(null);
  const saved = useRef({ source: drawing.source, name: drawing.name, stored });
  const phone = useMediaQuery('(max-width: 47.99em)');

  const save = async () => {
    const d: Drawing = { ...drawing, source, name: name.trim() || 'Untitled drawing', updatedAt: Date.now(), thumbnail: diagram.current?.toSVG() ?? drawing.thumbnail };
    setStatus('saving');
    await onSave(d);
    saved.current = { source, name, stored: true };
    setStatus('saved');
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  // Autosave one second after typing stops.
  useEffect(() => {
    const s = saved.current;
    if (s.source === source && s.name === name) return;
    setStatus('unsaved');
    const t = setTimeout(() => saveRef.current(), 1000);
    return () => clearTimeout(t);
  }, [source, name]);

  // Keep the thumbnail current once the drawing finishes redrawing after a save.
  useEffect(() => {
    if (!saved.current.stored || status !== 'saved' || debounced !== source) return;
    const t = setTimeout(() => {
      const svg = diagram.current?.toSVG();
      if (svg && svg !== drawing.thumbnail) onSave({ ...drawing, source, name: name.trim() || 'Untitled drawing', thumbnail: svg, updatedAt: Date.now() });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, status]);

  const edit = (action: EditAction) => {
    const next = applyEdit(source, action);
    if (next === source) {
      if (action.type === 'edgeLabel') notifications.show({ message: 'Only the last arrow in a chain can carry a label.' });
      return;
    }
    setSource(next);
    if (action.type === 'addNote') {
      // Select the placeholder text so typing replaces it.
      const at = next.lastIndexOf('"note"');
      setTimeout(() => editor.current?.select(at + 1, at + 5), 30);
      if (phone) setTab('source');
    }
  };

  const set = (key: string, value: string | number) => edit({ type: 'setting', key, value });

  const goToLine = (line: number) => {
    const lines = source.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    if (phone) setTab('source');
    setTimeout(() => editor.current?.select(start, start + (lines[line - 1]?.length ?? 0)), 0);
  };

  const exportSVG = async () => {
    if (!diagram.current) return;
    const { svg, embedded } = await selfContainedSVG(diagram.current.toSVG());
    if (!embedded) notifications.show({ color: 'yellow', message: 'The fonts could not be embedded (are you offline?). The file uses web fonts instead.' });
    if (downloadsBlocked() || !download(new Blob([svg], { type: 'image/svg+xml' }), fileName(name, 'svg'))) await copy(svg, 'SVG');
  };

  const exportSource = async () => {
    if (downloadsBlocked() || !download(new Blob([source], { type: 'text/plain' }), fileName(name, 'inkling'))) await copy(source, 'Source');
  };

  const diagnostics = live.diagnostics;
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const statusText: Record<Status, string> = {
    saved: persistent ? 'Saved' : 'Saved in this tab only',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    draft: 'Not in your library yet. Edit it to keep a copy.',
  };

  const editorCard = (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <Box style={{ height: phone ? '60dvh' : 'clamp(420px, calc(100dvh - 300px), 900px)' }}>
        <CodeEditor
          ref={editor}
          value={source}
          onChange={setSource}
          onRedraw={() => setPlayToken((n) => n + 1)}
          onSave={() => save()}
          onFormat={() => edit({ type: 'format' })}
          onHoverLine={setHoverLine}
          fontSize={settings.fontSize}
        />
      </Box>
      <Group gap="md" px="md" py={8} className="ink-bar" wrap="wrap" visibleFrom="sm">
        <Text size="xs" c="dimmed">
          <Kbd size="xs">{mod}</Kbd> <Kbd size="xs">Enter</Kbd> redraw
        </Text>
        <Text size="xs" c="dimmed">
          <Kbd size="xs">{mod}</Kbd> <Kbd size="xs">S</Kbd> save
        </Text>
        <Text size="xs" c="dimmed">
          <Kbd size="xs">{mod}</Kbd> <Kbd size="xs">/</Kbd> comment
        </Text>
        <Text size="xs" c="dimmed">
          <Kbd size="xs">Alt</Kbd> <Kbd size="xs">↑</Kbd> move line
        </Text>
      </Group>
    </Card>
  );

  const problems = (diagnostics.length > 0 || crash) && (
    <Alert color={errors || crash ? 'red' : 'yellow'} icon={<IconAlertTriangle size={16} />} title={summary(diagnostics.length, errors)}>
      <Stack gap={4}>
        {crash && <Text size="sm">{crash}</Text>}
        {diagnostics.slice(0, 6).map((e, i) => (
          <Text key={i} size="sm">
            <Text span ff="monospace" size="sm" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => goToLine(e.span.line)}>
              Line {e.span.line}
            </Text>
            {': '}
            {e.message}
            {e.hint ? ` ${e.hint}` : ''}
            {e.fix && (
              <Button size="compact-xs" variant="default" ml="xs" onClick={() => edit({ type: 'fix', fix: e.fix! })}>
                Change to “{e.fix.text}”
              </Button>
            )}
          </Text>
        ))}
      </Stack>
    </Alert>
  );

  const look = (
    <Card padding="md">
      <Grid gutter="sm" align="end">
        <Grid.Col span={6}>
          <Select
            id="preset"
            label="Look"
            placeholder="Custom"
            data={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            value={currentPreset(doc)}
            onChange={(v) => v && edit({ type: 'preset', preset: v })}
            allowDeselect={false}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select id="paper" label="Paper" data={opts(PAPERS)} value={doc.paper} onChange={(v) => v && set('paper', v)} allowDeselect={false} />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select id="pen" label="Pen" data={opts(PENS)} value={doc.pen} onChange={(v) => v && set('pen', v)} allowDeselect={false} />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select id="hand" label="Handwriting" data={opts(HANDS)} value={doc.hand} onChange={(v) => v && set('hand', v)} allowDeselect={false} />
        </Grid.Col>
        <Grid.Col span="auto" pr="lg">
          <Text size="sm" fw={500} mb={6}>
            Mess: {doc.mess.toFixed(2)}
          </Text>
          <Slider
            id="mess"
            min={0}
            max={1}
            step={0.05}
            value={doc.mess}
            onChange={(v) => set('mess', Number(v.toFixed(2)))}
            marks={[
              { value: 0, label: 'Tidy' },
              { value: 1, label: 'Chaotic' },
            ]}
            label={null}
            mb="md"
          />
        </Grid.Col>
        <Grid.Col span="content">
          <Tooltip label={`Seed ${doc.seed}: try another wobble`}>
            <ActionIcon size="xl" variant="default" onClick={() => set('seed', 1 + Math.floor(Math.random() * 999))} aria-label="Redraw with a new seed">
              <IconDice5 size={20} />
            </ActionIcon>
          </Tooltip>
        </Grid.Col>
      </Grid>
    </Card>
  );

  const drawingCard = (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <LinkedSketch
        source={debounced}
        doc={doc}
        hoverLine={hoverLine}
        playToken={playToken}
        autoplay={playToken > 0 || settings.autoplay}
        speed={settings.speed}
        onDiagram={(d, err) => {
          diagram.current = d;
          setHasDiagram(!!d);
          setCrash(err);
        }}
        onSelect={(from, to) => {
          if (phone) setTab('source');
          setTimeout(() => editor.current?.select(from, to), 0);
        }}
        onEdit={edit}
      />
    </Card>
  );

  const reference = (
    <Card padding="md">
      <Text fw={600} mb="xs">
        Quick reference
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing={6}>
        {[
          ['api: box "API"', 'a node'],
          ['a -> b : "label"', 'an arrow'],
          ['a --> b   a ~> b', 'dashed, squiggly'],
          ['circle api', 'loop around it'],
          ['note api "slow!"', 'margin note'],
          ['highlight api pink', 'highlighter'],
          ['step 2: api "caption"', 'reveal order'],
          ['circle api @3', 'mark during step 3'],
        ].map(([code, what]) => (
          <Group key={code} gap="xs" wrap="nowrap">
            <Code style={{ whiteSpace: 'nowrap' }}>{code}</Code>
            <Text size="sm" c="dimmed" truncate>
              {what}
            </Text>
          </Group>
        ))}
      </SimpleGrid>
      <Text size="xs" c="dimmed" mt="sm">
        Click part of the drawing to find its line. Double-click a label to change it. Right-click a node for marks.
      </Text>
    </Card>
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Box style={{ flex: '1 1 260px', minWidth: 0 }}>
          <TextInput
            aria-label="Drawing name"
            className="ink-name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <Text size="sm" c="dimmed" data-testid="save-status">
            {statusText[status]}
          </Text>
        </Box>
        <Group gap="xs" wrap="wrap">
          {[
            { label: 'Format', icon: IconWand, run: () => edit({ type: 'format' }) },
            { label: 'Present', icon: IconPresentation, run: () => onPresent(source) },
            { label: 'Share', icon: IconLink, run: () => setShareOpen(true) },
          ].map((a) =>
            phone ? (
              <Tooltip key={a.label} label={a.label}>
                <ActionIcon variant="default" size="lg" onClick={a.run} aria-label={a.label}>
                  <a.icon size={18} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Button key={a.label} variant="default" leftSection={<a.icon size={16} />} onClick={a.run}>
                {a.label}
              </Button>
            ),
          )}
          <Menu position="bottom-end" width={240} shadow="md">
            <Menu.Target>
              <Button rightSection={<IconChevronDown size={16} />} leftSection={<IconDownload size={16} />} disabled={!hasDiagram}>
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Download</Menu.Label>
              <Menu.Item leftSection={<IconVectorBezier2 size={16} />} onClick={exportSVG}>
                SVG file
              </Menu.Item>
              <Menu.Item leftSection={<IconPhoto size={16} />} onClick={() => setPngOpen(true)}>
                PNG image…
              </Menu.Item>
              <Menu.Item leftSection={<IconFileText size={16} />} onClick={exportSource}>
                Inkling file (.inkling)
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Copy as</Menu.Label>
              <Menu.Item leftSection={<IconCode size={16} />} onClick={() => copy(embedCode(source), 'Embed snippet')}>
                Embed snippet
              </Menu.Item>
              <Menu.Item leftSection={<IconMarkdown size={16} />} onClick={() => copy(markdownFence(source), 'Markdown')}>
                Markdown fence
              </Menu.Item>
              <Menu.Item leftSection={<IconBrandReact size={16} />} onClick={() => copy(reactSnippet(source), 'React snippet')}>
                React snippet
              </Menu.Item>
              <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => copy(source, 'Source')}>
                Source only
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {phone ? (
        <Stack gap="md">
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={(v) => setTab(v as 'source' | 'drawing')}
            data={[
              { value: 'source', label: errors ? `Source (${errors} to fix)` : 'Source' },
              { value: 'drawing', label: 'Drawing' },
            ]}
          />
          <Stack gap="md" style={{ display: tab === 'source' ? undefined : 'none' }}>
            {editorCard}
            {problems}
          </Stack>
          <Stack gap="md" style={{ display: tab === 'drawing' ? undefined : 'none' }}>
            {drawingCard}
            {look}
          </Stack>
        </Stack>
      ) : (
        <Grid gutter="md">
          <Grid.Col span={5}>
            <Stack gap="md">
              {editorCard}
              {problems}
            </Stack>
          </Grid.Col>
          <Grid.Col span={7} style={{ minWidth: 0 }}>
            <Stack gap="md">
              {look}
              {drawingCard}
              {reference}
            </Stack>
          </Grid.Col>
        </Grid>
      )}

      <PngModal opened={pngOpen} onClose={() => setPngOpen(false)} diagram={diagram.current} name={name} paper={doc.paper} />
      <ShareModal opened={shareOpen} onClose={() => setShareOpen(false)} source={source} />
    </Stack>
  );
}

function PngModal({ opened, onClose, diagram, name, paper }: { opened: boolean; onClose: () => void; diagram: Diagram | null; name: string; paper: string }) {
  const [scale, setScale] = useState('2');
  const [bg, setBg] = useState<'paper' | 'transparent'>('paper');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    if (!diagram) return;
    setBusy(true);
    setError(null);
    try {
      const { svg } = await selfContainedSVG(diagram.toSVG());
      const blob = await toPNG(svg, Number(scale), bg, paper);
      if (downloadsBlocked() || !download(blob, fileName(name, 'png'))) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          notifications.show({ message: 'PNG copied. Downloads are blocked here, so it went to the clipboard.' });
        } catch {
          throw new Error('Downloads and the clipboard are both blocked here. Open the playground in its own tab to save images.');
        }
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal opened={opened} onClose={onClose} title="Export PNG" centered>
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={6}>
            Size
          </Text>
          <SegmentedControl
            fullWidth
            value={scale}
            onChange={setScale}
            data={[
              { value: '1', label: '1×' },
              { value: '2', label: '2×' },
              { value: '3', label: '3×' },
            ]}
          />
        </div>
        <div>
          <Text size="sm" fw={500} mb={6}>
            Background
          </Text>
          <SegmentedControl
            fullWidth
            value={bg}
            onChange={(v) => setBg(v as 'paper' | 'transparent')}
            data={[
              { value: 'paper', label: 'Paper' },
              { value: 'transparent', label: 'Transparent' },
            ]}
          />
        </div>
        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {error}
          </Alert>
        )}
        <Group justify="end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={go} loading={busy} leftSection={<IconDownload size={16} />}>
            Download PNG
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ShareModal({ opened, onClose, source }: { opened: boolean; onClose: () => void; source: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (opened) shareUrl(source).then(setUrl);
  }, [opened, source]);
  return (
    <Modal opened={opened} onClose={onClose} title="Share a read-only copy" centered>
      <Stack gap="md">
        <Text size="sm">
          The drawing travels inside the link, so nothing is uploaded. Anyone who opens it sees the drawing and can make their own copy.
        </Text>
        <TextInput aria-label="Share link" value={url} readOnly onFocus={(e) => e.currentTarget.select()} data-testid="share-url" />
        {url.length > 8000 && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            This link is very long. Some chat apps cut long links short; if it fails, send the .inkling file instead.
          </Alert>
        )}
        <Group justify="end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
          <Button leftSection={<IconCopy size={16} />} onClick={() => copy(url, 'Link').then((ok) => ok && onClose())} disabled={!url}>
            Copy link
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
