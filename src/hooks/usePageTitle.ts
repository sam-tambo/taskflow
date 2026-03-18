import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — TaskFlow` : 'TaskFlow';
    return () => { document.title = 'TaskFlow'; };
  }, [title]);
}
