'use client';

/**
 * Redux Provider for Next.js App Router
 * Wraps the application with Redux store and persist gate
 */

import { ReactNode, useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';

interface ReduxProviderProps {
  children: ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  // Prevent store from being recreated on every render
  const storeRef = useRef(store);
  const persistorRef = useRef(persistor);

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistorRef.current}>
        {children}
      </PersistGate>
    </Provider>
  );
}
