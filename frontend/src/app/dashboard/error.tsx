'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-100 gap-4 p-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-red-500">Terjadi Kesalahan</h2>
        <p className="text-muted-foreground text-sm">{error.message || 'Something went wrong'}</p>
      </div>
      <Button onClick={reset} variant="outline">Coba Lagi</Button>
    </div>
  );
}
