/**
 * Client-side Storage Adapter for Redux Persist
 * Provides a safe storage adapter that works with SSR
 */

import { Storage } from 'redux-persist';

/**
 * Create a safe storage adapter that only runs on the client
 * Falls back to noop storage on the server
 */
function createNoopStorage(): Storage {
  return {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  };
}

/**
 * Client-safe storage adapter
 * Uses localStorage on client, noop storage on server
 */
const clientStorage: Storage = typeof window !== 'undefined'
  ? {
      getItem: (key: string) => {
        try {
          return Promise.resolve(window.localStorage.getItem(key));
        } catch (error) {
          console.warn('localStorage.getItem error:', error);
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
          return Promise.resolve();
        } catch (error) {
          console.warn('localStorage.setItem error:', error);
          return Promise.resolve();
        }
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key);
          return Promise.resolve();
        } catch (error) {
          console.warn('localStorage.removeItem error:', error);
          return Promise.resolve();
        }
      },
    }
  : createNoopStorage();

export default clientStorage;
