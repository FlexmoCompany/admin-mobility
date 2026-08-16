import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from './auth-store';

export function RequireSuperadmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const operator = useAuthStore((state) => state.operator);

  if (operator?.role !== 'superadmin') {
    return <Navigate to="/cockpit" replace state={{ from: location }} />;
  }

  return children;
}
