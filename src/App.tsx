import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './router';
import { initializeStorage, seedDemoData, syncEssentialData, isApiMode } from './services';

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
  const [isLoading, setIsLoading] = useState(isApiMode());
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (isApiMode()) {
      // Sync only essential data (settings, slots, plans) on startup
      // Admin pages will fetch their own data fresh when accessed
      syncEssentialData()
        .then(() => {
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to sync essential data:', error);
          setSyncError(error.message || 'Failed to connect to server');
          setIsLoading(false);
        });
    }
  }, []);

  // Show loading state while syncing from API
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if sync failed
  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{syncError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
