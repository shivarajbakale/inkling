import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Slider, Text, Tooltip } from '@mantine/core';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconRotate,
} from '@tabler/icons-react';
import { PAPERS, type Diagram, type Settings } from '../core';
import { useInkling, type UseInklingOptions } from '../react';
import { loadHands } from '../embed/element';

let fontsDone = false;
export function useHandsReady(): boolean {
  const [ready, setReady] = useState(fontsDone);
  useEffect(() => {
    if (ready) return;
    loadHands().then(() => {
      fontsDone = true;
      setReady(true);
    });
  }, [ready]);
  return ready;
}

interface Props {
  source: string;
  overrides?: Partial<Settings>;
  /** Show the play bar under the drawing. */
  controls?: boolean;
  /** Start animating as soon as the drawing appears. */
  autoplay?: boolean;
  onDiagram?: (d: Diagram | null, error?: string) => void;
  maxHeight?: number | string;
  /** Fit the whole drawing inside a box this tall, on its own paper colour. */
  fit?: number;
  /** Animation speed multiplier. */
  speed?: number;
}

export function Sketch({ source, overrides, controls = false, autoplay = false, onDiagram, maxHeight, fit, speed = 1 }: Props) {
  const ready = useHandsReady();
  // Autoplay runs once per mount; later redraws (typing) show the finished drawing.
  const firstDraw = useRef(true);
  const onDiagramRef = useRef(onDiagram);
  onDiagramRef.current = onDiagram;
  // The playground draws through the same public React hook other products use.
  const { ref, player } = useInkling(source, {
    ...(overrides as UseInklingOptions),
    autoplay: autoplay && firstDraw.current,
    onReady: (d) => {
      firstDraw.current = false;
      d.svg.setAttribute('aria-label', d.doc.title ?? 'Hand-drawn diagram');
      onDiagramRef.current?.(d);
    },
  });
  // Re-render every frame while playing, so the scrubber follows the pen.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!player) return;
    player.speed = speed;
    let raf = 0;
    let lastT = -1;
    let lastPlaying = false;
    const loop = () => {
      // Only re-render when the pen has moved or play state changed.
      if (player.t !== lastT || player.playing !== lastPlaying) {
        lastT = player.t;
        lastPlaying = player.playing;
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [player, speed]);

  const d = player?.diagram;
  const step = player ? player.stepIndex : 0;
  const s = d?.steps[step];
  const done = !!player && player.t >= (d?.duration ?? 0) - 0.01;

  return (
    <Box
      tabIndex={controls ? 0 : undefined}
      aria-label={controls ? 'Diagram. Space plays, arrow keys step.' : undefined}
      onKeyDown={(ev) => {
        if (!controls || !player || ev.target !== ev.currentTarget) return;
        if (ev.key === ' ') player.playing ? player.pause() : player.play();
        else if (ev.key === 'ArrowRight') player.next();
        else if (ev.key === 'ArrowLeft') player.prev();
        else return;
        ev.preventDefault();
      }}
    >
      <Box
        ref={ref}
        className={fit ? 'ink-stage ink-fit' : 'ink-stage'}
        style={{
          maxHeight,
          height: fit,
          overflow: fit ? 'hidden' : 'auto',
          lineHeight: 0,
          minHeight: ready ? undefined : 200,
          background: d ? PAPERS[d.doc.paper]?.ground : undefined,
        }}
      />
      {controls && player && d && (
        <Group gap="sm" px="md" py="sm" wrap="nowrap" className="ink-bar">
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Previous step">
              <ActionIcon variant="subtle" color="gray" onClick={() => player.prev()} aria-label="Previous step" disabled={d.steps.length < 2}>
                <IconPlayerSkipBackFilled size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={player.playing ? 'Pause' : done ? 'Draw again' : 'Play'}>
              <ActionIcon
                variant="filled"
                size="lg"
                onClick={() => (player.playing ? player.pause() : player.play())}
                aria-label={player.playing ? 'Pause' : done ? 'Draw again' : 'Play'}
              >
                {player.playing ? <IconPlayerPauseFilled size={16} /> : done ? <IconRotate size={16} /> : <IconPlayerPlayFilled size={16} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Next step">
              <ActionIcon variant="subtle" color="gray" onClick={() => player.next()} aria-label="Next step" disabled={d.steps.length < 2}>
                <IconPlayerSkipForwardFilled size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" truncate="end" c={s?.caption ? undefined : 'dimmed'}>
              {d.steps.length > 1 ? `Step ${step + 1} of ${d.steps.length}` : 'One step'}
              {s?.caption ? ` · ${s.caption}` : ''}
            </Text>
            <Slider
              mt={6}
              size="xs"
              min={0}
              max={d.duration}
              step={0.01}
              value={player.t}
              label={null}
              onChange={(v) => {
                player.pause();
                player.seek(v);
              }}
              marks={d.steps.length > 1 ? d.steps.slice(1).map((st) => ({ value: st.start })) : []}
              aria-label="Scrub the drawing"
            />
          </Box>
        </Group>
      )}
    </Box>
  );
}
