import { useEffect, useState } from 'react';
import { ActionIcon, AppShell, Badge, Box, Burger, Group, NavLink, Stack, Text, ThemeIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2, IconBrush, IconCode, IconLayoutGrid, IconMoon, IconSitemap, IconSun } from '@tabler/icons-react';
import { EXAMPLES } from './examples';
import { EmbedPage, ExamplesPage, HowPage, SyntaxPage } from './pages';
import { Playground } from './Playground';

type Page = 'playground' | 'examples' | 'embed' | 'syntax' | 'how';
const NAV: { id: Page; label: string; icon: typeof IconBrush }[] = [
  { id: 'playground', label: 'Playground', icon: IconBrush },
  { id: 'examples', label: 'Examples', icon: IconLayoutGrid },
  { id: 'embed', label: 'Embed', icon: IconCode },
  { id: 'syntax', label: 'Syntax', icon: IconBook2 },
  { id: 'how', label: 'How it works', icon: IconSitemap },
];

const fromHash = (): Page => {
  const h = window.location.hash.slice(1) as Page;
  return NAV.some((n) => n.id === h) ? h : 'playground';
};

export default function App() {
  const [page, setPage] = useState<Page>(fromHash);
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, toggleColorScheme, setColorScheme } = useMantineColorScheme();

  // Follow the host page's explicit theme choice when it makes one.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const t = root.getAttribute('data-theme');
      if (t === 'dark' || t === 'light') setColorScheme(t);
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, [setColorScheme]);

  useEffect(() => {
    const on = () => setPage(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (p: Page) => {
    setPage(p);
    close();
    try {
      history.replaceState(null, '', `#${p}`);
    } catch {
      /* some frames refuse history changes */
    }
    window.scrollTo({ top: 0 });
  };
  const open = (s: string) => {
    setSource(s);
    go('playground');
  };

  return (
    <AppShell header={{ height: 56, collapsed: false }} navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="lg">
      <AppShell.Header hiddenFrom="sm">
        <Group h="100%" px="md" gap="sm">
          <Burger opened={opened} onClick={toggle} size="sm" aria-label="Open menu" />
          <Text fw={600}>Inkling</Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        <Stack justify="space-between" h="100%">
          <Box>
            <Group gap="xs" px="xs" py="sm" mb="xs" visibleFrom="sm">
              <ThemeIcon size="md" radius="sm" variant="filled">
                <IconBrush size={16} />
              </ThemeIcon>
              <Text fw={600}>Inkling</Text>
              <Badge variant="light" color="gray">
                Prototype
              </Badge>
            </Group>
            {NAV.map((n) => (
              <NavLink key={n.id} label={n.label} leftSection={<n.icon size={18} />} active={page === n.id} onClick={() => go(n.id)} />
            ))}
          </Box>
          <Group justify="space-between" px="xs">
            <Text size="xs" c="dimmed">
              Diagrams that look hand-drawn
            </Text>
            <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <ActionIcon variant="default" onClick={toggleColorScheme} aria-label="Toggle colour scheme">
                {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Box maw={1400} mx="auto">
          {page === 'playground' && <Playground source={source} setSource={setSource} />}
          {page === 'examples' && <ExamplesPage open={open} />}
          {page === 'embed' && <EmbedPage />}
          {page === 'syntax' && <SyntaxPage />}
          {page === 'how' && <HowPage open={open} />}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
