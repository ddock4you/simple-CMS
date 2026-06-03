import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  // In demo mode the admin app is served through the public web origin
  // (`/_cms/admin/*`). Server Component prefetches would call admin API routes
  // without the browser's session cookie, which breaks RSC navigation. Let the
  // client QueryProvider fetch with the real browser cookie instead.
  if (process.env.DEMO_MODE === 'true') {
    queryClient.prefetchQuery = (() => Promise.resolve()) as typeof queryClient.prefetchQuery;
  }

  return queryClient;
};

export const getQueryClient = cache(createQueryClient);
