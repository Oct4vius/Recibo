import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/tokens.css';
import './theme/base.css';
import { queryClient } from '@/lib/queryClient';
import { setupQueryClient } from './query-setup';
import { SessionProvider } from './session/SessionProvider';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Shell } from './shell/Shell';
import { UpdateBanner } from './updates/UpdateBanner';

setupQueryClient(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Fuera de ErrorBoundary y SessionProvider: una versión que rompe el inicio de sesión se repara desde aquí. */}
      <div className="app-frame">
        <UpdateBanner />
        <div className="app-body">
          <ErrorBoundary>
            <SessionProvider>
              <Shell />
            </SessionProvider>
          </ErrorBoundary>
        </div>
      </div>
    </QueryClientProvider>
  </StrictMode>,
);
