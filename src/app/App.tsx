import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, AppShell, Badge, Box, Burger, Group, NavLink, Stack, Text, ThemeIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconBook2,
  IconBrush,
  IconCode,
  IconLayoutGrid,
  IconLibraryPhoto,
  IconMoon,
  IconSettings,
  IconSitemap,
  IconSun,
  IconTemplate,
} from '@tabler/icons-react';
import { copy, download, downloadsBlocked, fileName } from './exporting';
import { makeDrawing, useLibrary } from './library';
import { LibraryPage } from './LibraryPage';
import { EmbedPage, ExamplesPage, HowPage, SyntaxPage } from './pages';
import { Playground } from './Playground';
import { Present } from './Present';
import { local, useSettings } from './settings';
import { SettingsModal } from './SettingsModal';
import { shareData } from './share';
import { SharedView } from './SharedView';
import { makeBackup, readBackup, type Drawing } from './storage';
import { BLANK } from './templates';
import { NewDrawingModal, TemplatesPage } from './TemplatesPage';

type Page = 'library' | 'playground' | 'templates' | 'present' | 'examples' | 'embed' | 'syntax' | 'how' | 'shared';
const NAV: { id: Page; label: string; icon: typeof IconBrush }[] = [
  { id: 'library', label: 'Library', icon: IconLibraryPhoto },
  { id: 'playground', label: 'Editor', icon: IconBrush },
  { id: 'templates', label: 'Templates', icon: IconTemplate },
  { id: 'examples', label: 'Examples', icon: IconLayoutGrid },
  { id: 'embed', label: 'Embed', icon: IconCode },
  { id: 'syntax', label: 'Syntax', icon: IconBook2 },
  { id: 'how', label: 'How it works', icon: IconSitemap },
];
const PAGES: Page[] = [...NAV.map((n) => n.id), 'present'];

const fromHash = (): Page => {
  if (shareData(window.location.hash)) return 'shared';
  const h = window.location.hash.slice(1) as Page;
  return PAGES.includes(h) ? h : 'library';
};

interface Open {
  drawing: Drawing;
  stored: boolean;
}

