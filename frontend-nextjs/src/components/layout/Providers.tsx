'use client';

/**
 * Providers Component
 * Enterprise-grade provider setup with error boundaries and monitoring
 */

import { ReactNode, useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from '@/store';

import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { initializeAuth } from '@/store/slices/authSlice';


// Component to initialize auth from sessionStorage
function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize auth state from sessionStorage on client mount
    dispatch(initializeAuth());
  }, [dispatch]);

  return <>{children}</>;
}

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
        <PersistGate loading={null} persistor={persistor}>
          <AuthInitializer>
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
          </AuthInitializer>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}
