// app/lib/hooks/useConnectionStatus.ts
import { useState, useEffect } from 'react';

export function useConnectionStatus(): boolean {
  // Initialize state with navigator.onLine, but ensure it's only accessed client-side
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Default to true in SSR or non-browser environments
  });

  useEffect(() => {
    // Ensure window and navigator are defined (client-side)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // Update state with the current navigator.onLine value when component mounts on client
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
