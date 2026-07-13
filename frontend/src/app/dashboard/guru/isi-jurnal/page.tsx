'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface JurnalItem {
  id: number;
  mapel: string;
  kelas: string;
  tanggal: string;
  materi: string;
  status: string;
}

export default function IsiJurnalPage() {
  const [jurnal, setJurnal] = useState<JurnalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJurnal = async () => {
      try {
        const response = await api.get('/jurnal');
        if (response.data?.data) {
          setJurnal(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch jurnal:', error);
        toast.error('Gagal mengambil data jurnal');
      } finally {
        setLoading(false);
      }
    };
    fetchJurnal();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Isi Jurnal Baru</h1>
          <p className="text-gray-600 mt-1">Buat jurnal pembelajaran baru</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Jurnal Baru
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Jurnal Anda</CardTitle>
          <CardDescription>Daftar jurnal yang telah dibuat</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jurnal.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada jurnal dibuat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jurnal.map(j => (
                <div key={j.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{j.mapel}</p>
                      <p className="text-sm text-gray-600">{j.kelas} - {j.tanggal}</p>
                      <p className="text-sm mt-2">{j.materi}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-sm ${j.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {j.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
