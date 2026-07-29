import { AppQueryProvider } from '@/app/providers/query-provider';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { appRouter } from '@/app/router/routes';
import { useAuthStore } from '@/features/auth/auth-store';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, Segoe UI, Roboto, Helvetica Neue, Arial, system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, Segoe UI, Roboto, Helvetica Neue, Arial, system-ui, sans-serif',
    fontWeight: '720',
  },
  radius: {
    md: '8px',
    lg: '8px',
    xl: '10px',
  },
  colors: {
    fuel: [
      '#fff8e1',
      '#ffefb4',
      '#ffe181',
      '#ffd24e',
      '#ffc529',
      '#f4b400',
      '#d99f00',
      '#ad7f00',
      '#806000',
      '#584100',
    ],
  },
});

export function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppQueryProvider>
        <RouterProvider router={appRouter} />
      </AppQueryProvider>
    </MantineProvider>
  );
}
