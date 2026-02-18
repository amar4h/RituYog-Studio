import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
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
  // Sync essential data in background — don't block rendering
  // Admin pages use useFreshData() to fetch their own data when accessed
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
