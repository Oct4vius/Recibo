import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from '@/lib/queryClient';
import { SessionProvider } from './session/SessionProvider';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Shell } from './shell/Shell';
import './theme/tokens.css';
import './theme/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <SessionProvider>
          <Shell />
        </SessionProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
