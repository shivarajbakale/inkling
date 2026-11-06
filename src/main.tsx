import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './app/global.css';

import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './app/App';
import { cssVariablesResolver, theme } from './app/theme';
import { defineInkling } from './embed/element';

defineInkling();

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
    <Notifications position="bottom-right" />
    <App />
  </MantineProvider>,
);
