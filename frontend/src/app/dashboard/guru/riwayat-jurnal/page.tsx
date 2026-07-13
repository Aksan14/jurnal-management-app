'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function RiwayatJurnalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Jurnal</h1>
        <p className="text-gray-600 mt-1">Lihat semua jurnal yang telah dibuat</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Jurnal</CardTitle>
          <CardDescription>Filter dan cari jurnal Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Fitur sedang dikembangkan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
