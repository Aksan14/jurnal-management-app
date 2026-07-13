'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function RiwayatPermintaanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Permintaan</h1>
        <p className="text-gray-600 mt-1">Lihat riwayat semua permintaan Anda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat</CardTitle>
          <CardDescription>Perizinan, cuti, dan permintaan lainnya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Fitur sedang dikembangkan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
