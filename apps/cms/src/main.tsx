/**
 * Nexo CMS UI — entry point. Consumidora pura do Control Plane HTTP
 * (M3-CONTRACTS §2): react-query guarda TODO server state; zustand só UI.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Falhas estruturadas do Control Plane são exibidas via ErrorState —
      // retry conservador (não martelar o runtime em erro não-retryable).
      retry: (failureCount, error) =>
        failureCount < 2 && (error as { retryable?: boolean }).retryable === true,
    },
  },
});

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
