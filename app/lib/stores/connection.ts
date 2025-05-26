// app/lib/stores/connection.ts
import { atom } from 'nanostores';

// Initialize with navigator.onLine, but ensure it's only accessed client-side
const getInitialOnlineStatus = () => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // Default to true in SSR or non-browser environments
};

export const connectionStatusStore = atom<boolean>(getInitialOnlineStatus());

// Functions to update the store
const handleOnline = () => {
  if (connectionStatusStore.get() === false) {
    console.log('Connection status changed to Online');
    connectionStatusStore.set(true);
  }
};

const handleOffline = () => {
  if (connectionStatusStore.get() === true) {
    console.log('Connection status changed to Offline');
    connectionStatusStore.set(false);
  }
};

// Add event listeners only on the client-side
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  // Set initial state correctly once window is available
  if (connectionStatusStore.get() !== navigator.onLine) {
    connectionStatusStore.set(navigator.onLine);
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

// Optional: Hook to use the store easily (alternative to direct useStore)
// import { useStore } from '@nanostores/react';
// export const useConnectionStatusFromStore = () => useStore(connectionStatusStore);
