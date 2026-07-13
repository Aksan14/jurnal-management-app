'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Absensi {
  id: number;
  siswaID: number;
  tanggal: string;
  jam_masuk?: string;
  jam_pulang?: string;
  status: string;
}

export default function AbsensiPage() {
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulan, setBulan] = useState(new Date().toISOString().slice(0, 7));

  const statusBadgeColor = {
    H: 'bg-green-100 text-green-800',
    S: 'bg-yellow-100 text-yellow-800',
    I: 'bg-blue-100 text-blue-800',
    A: 'bg-red-100 text-red-800',
  };

  const statusLabel = {
    H: 'Hadir',
    S: 'Sakit',
    I: 'Izin',
    A: 'Alpa',
  };

  useEffect(() => {
    fetchAbsensi();
  }, [bulan]);

  const fetchAbsensi = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance/siswa?bulan=${bulan}`);
      if (response.data?.data) {
        setAbsensi(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch absensi:', error);
      toast.error('Gagal mengambil data absensi');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const stats = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
    };
    absensi.forEach(a => {
      if (a.status === 'H') stats.hadir++;
      else if (a.status === 'S') stats.sakit++;
      else if (a.status === 'I') stats.izin++;
      else if (a.status === 'A') stats.alpa++;
    });
    return stats;
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rekam Absensi</h1>
        <p className="text-gray-600 mt-1">Lihat riwayat kehadiran Anda</p>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filter Bulan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-64">
            <Label htmlFor="bulan">Pilih Bulan</Label>
            <Input
              id="bulan"
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.hadir}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sakit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.sakit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Izin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.izin}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alpa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.alpa}</div>
          </CardContent>
        </Card>
      </div>

      {/* Absensi List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Absensi</CardTitle>
          <CardDescription>Total: {absensi.length} hari</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : absensi.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Tidak ada data absensi untuk bulan ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absensi.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{format(new Date(a.tanggal), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{a.jam_masuk ? format(new Date(`2000-01-01T${a.jam_masuk}`), 'HH:mm') : '-'}</TableCell>
                      <TableCell>{a.jam_pulang ? format(new Date(`2000-01-01T${a.jam_pulang}`), 'HH:mm') : '-'}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeColor[a.status as keyof typeof statusBadgeColor] || 'bg-gray-100 text-gray-800'}>
                          {statusLabel[a.status as keyof typeof statusLabel] || a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
