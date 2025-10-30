'use client';

/**
 * Providers Component
 * Enterprise-grade provider setup with error boundaries and monitoring
 */

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
// import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
// import { persistor } from '@/store';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function Providers({ children }: { children: ReactNode }) {

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          console.error('Application Error:', error, errorInfo);
          // Example: Send to Sentry, DataDog, etc.
        }
      }}
    >
      <Provider store={store}>
        {/* Temporarily disable PersistGate for debugging */}
        {/* <PersistGate loading={null} persistor={persistor}> */}
          <NotificationProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem suppressHydrationWarning>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                  loading: {
                    duration: Infinity,
                  },
                }}
              />
            </ThemeProvider>
          </NotificationProvider>
        {/* </PersistGate> */}
      </Provider>
    </ErrorBoundary>
  );
}
