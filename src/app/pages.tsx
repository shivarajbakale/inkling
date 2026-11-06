import { useEffect, useState } from 'react';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  List,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Timeline,
  Title,
  useComputedColorScheme,
} from '@mantine/core';
import { IconArrowRight, IconCheck, IconCopy } from '@tabler/icons-react';
import { ARCHITECTURE, EMBED_SAMPLE, EXAMPLES } from './examples';
import { embedCode } from './Playground';
import { Sketch } from './Sketch';

/* ── Examples ─────────────────────────────────────────────────────────────── */

export function ExamplesPage({ open }: { open: (source: string) => void }) {
  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Examples</Title>
        <Text c="dimmed" mt={4}>
          The same renderer, six subjects. Each one is a few lines of text.
        </Text>
      </div>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {EXAMPLES.map((ex) => (
          <Card key={ex.id} padding={0} style={{ overflow: 'hidden' }}>
            <Box style={{ cursor: 'pointer' }} onClick={() => open(ex.source)}>
              <Sketch source={ex.source} fit={320} />
            </Box>
            <Group justify="space-between" p="md" wrap="nowrap" gap="sm">
              <Box style={{ minWidth: 0 }}>
                <Text fw={600}>{ex.name}</Text>
                <Text size="sm" c="dimmed">
                  {ex.blurb} {ex.source.split('\n').filter((l) => l.trim()).length} lines.
                </Text>
              </Box>
              <Button variant="default" rightSection={<IconArrowRight size={16} />} onClick={() => open(ex.source)} style={{ flexShrink: 0 }}>
                Edit
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/* ── Embed ────────────────────────────────────────────────────────────────── */

async function compress(text: string): Promise<string> {
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = '';
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return btoa(unescape(encodeURIComponent(text))).replace(/=+$/, '');
  }
}

function Snippet({ code }: { code: string }) {
  return (
    <Box pos="relative">
      <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12.5, paddingRight: 96 }}>
        {code}
      </Code>
      <CopyButton value={code}>
        {({ copied, copy }) => (
          <Button
            size="xs"
            variant="default"
            pos="absolute"
            top={8}
            right={8}
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </CopyButton>
    </Box>
  );
}

export function EmbedPage() {
  const scheme = useComputedColorScheme('dark');
  const [encoded, setEncoded] = useState('');
  useEffect(() => {
    compress(EMBED_SAMPLE).then(setEncoded);
  }, []);
  const short = EMBED_SAMPLE.trim();

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Embed</Title>
        <Text c="dimmed" mt={4}>
          One renderer, four ways in. Below is the web component running inside a sample blog post.
        </Text>
      </div>

      <Card padding="xl">
        <Box maw={680} mx="auto" w="100%">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.08em' }}>
            Sample post · Backend basics
          </Text>
          <Title order={2} mt={6}>
            Why your app checks the cache first
          </Title>
          <Text mt="sm" style={{ lineHeight: 1.65 }}>
            Reading from a database is slow next to reading from memory. The cache-aside pattern keeps a small, fast copy
            of the answers you ask for most. Press play to watch it happen.
          </Text>
          <Box my="lg">
            <inkling-diagram autoplay="" theme={scheme}>
              {EMBED_SAMPLE}
            </inkling-diagram>
          </Box>
          <Text style={{ lineHeight: 1.65 }}>
            On a miss, the app reads the database and saves the result, so the next request is fast. The diagram above is
            twelve lines of text in the page source.
          </Text>
        </Box>
      </Card>

      <Card padding="lg">
        <Group gap="xs" mb="sm">
          <Title order={3}>Put it on your page</Title>
          <Badge color="yellow">Planned URLs</Badge>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          These snippets show the intended API. The host <Code>inkling.dev</Code> does not exist yet.
        </Text>
        <Tabs defaultValue="script">
          <Tabs.List>
            <Tabs.Tab value="script">Web component</Tabs.Tab>
            <Tabs.Tab value="markdown">Markdown</Tabs.Tab>
            <Tabs.Tab value="image">Image URL</Tabs.Tab>
            <Tabs.Tab value="iframe">iframe</Tabs.Tab>
            <Tabs.Tab value="react">React</Tabs.Tab>
          </Tabs.List>
          <Box pt="md">
            <Tabs.Panel value="script">
              <Stack gap="xs">
                <Text size="sm">Works in any HTML page. Draws itself when it scrolls into view.</Text>
                <Snippet code={embedCode(short)} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="markdown">
              <Stack gap="xs">
                <Text size="sm">A remark/rehype plugin turns fenced blocks into drawings for docs sites, Obsidian and blogs.</Text>
                <Snippet code={'```inkling\n' + short + '\n```'} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="image">
              <Stack gap="xs">
                <Text size="sm">
                  For GitHub READMEs, email and anywhere scripts are blocked. The source is compressed into the URL, so
                  there is nothing to host. Swap <Code>/svg/</Code> for <Code>/png/</Code> for a raster.
                </Text>
                <Snippet code={`![Cache-aside](https://inkling.dev/svg/${encoded})`} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="iframe">
              <Stack gap="xs">
                <Text size="sm">For Notion, Medium and tools that only take a link. oEmbed lets them unfurl it.</Text>
                <Snippet code={`<iframe src="https://inkling.dev/e/${encoded.slice(0, 18)}" width="100%" height="420" style="border:0"></iframe>`} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="react">
              <Stack gap="xs">
                <Text size="sm">A thin wrapper around the same core, for apps.</Text>
                <Snippet
                  code={`import { Inkling } from '@inkling/react';\n\n<Inkling\n  source={source}\n  paper="notebook"\n  autoplay\n  onStep={(i) => console.log(i)}\n/>`}
                />
              </Stack>
            </Tabs.Panel>
          </Box>
        </Tabs>
      </Card>
    </Stack>
  );
}

/* ── Syntax ───────────────────────────────────────────────────────────────── */

const SYNTAX: { group: string; rows: [string, string][] }[] = [
  {
    group: 'Things',
    rows: [
      ['api: box "API"', 'A node. Shapes: box, round, circle, diamond, cloud, db, sticky, person, text. Also rect, square, ellipse, database.'],
      ['"Load balancer" -> api', 'Put a name in quotes to use spaces.'],
      ['api: box "API" yellow', 'Add a colour to fill it with pencil hatching.'],
      ['api: icon server "API"', 'An icon instead of a shape: person, server, database, cloud, phone, laptop, lock, key, mail, file, folder, gear, chart, globe, clock, bell, cart, card, chat, search, star, heart, bolt, bug, rocket, book, camera, code, link, check.'],
      ['api: box "API" color=red pen=marker size=large', 'Options: ink color (red, blue, green, orange, purple, pink, gray, black), pen, size (small, normal, large), fill, icon.'],
      ['db: db "Orders\\nDB"', '\\n breaks a label onto two lines.'],
    ],
  },
  {
    group: 'Arrows',
    rows: [
      ['a -> b', 'A plain arrow. Names you have not defined become boxes.'],
      ['a --> b', 'Dashed, for replies and optional paths.'],
      ['a ~> b', 'Squiggly, for "asks around" or "eventually".'],
      ['a <-> b', 'Both ways. <~> is both ways and squiggly.'],
      ['a -> b -> c : "label"', 'Chain arrows. The label goes on the last one.'],
      ['a -> b : "label" color=red', 'Arrows take color and pen options too.'],
    ],
  },
  {
    group: 'Marks a teacher would make',
    rows: [
      ['circle api', 'Loops around a node. The pen overshoots where it starts.'],
      ['underline api', 'Two quick strokes under the label.'],
      ['strike api', 'Crosses the label out.'],
      ['highlight api pink', 'A highlighter swipe. Yellow unless you name a colour.'],
      ['note api "slow!"', 'A margin note with an arrow. It finds free space.'],
      ['check api / cross api', 'A tick or a cross on the corner.'],
      ['circle api @3', 'Draws the mark during step 3 instead of with the node.'],
      ['circle api -> db', 'Marks work on arrows too: circle, note, highlight, check, cross, and underline or strike for labelled arrows.'],
      ['circle backend', 'And on groups.'],
    ],
  },
  {
    group: 'Grouping',
    rows: [
      ['group backend "Backend" {', 'Start a group. Nodes defined inside, and new names used in arrows inside, belong to it. End with a } line.'],
      ['group edge "Edge" { cdn, lb }', 'Or list members on one line.'],
      ['group inner { … } inside a group', 'Groups can sit inside one other group.'],
    ],
  },
  {
    group: 'Telling it as a story',
    rows: [
      ['steps auto', 'Every node becomes its own step, in the order you wrote them.'],
      ['step 2: backend', 'A step can name a group: all of its members appear then.'],
      ['step 1: a, b "caption"', 'Reveal order. Arrows appear once both ends exist.'],
      ['title "How X works"', 'A handwritten heading with an underline.'],
    ],
  },
  {
    group: 'The look',
    rows: [
      ['paper notebook', 'notebook, graph, whiteboard, napkin, blank, chalkboard, blueprint.'],
      ['pen ballpoint', 'ballpoint, marker, pencil, felt, chalk.'],
      ['hand caveat', 'caveat, kalam, patrick, gochi, architect.'],
      ['mess 0.4', '0 is tidy, 1 is chaotic. Moves nodes, tilts them, wobbles letters.'],
      ['seed 7', 'The same seed always draws the same wobble.'],
      ['layout down', 'right (default) or down.'],
    ],
  },
];

export function SyntaxPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Syntax</Title>
        <Text c="dimmed" mt={4}>
          One statement per line. A # starts a comment.
        </Text>
      </div>
      {SYNTAX.map((g) => (
        <Card key={g.group} padding="lg">
          <Title order={3} mb="sm">
            {g.group}
          </Title>
          <Table.ScrollContainer minWidth={520}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w="38%">Write</Table.Th>
                  <Table.Th>What it does</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {g.rows.map(([code, what]) => (
                  <Table.Tr key={code}>
                    <Table.Td>
                      <Code>{code}</Code>
                    </Table.Td>
                    <Table.Td>{what}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      ))}
    </Stack>
  );
}

/* ── How it works ─────────────────────────────────────────────────────────── */

export function HowPage({ open }: { open: (source: string) => void }) {
  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>How it works</Title>
        <Text c="dimmed" mt={4}>
          This diagram is drawn by Inkling from its own source.{' '}
          <Anchor component="button" onClick={() => open(ARCHITECTURE)}>
            Open it in the playground
          </Anchor>
          .
        </Text>
      </div>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <Sketch source={ARCHITECTURE} controls autoplay />
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card padding="lg">
          <Title order={3} mb="sm">
            Why it looks drawn, not generated
          </Title>
          <List spacing="xs" size="sm">
            <List.Item>Every letter gets its own tilt and baseline nudge, so two "e"s never match.</List.Item>
            <List.Item>Lines of text slope slightly, as a hand moving across a page does.</List.Item>
            <List.Item>Strokes are doubled and bowed. Circles overshoot where they started.</List.Item>
            <List.Item>Boxes sit a little off the grid and a little rotated, scaled by the mess setting.</List.Item>
            <List.Item>Fills are pencil hatching. Highlights are a translucent swipe that multiplies with the ink.</List.Item>
            <List.Item>It draws stroke by stroke, in reading order, at a speed tied to each stroke's length.</List.Item>
          </List>
        </Card>
        <Card padding="lg">
          <Title order={3} mb="sm">
            In this prototype vs. later
          </Title>
          <Table verticalSpacing={6}>
            <Table.Tbody>
              {[
                ['Parser with "did you mean" fixes', 'Working'],
                ['Flow layout, sketch pen, draw-on player', 'Working'],
                ['Web component, script tag, React-free library', 'Working'],
                ['Renders in Node (for build-time Markdown)', 'Working'],
                ['Groups, icons, options, marks on arrows', 'Working'],
                ['Labels and notes placed so nothing overlaps', 'Working'],
                ['Free, stack and cycle layouts', 'v0.4'],
                ['Timeline, compare, mind map, sequence', 'v0.5'],
                ['Code editor, library, templates, sharing', 'v0.6'],
                ['React wrapper, Markdown plugins, CLI', 'v0.7'],
              ].map(([what, state]) => (
                <Table.Tr key={what}>
                  <Table.Td>{what}</Table.Td>
                  <Table.Td ta="right">
                    <Badge color={state === 'Working' ? 'green' : 'gray'}>{state === 'Working' ? state : `Planned · ${state}`}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      <Card padding="lg">
        <Title order={3} mb="md">
          Build plan
        </Title>
        <Timeline active={1} bulletSize={22} lineWidth={2}>
          <Timeline.Item title="v0.2 · Foundations (done)">
            <Text size="sm" c="dimmed">
              Font metrics, a scene model shared by all layouts, a new parser with source positions and fixes, and tests:
              reference drawings, overlap checks, fuzzing, Node rendering.
            </Text>
          </Timeline.Item>
          <Timeline.Item title="v0.3 · Language and quality (done)">
            <Text size="sm" c="dimmed">
              Groups, icons, options like <Code>color=red</Code>, marks on arrows, automatic steps, and one label placement
              pass so nothing overlaps.
            </Text>
          </Timeline.Item>
          <Timeline.Item title="v0.4–v0.5 · Seven new layouts">
            <Text size="sm" c="dimmed">Free placement, stack, cycle, then timeline, compare, mind map and sequence.</Text>
          </Timeline.Item>
          <Timeline.Item title="v0.6 · Playground as a product">
            <Text size="sm" c="dimmed">
              A real code editor, click-to-edit, a saved library, templates, SVG and PNG export, share links, present mode.
            </Text>
          </Timeline.Item>
          <Timeline.Item title="v0.7 · React and Markdown">
            <Text size="sm" c="dimmed">An Inkling React component, remark and markdown-it plugins, and a command-line renderer.</Text>
          </Timeline.Item>
        </Timeline>
      </Card>
    </Stack>
  );
}
