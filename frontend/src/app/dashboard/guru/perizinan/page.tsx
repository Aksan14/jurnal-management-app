'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function PerizinanGuruPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Perizinan</h1>
        <p className="text-gray-600 mt-1">Ajukan dan kelola perizinan Anda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perizinan Guru</CardTitle>
          <CardDescription>Kelola permintaan perizinan dan cuti</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Fitur sedang dikembangkan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
