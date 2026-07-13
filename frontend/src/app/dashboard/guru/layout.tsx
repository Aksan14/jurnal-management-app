'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !['guru', 'wali_kelas'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return <>{children}</>;
}
