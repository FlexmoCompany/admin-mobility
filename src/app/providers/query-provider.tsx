import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Console d'exploitation: les compteurs d'incidents et de soldes
            // doivent refleter l'etat courant, pas un cache de dix minutes.
            staleTime: 1000 * 30,
            gcTime: 1000 * 60 * 5,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            // Une session expiree (401) ne doit pas etre reessayee.
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
