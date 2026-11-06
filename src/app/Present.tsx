import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Text, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import { mount, PAPERS, Player } from '../core';
import { useHandsReady } from './Sketch';

/**
 * Full screen, one step at a time. Right arrow or space plays the next step,
 * left arrow goes back, Esc leaves. Reuses the Player; no new drawing code.
 */
export function Present({ source, speed, onExit }: { source: string; speed: number; onExit: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const ready = useHandsReady();
  const [player, setPlayer] = useState<Player | null>(null);
  const [, setTick] = useState(0);
  const exit = useRef(onExit);
  exit.current = onExit;

  useEffect(() => {
    if (!ready || !stage.current) return;
    const d = mount(stage.current, source);
    d.svg.setAttribute('aria-label', d.doc.title ?? 'Hand-drawn diagram');
    d.svg.removeAttribute('width');
    d.svg.removeAttribute('height');
    const p = new Player(d, () => setTick((n) => n + 1));
    p.speed = speed;
    setPlayer(p);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) p.seek(d.steps[0]?.end ?? d.duration);
    else p.playStep(0);
    return () => p.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, source]);

  // Full screen where the browser allows it; leaving full screen leaves present mode.
  useEffect(() => {
    const el = root.current;
    el?.requestFullscreen?.().catch(() => {});
    const onChange = () => {
      if (!document.fullscreenElement) exit.current();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!player) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') player.next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') player.prev();
      else if (e.key === 'Escape') exit.current();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const d = player?.diagram;
  const steps = d?.steps ?? [];
  const i = player?.stepIndex ?? 0;
  const caption = steps[i]?.caption ?? d?.doc.title ?? '';
  const ground = d ? PAPERS[d.doc.paper]?.ground : undefined;
  const dark = d ? PAPERS[d.doc.paper]?.dark : false;
  const ink = dark ? '#f4f5f7' : '#1d1d1f';

  return (
    <Box
      ref={root}
      data-testid="present"
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: ground ?? 'var(--mantine-color-body)', display: 'flex', flexDirection: 'column', color: ink }}
    >
      <Box ref={stage} className="ink-present" style={{ flex: 1, minHeight: 0, padding: 'clamp(12px, 3vw, 40px)' }} onClick={() => player?.next()} />
      <Box px="md" pb="md" style={{ textAlign: 'center' }}>
        <Text data-testid="present-caption" style={{ fontSize: 'clamp(18px, 2.6vw, 32px)', lineHeight: 1.3, fontWeight: 500, minHeight: '1.3em', color: ink }}>
          {caption}
        </Text>
        <Group justify="center" gap="md" mt="sm" wrap="nowrap">
          <Tooltip label="Back (left arrow)">
            <ActionIcon variant="subtle" color={dark ? 'gray.0' : 'dark'} onClick={() => player?.prev()} aria-label="Previous step" disabled={i === 0 && (player?.t ?? 0) <= 0.01}>
              <IconChevronLeft size={20} />
            </ActionIcon>
          </Tooltip>
          <Group gap={8} wrap="nowrap" aria-label={`Step ${i + 1} of ${steps.length}`} data-testid="present-dots">
            {steps.map((s, k) => (
              <Box
                key={s.index}
                data-on={k <= i ? '' : undefined}
                style={{ width: 9, height: 9, borderRadius: 9, background: k === i ? 'var(--mantine-color-brand-5)' : k < i ? ink : 'transparent', border: `1.5px solid ${ink}`, opacity: k <= i ? 1 : 0.4 }}
              />
            ))}
          </Group>
          <Tooltip label="Next (right arrow or space)">
            <ActionIcon variant="subtle" color={dark ? 'gray.0' : 'dark'} onClick={() => player?.next()} aria-label="Next step">
              <IconChevronRight size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>
      <Tooltip label="Leave (Esc)">
        <ActionIcon variant="subtle" color={dark ? 'gray.0' : 'dark'} onClick={onExit} aria-label="Leave present mode" style={{ position: 'absolute', top: 12, right: 12 }}>
          <IconX size={20} />
        </ActionIcon>
      </Tooltip>
    </Box>
  );
}
