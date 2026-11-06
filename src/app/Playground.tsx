import { useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Code,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCode, IconDice5, IconPhoto } from '@tabler/icons-react';
import { HANDS, PAPERS, PENS, parse, setDirective, type Diagram } from '../core';
import { EXAMPLES } from './examples';
import { Sketch } from './Sketch';

const opts = (rec: Record<string, { label: string }>) => Object.entries(rec).map(([value, v]) => ({ value, label: v.label }));

export async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    notifications.show({ message: `${what} copied` });
  } catch {
    notifications.show({ color: 'red', message: `Your browser blocked copying. Select the text and copy it by hand.` });
  }
}

function summary(total: number, errors: number) {
  if (errors === 0) return `${total} warning${total > 1 ? 's' : ''}`;
  return `${errors} line${errors > 1 ? 's' : ''} skipped`;
}

function applyFix(source: string, fix: { span: { from: number; to: number }; text: string }) {
  return source.slice(0, fix.span.from) + fix.text + source.slice(fix.span.to);
}

export function embedCode(source: string) {
  return `<script type="module" src="https://cdn.inkling.dev/embed@0.1.js"></script>\n<inkling-diagram autoplay>\n${source.trim()}\n</inkling-diagram>`;
}

export function Playground({ source, setSource }: { source: string; setSource: (s: string) => void }) {
  const [debounced] = useDebouncedValue(source, 220);
  const doc = useMemo(() => parse(debounced), [debounced]);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [crash, setCrash] = useState<string | undefined>();
  const editor = useRef<HTMLTextAreaElement>(null);
  const [playToken, setPlayToken] = useState(0);
  const exampleId = EXAMPLES.find((e) => e.source === source)?.id ?? null;

  const set = (key: string, value: string | number) => setSource(setDirective(source, key, value));

  const goToLine = (line: number) => {
    const ta = editor.current;
    if (!ta) return;
    const lines = source.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end" wrap="wrap">
        <div>
          <Title order={1}>Playground</Title>
          <Text c="dimmed" mt={4}>
            Write on the left. The drawing redraws as you type, and the controls rewrite the matching line.
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconPhoto size={16} />}
            onClick={() => diagram && copy(diagram.toSVG(), 'SVG')}
            disabled={!diagram}
          >
            Copy SVG
          </Button>
          <Button leftSection={<IconCode size={16} />} onClick={() => copy(embedCode(source), 'Embed code')}>
            Copy embed code
          </Button>
        </Group>
      </Group>

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 5 }} order={{ base: 2, md: 1 }}>
          <Card padding="md">
            <Stack gap="sm">
              <Select
                id="example"
                label="Start from an example"
                placeholder="Your own diagram"
                data={EXAMPLES.map((e) => ({ value: e.id, label: e.name }))}
                value={exampleId}
                onChange={(v) => {
                  const ex = EXAMPLES.find((e) => e.id === v);
                  if (ex) {
                    setSource(ex.source);
                    setPlayToken((n) => n + 1);
                  }
                }}
                allowDeselect={false}
              />
              <Textarea
                id="source"
                ref={editor}
                label="Source"
                value={source}
                onChange={(e) => setSource(e.currentTarget.value)}
                autosize
                minRows={18}
                maxRows={34}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13, lineHeight: 1.6 } }}
              />
              {(doc.diagnostics.length > 0 || crash) && (
                <Alert
                  color={doc.diagnostics.some((d) => d.severity === 'error') || crash ? 'red' : 'yellow'}
                  icon={<IconAlertTriangle size={16} />}
                  title={summary(doc.diagnostics.length, doc.diagnostics.filter((d) => d.severity === 'error').length)}
                >
                  <Stack gap={4}>
                    {crash && <Text size="sm">{crash}</Text>}
                    {doc.diagnostics.slice(0, 6).map((e, i) => (
                      <Text key={i} size="sm">
                        <Text span ff="monospace" size="sm" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => goToLine(e.span.line)}>
                          Line {e.span.line}
                        </Text>
                        {': '}
                        {e.message}
                        {e.hint ? ` ${e.hint}` : ''}
                        {e.fix && (
                          <Button size="compact-xs" variant="default" ml="xs" onClick={() => setSource(applyFix(source, e.fix!))}>
                            Fix
                          </Button>
                        )}
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }} order={{ base: 1, md: 2 }} style={{ minWidth: 0 }}>
          <Stack gap="md">
            <Card padding="md">
              <Grid gutter="sm" align="end">
                <Grid.Col span={{ base: 6, sm: 4 }}>
                  <Select id="paper" label="Paper" data={opts(PAPERS)} value={doc.paper} onChange={(v) => v && set('paper', v)} allowDeselect={false} />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 4 }}>
                  <Select id="pen" label="Pen" data={opts(PENS)} value={doc.pen} onChange={(v) => v && set('pen', v)} allowDeselect={false} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select id="hand" label="Handwriting" data={opts(HANDS)} value={doc.hand} onChange={(v) => v && set('hand', v)} allowDeselect={false} />
                </Grid.Col>
                <Grid.Col span={{ base: 9, sm: 10 }}>
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
                <Grid.Col span={{ base: 3, sm: 2 }}>
                  <Group justify="end">
                    <Tooltip label={`Seed ${doc.seed}: try another wobble`}>
                      <ActionIcon size="xl" variant="default" onClick={() => set('seed', 1 + Math.floor(Math.random() * 999))} aria-label="Redraw with a new seed">
                        <IconDice5 size={20} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Grid.Col>
              </Grid>
            </Card>
            <Card padding={0} style={{ overflow: 'hidden' }}>
              <Sketch
                key={playToken}
                source={debounced}
                controls
                autoplay
                onDiagram={(d, err) => {
                  setDiagram(d);
                  setCrash(err);
                }}
              />
            </Card>
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
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
