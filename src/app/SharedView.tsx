import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCopy } from '@tabler/icons-react';
import { parse } from '../core';
import { CodeEditor } from './editor/CodeEditor';
import { decodeShare } from './share';
import { Sketch } from './Sketch';

/** A drawing opened from a share link: read-only, with "Make a copy". */
export function SharedView({ data, onCopy, onLibrary, fontSize }: { data: string; onCopy: (source: string) => void; onLibrary: () => void; fontSize: number }) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setSource(null);
    setError(null);
    decodeShare(data).then(setSource, (e: Error) => setError(e.message));
  }, [data]);

  if (error)
    return (
      <Stack gap="lg">
        <Title order={1}>Shared drawing</Title>
        <Alert color="red" icon={<IconAlertTriangle size={16} />} title="This link could not be opened">
          <Stack gap="sm" align="start">
            <Text size="sm">{error}</Text>
            <Button variant="default" size="xs" onClick={onLibrary}>
              Go to your library
            </Button>
          </Stack>
        </Alert>
      </Stack>
    );
  if (source === null) return <Text c="dimmed">Opening the shared drawing…</Text>;

  const title = parse(source).title ?? 'Shared drawing';
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end" wrap="wrap" gap="sm">
        <div>
          <Title order={1}>{title}</Title>
          <Text c="dimmed" mt={4}>
            A read-only copy someone shared with you. Make a copy to change it.
          </Text>
        </div>
        <Button leftSection={<IconCopy size={16} />} onClick={() => onCopy(source)}>
          Make a copy
        </Button>
      </Group>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <Sketch source={source} controls autoplay />
      </Card>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <Text size="sm" fw={600} px="md" pt="sm">
          Source
        </Text>
        <Box style={{ maxHeight: 480, overflow: 'auto' }}>
          <CodeEditor value={source} readOnly fontSize={fontSize} label="Shared source (read-only)" />
        </Box>
      </Card>
    </Stack>
  );
}