export default function App() {
  const [page, setPage] = useState<Page>(fromHash);
  const [share, setShare] = useState(() => shareData(window.location.hash));
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, toggleColorScheme, setColorScheme } = useMantineColorScheme();
  const lib = useLibrary();
  const [settings, setSettings] = useSettings();
  const [open, setOpen] = useState<Open | null>(null);
  const [presentSource, setPresentSource] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const narrow = useMediaQuery('(max-width: 47.99em)', false, { getInitialValueInEffect: false });
  const libRef = useRef(lib);
  libRef.current = lib;

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
    const on = () => {
      setPage(fromHash());
      setShare(shareData(window.location.hash));
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback(
    (p: Page) => {
      setPage(p);
      close();
      try {
        history.replaceState(null, '', `#${p}`);
      } catch {
        /* some frames refuse history changes */
      }
      window.scrollTo({ top: 0 });
    },
    [close],
  );

  const openStored = (d: Drawing) => {
    setOpen({ drawing: d, stored: true });
    local.set('inkling.open', d.id);
    go('playground');
  };
  const openId = (id: string) => {
    const d = lib.drawings.find((x) => x.id === id);
    if (d) openStored(d);
  };
  /** Opens a source without adding it to the library until it is edited. */
  const openDraft = (source: string, name?: string) => {
    setOpen({ drawing: makeDrawing(source, name), stored: false });
    go('playground');
  };
  const createAndOpen = async (source: string, name?: string) => openStored(await lib.create(source, name));

  // The editor with nothing open picks up the last drawing, so a reload lands where you were.
  useEffect(() => {
    if ((page !== 'playground' && page !== 'present') || open || !lib.ready) return;
    const last = local.get('inkling.open');
    const d = lib.drawings.find((x) => x.id === last) ?? [...lib.drawings].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    setOpen(d ? { drawing: d, stored: true } : { drawing: makeDrawing(BLANK, 'Untitled drawing'), stored: false });
  }, [page, open, lib.ready, lib.drawings]);

  const save = async (d: Drawing) => {
    await lib.save(d);
    local.set('inkling.open', d.id);
    setOpen((o) => (o && o.drawing.id === d.id ? { drawing: d, stored: true } : o));
  };

  const importFiles = useCallback(
    async (files: File[]) => {
      const made: Drawing[] = [];
      for (const f of files) {
        try {
          const text = await f.text();
          if (/\.json$/i.test(f.name) || f.type === 'application/json') {
            const list = readBackup(text);
            await libRef.current.addAll(list);
            notifications.show({ message: `Imported ${list.length} drawing${list.length === 1 ? '' : 's'} from ${f.name}.` });
          } else {
            made.push(await libRef.current.create(text, f.name.replace(/\.(inkling|txt)$/i, '')));
          }
        } catch (e) {
          notifications.show({ color: 'red', title: `Could not import ${f.name}`, message: (e as Error).message });
        }
      }
      if (made.length === 1) openStored(made[0]);
      else if (made.length > 1) notifications.show({ message: `Imported ${made.length} drawings.` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Drop .inkling files or a backup anywhere on the page.
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      e.preventDefault();
      importFiles(files);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [importFiles]);

  const exportBackup = async () => {
    const text = makeBackup(lib.drawings);
    const name = `inkling-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (downloadsBlocked() || !download(new Blob([text], { type: 'application/json' }), name)) await copy(text, 'Backup');
  };
  const exportOne = async (d: Drawing) => {
    if (downloadsBlocked() || !download(new Blob([d.source], { type: 'text/plain' }), fileName(d.name, 'inkling'))) await copy(d.source, 'Source');
  };

  if (page === 'present') {
    const src = presentSource ?? open?.drawing.source;
    if (src)
      return (
        <Present
          source={src}
          speed={settings.speed}
          onExit={() => {
            setPresentSource(null);
            go('playground');
          }}
        />
      );
  }

  const navPage = page === 'shared' || page === 'present' ? null : page;

  return (
    <AppShell header={{ height: 56, collapsed: !narrow }} navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="lg">
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
                v0.6
              </Badge>
            </Group>
            {NAV.map((n) => (
              <NavLink key={n.id} label={n.label} leftSection={<n.icon size={18} />} active={navPage === n.id} onClick={() => go(n.id)} />
            ))}
          </Box>
          <Group justify="space-between" px="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Diagrams that look hand-drawn
            </Text>
            <Group gap={6} wrap="nowrap">
              <Tooltip label="Settings">
                <ActionIcon variant="default" onClick={() => setSettingsOpen(true)} aria-label="Settings">
                  <IconSettings size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
                <ActionIcon variant="default" onClick={toggleColorScheme} aria-label="Toggle colour scheme">
                  {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Box maw={1400} mx="auto">
          {lib.ready && !lib.persistent && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Drawings will not be kept" mb="lg" data-testid="storage-banner">
              This browser is blocking storage for this site (a private window does this). Everything works, but drawings are lost when you close the
              tab. Use Export backup in the library to keep them.
            </Alert>
          )}
          {page === 'library' && (
            <LibraryPage
              drawings={lib.drawings}
              onOpen={openId}
              onNew={() => setNewOpen(true)}
              onUseTemplate={(t) => createAndOpen(t.source, t.name)}
              onTemplates={() => go('templates')}
              onRename={lib.rename}
              onDuplicate={lib.duplicate}
              onDelete={lib.remove}
              onExport={exportOne}
              onImportFiles={importFiles}
              onExportBackup={exportBackup}
            />
          )}
          {page === 'playground' && open && (
            <Playground
              key={open.drawing.id}
              drawing={open.drawing}
              stored={open.stored}
              onSave={save}
              persistent={lib.persistent}
              settings={settings}
              onPresent={(s) => {
                setPresentSource(s);
                go('present');
              }}
            />
          )}
          {page === 'templates' && <TemplatesPage onUse={(t) => createAndOpen(t.source, t.name)} />}
          {page === 'shared' && share && (
            <SharedView data={share} fontSize={settings.fontSize} onCopy={(s) => createAndOpen(s)} onLibrary={() => go('library')} />
          )}
          {page === 'examples' && <ExamplesPage open={openDraft} />}
          {page === 'embed' && <EmbedPage />}
          {page === 'syntax' && <SyntaxPage />}
          {page === 'how' && <HowPage open={openDraft} />}
        </Box>
      </AppShell.Main>
      <NewDrawingModal
        opened={newOpen}
        onClose={() => setNewOpen(false)}
        onPick={(s, n) => {
          setNewOpen(false);
          createAndOpen(s, n);
        }}
        onAll={() => {
          setNewOpen(false);
          go('templates');
        }}
      />
      <SettingsModal opened={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={setSettings} />
    </AppShell>
  );
}
