import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { MemberAuthProvider } from './contexts/MemberAuthContext';
import { AppRouter } from './router';
import { initializeStorage, seedDemoData, syncEssentialData, isApiMode, settingsService } from './services';

// Initialize storage for localStorage mode
// In API mode, syncFromApi will populate localStorage from the server
if (!isApiMode()) {
  initializeStorage();
  seedDemoData();
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // In API mode, wait for essential + common data before rendering routes.
  // This pre-fetches members, subscriptions, leads, invoices, payments in one batch,
  // so the dashboard (and most admin pages) render instantly from cache.
  const [ready, setReady] = useState(!isApiMode());

  useEffect(() => {
    if (isApiMode()) {
      syncEssentialData()
        .then(() => {
          // Update favicon after settings are loaded
          const settings = settingsService.getOrDefault();
          if (settings.logoData) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) {
              link.href = settings.logoData;
            } else {
              const newLink = document.createElement('link');
              newLink.rel = 'icon';
              newLink.href = settings.logoData;
              document.head.appendChild(newLink);
            }
          }
        })
        .catch((error) => {
          console.error('Failed to sync essential data:', error);
        })
        .finally(() => {
          setReady(true);
        });
    } else {
      // Set favicon for localStorage mode
      const settings = settingsService.getOrDefault();
      if (settings.logoData) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = settings.logoData;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = settings.logoData;
          document.head.appendChild(newLink);
        }
      }
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemberAuthProvider>
          <AppRouter />
        </MemberAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
