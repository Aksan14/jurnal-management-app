'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Jurnal {
  id: number;
  guruID: number;
  mapelID: number;
  kelasID: number;
  tanggal: string;
  jam_ke: number;
  durasi_menit: number;
  materi: string;
  metode: string;
  media: string;
  pemberi_tugas?: string;
  kehadiran_siswa: number;
  status: string;
}

export default function LihatJurnalPage() {
  const [jurnal, setJurnal] = useState<Jurnal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ guru: '', mapel: '', tanggal: '' });

  useEffect(() => {
    fetchJurnal();
  }, []);

  const fetchJurnal = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.guru) params.append('guru_id', filter.guru);
      if (filter.mapel) params.append('mapel_id', filter.mapel);
      if (filter.tanggal) params.append('tanggal', filter.tanggal);

      const response = await api.get(`/jurnal?${params.toString()}`);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Jurnal Pembelajaran</h1>
        <p className="text-gray-600 mt-1">Lihat jurnal pembelajaran dari guru Anda</p>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="guru">Guru</Label>
            <Input
              id="guru"
              placeholder="Nama guru"
              value={filter.guru}
              onChange={(e) => setFilter({ ...filter, guru: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="mapel">Mata Pelajaran</Label>
            <Input
              id="mapel"
              placeholder="Nama mapel"
              value={filter.mapel}
              onChange={(e) => setFilter({ ...filter, mapel: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input
              id="tanggal"
              type="date"
              value={filter.tanggal}
              onChange={(e) => setFilter({ ...filter, tanggal: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchJurnal} className="w-full">Cari</Button>
          </div>
        </CardContent>
      </Card>

      {/* Jurnal List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Jurnal</CardTitle>
          <CardDescription>Total: {jurnal.length} jurnal</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jurnal.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Tidak ada jurnal ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jurnal.map(j => (
                <div key={j.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tanggal</p>
                      <p className="font-semibold">{format(new Date(j.tanggal), 'dd MMMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Jam Ke</p>
                      <p className="font-semibold">Jam {j.jam_ke}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Materi</p>
                      <p className="font-semibold">{j.materi}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Metode</p>
                      <p className="font-semibold">{j.metode}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Media</p>
                      <p className="font-semibold">{j.media}</p>
                    </div>
                    {j.pemberi_tugas && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Tugas</p>
                        <p className="font-semibold">{j.pemberi_tugas}</p>
                      </div>
                    )}
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
