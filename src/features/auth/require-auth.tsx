import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from './auth-store';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return children;
}
