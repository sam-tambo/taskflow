import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Revenue Precision` : 'Revenue Precision';
    return () => { document.title = 'Revenue Precision'; };
  }, [title]);
}
