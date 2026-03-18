import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) setOffline(true);
        else setOffline(false);
      } catch {
        setOffline(true);
      }
    };

    const handleOnline = () => { setOffline(false); check(); };
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Only start polling if initially offline
    if (!navigator.onLine) {
      setOffline(true);
      interval = setInterval(check, 30000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>Connection issue — changes may not be saving. Retrying...</span>
    </div>
  );
}
