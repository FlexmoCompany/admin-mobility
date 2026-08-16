import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppShellLayout } from '@/app/layouts/app-shell-layout';
import { AdminsPage } from '@/features/admins/components/admins-page';
import { MyAccountPage } from '@/features/admins/components/my-account-page';
import { AuthPage } from '@/features/auth/auth-page';
import { RequireAuth } from '@/features/auth/require-auth';
import { RequireSuperadmin } from '@/features/auth/require-superadmin';
import { DriverDetailPage } from '@/features/drivers/components/driver-detail-page';
import { DriversPage } from '@/features/drivers/components/drivers-page';
import { FuelCardDetailPage } from '@/features/cards-balances/components/fuel-card-detail-page';
import { FuelCardsPage } from '@/features/cards-balances/components/fuel-cards-page';
import { FuelPurchaseDetailPage } from '@/features/fuel/components/fuel-purchase-detail-page';
import { FuelPurchasesPage } from '@/features/fuel/components/fuel-purchases-page';
import { CockpitPage } from '@/features/cockpit/components/cockpit-page';
import { FuelFinancePage } from '@/features/fuel-finance/components/fuel-finance-page';
import { IncidentsPage } from '@/features/incidents/components/incidents-page';
import { PartnerDetailPage } from '@/features/partners/components/partner-detail-page';
import { PartnersPage } from '@/features/partners/components/partners-page';
import { VehicleDetailPage } from '@/features/vehicles/components/vehicle-detail-page';
import { VehiclesPage } from '@/features/vehicles/components/vehicles-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';

export const appRouter = createBrowserRouter([
  {
    path: '/auth/login',
    element: <AuthPage />,
  },
  {
    path: '/verification/:token/forget-password',
    element: <ResetPasswordPage />,
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
        element: <CockpitPage />,
      },
      {
        path: '/partners',
        element: <PartnersPage />,
      },
      {
        path: '/partners/:partnerId',
        element: <PartnerDetailPage />,
      },
      {
        path: '/drivers',
        element: <DriversPage />,
      },
      {
        path: '/drivers/:driverId',
        element: <DriverDetailPage />,
      },
      {
        path: '/vehicles',
        element: <VehiclesPage />,
      },
      {
        path: '/vehicles/:vehicleId',
        element: <VehicleDetailPage />,
      },
      {
        path: '/fuel',
        element: <FuelPurchasesPage />,
      },
      {
        path: '/fuel/:purchaseId',
        element: <FuelPurchaseDetailPage />,
      },
      {
        path: '/cards-balances',
        element: <FuelCardsPage />,
      },
      {
        path: '/cards-balances/:accountId',
        element: <FuelCardDetailPage />,
      },
      {
        path: '/fuel-finance',
        element: <FuelFinancePage />,
      },
      {
        path: '/incidents',
        element: <IncidentsPage />,
      },
      {
        path: '/admins',
        element: (
          <RequireSuperadmin>
            <AdminsPage />
          </RequireSuperadmin>
        ),
      },
      {
        path: '/my-account',
        element: <MyAccountPage />,
      },
    ],
  },
]);
