import { Modal, SegmentedControl, Stack, Switch, Text } from '@mantine/core';
import type { AppSettings } from './settings';

export function SettingsModal({ opened, onClose, settings, onChange }: { opened: boolean; onClose: () => void; settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Settings" centered>
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={500} mb={6}>
            Animation speed
          </Text>
          <SegmentedControl
            fullWidth
            value={String(settings.speed)}
            onChange={(v) => onChange({ speed: Number(v) })}
            data={[
              { value: '0.5', label: 'Slow' },
              { value: '1', label: 'Normal' },
              { value: '1.5', label: 'Fast' },
              { value: '2', label: 'Faster' },
            ]}
          />
        </div>
        <Switch
          label="Play the drawing when it opens"
          description="Off shows the finished drawing straight away."
          checked={settings.autoplay}
          onChange={(e) => onChange({ autoplay: e.currentTarget.checked })}
        />
        <div>
          <Text size="sm" fw={500} mb={6}>
            Editor text size
          </Text>
          <SegmentedControl
            fullWidth
            value={String(settings.fontSize)}
            onChange={(v) => onChange({ fontSize: Number(v) })}
            data={['12', '13', '14', '16', '18'].map((v) => ({ value: v, label: `${v} px` }))}
          />
        </div>
        <Text size="xs" c="dimmed">
          Settings are kept in this browser.
        </Text>
      </Stack>
    </Modal>
  );
}
