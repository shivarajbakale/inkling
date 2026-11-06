import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Card,
  FileButton,
  Group,
  Menu,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCopy, IconDatabaseExport, IconDots, IconDownload, IconEdit, IconPencil, IconPlus, IconSearch, IconTrash, IconUpload } from '@tabler/icons-react';
import { PAPERS, parse } from '../core';
import { Sketch } from './Sketch';
import type { Drawing } from './storage';
import { TEMPLATES, layoutLabel, type Template } from './templates';

let thumbCount = 0;

/** The saved thumbnail, with its SVG ids made unique on this page. Falls back to a live drawing. */
export function Thumb({ source, thumbnail, height }: { source: string; thumbnail?: string; height: number }) {
  const ground = useMemo(() => PAPERS[parse(source).paper]?.ground, [source]);
  const html = useMemo(() => {
    if (!thumbnail) return '';
    const prefix = `th${++thumbCount}-`;
    return thumbnail.replace(/\bink\d+-/g, prefix);
  }, [thumbnail]);
  if (!html) return <Sketch source={source} fit={height} />;
  return <Box className="ink-thumb" h={height} style={{ background: ground }} dangerouslySetInnerHTML={{ __html: html }} aria-hidden />;
}

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(t).toLocaleDateString();
}

interface Props {
  drawings: Drawing[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onUseTemplate: (t: Template) => void;
  onTemplates: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (d: Drawing) => void;
  onImportFiles: (files: File[]) => void;
  onExportBackup: () => void;
}

export function LibraryPage(p: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [renaming, setRenaming] = useState<Drawing | null>(null);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<Drawing | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = p.drawings.filter((d) => !q || d.name.toLowerCase().includes(q) || d.source.toLowerCase().includes(q));
    return list.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt));
  }, [p.drawings, query, sort]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end" wrap="wrap" gap="sm">
        <div>
          <Title order={1}>Library</Title>
          <Text c="dimmed" mt={4}>
            Your drawings, saved in this browser.
          </Text>
        </div>
        <Group gap="xs" wrap="wrap">
          <FileButton onChange={(f) => f.length && p.onImportFiles(f)} accept=".inkling,.txt,.json,text/plain,application/json" multiple>
            {(props) => (
              <Button variant="default" leftSection={<IconUpload size={16} />} {...props}>
                Import
              </Button>
            )}
          </FileButton>
          <Button variant="default" leftSection={<IconDatabaseExport size={16} />} onClick={p.onExportBackup} disabled={!p.drawings.length}>
            Export backup
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={p.onNew}>
            New drawing
          </Button>
        </Group>
      </Group>

      {p.drawings.length > 0 && (
        <Group gap="sm" wrap="wrap">
          <TextInput
            aria-label="Search drawings"
            placeholder="Search by name or content"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ flex: '1 1 240px' }}
          />
          <SegmentedControl
            value={sort}
            onChange={(v) => setSort(v as 'recent' | 'name')}
            data={[
              { value: 'recent', label: 'Recent' },
              { value: 'name', label: 'Name' },
            ]}
            aria-label="Sort"
          />
        </Group>
      )}

      {p.drawings.length === 0 ? (
        <Card padding="xl">
          <Stack align="center" gap="xs" py="md">
            <Title order={3}>No drawings yet</Title>
            <Text c="dimmed" ta="center" maw={420}>
              Start from a template below, start blank, or drop .inkling files on this page to import them.
            </Text>
            <Button mt="sm" leftSection={<IconPlus size={16} />} onClick={p.onNew}>
              New drawing
            </Button>
          </Stack>
        </Card>
      ) : shown.length === 0 ? (
        <Card padding="lg">
          <Text c="dimmed">No drawings match “{query}”. Try another word, or clear the search.</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" data-testid="library-grid">
          {shown.map((d) => (
            <Card key={d.id} padding={0} style={{ overflow: 'hidden' }} data-testid="drawing-card">
              <Box style={{ cursor: 'pointer' }} onClick={() => p.onOpen(d.id)} aria-label={`Open ${d.name}`} role="button">
                <Thumb source={d.source} thumbnail={d.thumbnail} height={180} />
              </Box>
              <Group justify="space-between" p="md" wrap="nowrap" gap="xs">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={600} truncate>
                    {d.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Edited {ago(d.updatedAt)}
                  </Text>
                </Box>
                <Menu position="bottom-end" width={200} shadow="md">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" aria-label={`More for ${d.name}`}>
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => p.onOpen(d.id)}>
                      Open
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      onClick={() => {
                        setNewName(d.name);
                        setRenaming(d);
                      }}
                    >
                      Rename
                    </Menu.Item>
                    <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => p.onDuplicate(d.id)}>
                      Duplicate
                    </Menu.Item>
                    <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => p.onExport(d)}>
                      Download .inkling
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => setDeleting(d)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Stack gap="sm">
        <Group justify="space-between" align="baseline">
          <Title order={2}>Start from a template</Title>
          <Anchor component="button" onClick={p.onTemplates} size="sm">
            See all templates
          </Anchor>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
          {TEMPLATES.slice(0, 4).map((t) => (
            <TemplateCard key={t.id} t={t} onUse={() => p.onUseTemplate(t)} compact />
          ))}
        </SimpleGrid>
      </Stack>

      <Modal opened={!!renaming} onClose={() => setRenaming(null)} title="Rename drawing" centered>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (renaming) p.onRename(renaming.id, newName);
            setRenaming(null);
          }}
        >
          <Stack gap="md">
            <TextInput label="Name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} data-autofocus />
            <Group justify="end">
              <Button variant="default" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit">Rename</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={!!deleting} onClose={() => setDeleting(null)} title="Delete this drawing?" centered>
        <Stack gap="md">
          <Text size="sm">
            “{deleting?.name}” will be removed from this browser. This cannot be undone. Download it first if you might want it later.
          </Text>
          <Group justify="end">
            <Button variant="default" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deleting) p.onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export function TemplateCard({ t, onUse, compact }: { t: Template; onUse: () => void; compact?: boolean }) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }} data-testid="template-card">
      <Box style={{ cursor: 'pointer' }} onClick={onUse} aria-hidden>
        <Sketch source={t.source} fit={compact ? 140 : 220} />
      </Box>
      <Stack gap={4} p="md">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text fw={600} truncate>
            {t.name}
          </Text>
          {!compact && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {layoutLabel(t.layout)}
            </Text>
          )}
        </Group>
        {!compact && (
          <Text size="sm" c="dimmed">
            {t.description}
          </Text>
        )}
        <Button variant="default" size={compact ? 'xs' : 'sm'} mt={compact ? 4 : 'xs'} onClick={onUse} aria-label={`Use ${t.name}`}>
          Use this
        </Button>
      </Stack>
    </Card>
  );
}
