import { useState } from 'react';
import { Anchor, Box, Card, Chip, Group, Modal, SimpleGrid, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TemplateCard } from './LibraryPage';
import { Sketch } from './Sketch';
import { BLANK, layoutLabel, layoutsOf, TEMPLATES, type Template } from './templates';

export function TemplatesPage({ onUse }: { onUse: (t: Template) => void }) {
  const layouts = layoutsOf();
  const [filter, setFilter] = useState('all');
  const groups = layouts.filter((l) => filter === 'all' || l === filter);
  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Templates</Title>
        <Text c="dimmed" mt={4}>
          Starting points, grouped by layout. Using one puts a copy in your library.
        </Text>
      </div>
      {layouts.length > 1 && (
        <Chip.Group value={filter} onChange={(v) => setFilter(v as string)}>
          <Group gap="xs">
            <Chip value="all">All</Chip>
            {layouts.map((l) => (
              <Chip key={l} value={l}>
                {layoutLabel(l)}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      )}
      {groups.map((l) => (
        <Stack key={l} gap="sm">
          <Title order={2}>{layoutLabel(l)}</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {TEMPLATES.filter((t) => t.layout === l).map((t) => (
              <TemplateCard key={t.id} t={t} onUse={() => onUse(t)} />
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}

/** "New drawing": blank, or the first template of each layout. */
export function NewDrawingModal({ opened, onClose, onPick, onAll }: { opened: boolean; onClose: () => void; onPick: (source: string, name?: string) => void; onAll: () => void }) {
  const picks = layoutsOf().map((l) => TEMPLATES.find((t) => t.layout === l)!);
  const option = (key: string, title: string, sub: string, preview: React.ReactNode, go: () => void) => (
    <UnstyledButton key={key} onClick={go} aria-label={title} style={{ display: 'block' }}>
      <Card padding={0} withBorder style={{ overflow: 'hidden', height: '100%' }}>
        {preview}
        <Box p="sm">
          <Text fw={600} size="sm" truncate>
            {title}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {sub}
          </Text>
        </Box>
      </Card>
    </UnstyledButton>
  );
  return (
    <Modal opened={opened} onClose={onClose} title="New drawing" size="xl" centered>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
          {option(
            'blank',
            'Blank',
            'Start with two boxes and an arrow',
            <Box h={120} style={{ display: 'grid', placeItems: 'center', background: 'var(--app-wash)' }}>
              <IconPlus size={28} color="var(--mantine-color-dimmed)" />
            </Box>,
            () => onPick(BLANK, 'Untitled drawing'),
          )}
          {picks.map((t) =>
            option(t.id, t.name, `${layoutLabel(t.layout)} · ${t.description}`, <Sketch source={t.source} fit={120} />, () => onPick(t.source, t.name)),
          )}
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          More starting points are on the{' '}
          <Anchor component="button" size="sm" onClick={onAll}>
            Templates
          </Anchor>{' '}
          page.
        </Text>
      </Stack>
    </Modal>
  );
}
