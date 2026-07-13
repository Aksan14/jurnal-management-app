'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function LaporanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laporan Bulanan</h1>
        <p className="text-gray-600 mt-1">Laporan mengajar dan rekapitulasi bulanan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laporan</CardTitle>
          <CardDescription>Lihat dan export laporan bulanan Anda</CardDescription>
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
