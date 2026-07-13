'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function BebanMengajarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Beban Mengajar</h1>
        <p className="text-gray-600 mt-1">Lihat beban mengajar per mata pelajaran dan kelas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beban Mengajar Bulan Ini</CardTitle>
          <CardDescription>Total jam mengajar berdasarkan mata pelajaran</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Fitur sedang dikembangkan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
