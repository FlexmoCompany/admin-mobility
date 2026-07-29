import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppShellLayout } from '@/app/layouts/app-shell-layout';
import { AuthPage } from '@/features/auth/auth-page';
import { RequireAuth } from '@/features/auth/require-auth';
import { SectionPage } from '@/features/sections/section-page';

export const appRouter = createBrowserRouter([
  {
    path: '/auth/login',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShellLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/cockpit" replace />,
      },
      {
        path: '/cockpit',
        element: <SectionPage />,
      },
      {
        path: '/partners',
        element: <SectionPage />,
      },
      {
        path: '/drivers',
        element: <SectionPage />,
      },
      {
        path: '/vehicles',
        element: <SectionPage />,
      },
      {
        path: '/fuel',
        element: <SectionPage />,
      },
      {
        path: '/cards-balances',
        element: <SectionPage />,
      },
      {
        path: '/fuel-finance',
        element: <SectionPage />,
      },
      {
        path: '/incidents',
        element: <SectionPage />,
      },
    ],
  },
]);
