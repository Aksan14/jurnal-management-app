'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ApproveSiswaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [perizinan, setPerizinan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'guru' && user.role !== 'kepsek')) {
      router.push('/login');
      return;
    }
    fetchPerizinan();
  }, [user, router]);

  const fetchPerizinan = async () => {
    try {
      const res = await api.get('/perizinan/siswa?status=Pending');
      setPerizinan(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to fetch perizinan');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/perizinan/siswa/${id}/approve`, { status: 'Approved' });
      toast.success('Perizinan disetujui');
      setPerizinan(perizinan.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/perizinan/siswa/${id}/approve`, { status: 'Rejected' });
      toast.success('Perizinan ditolak');
      setPerizinan(perizinan.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold">Persetujuan Perizinan Siswa</h1>
        <p className="text-gray-500 mt-2">Kelola permohonan izin siswa</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval ({perizinan.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {perizinan.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Tidak ada permohonan pending</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Jenis Izin</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perizinan.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.siswa?.nama || '-'}</TableCell>
                      <TableCell><Badge>{p.jenis_izin}</Badge></TableCell>
                      <TableCell>{p.tanggal_mulai}</TableCell>
                      <TableCell className="text-sm">{p.alasan.substring(0, 50)}...</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(p.id)}
                          >
                            <Check className="w-3 h-3" /> Setuju
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleReject(p.id)}
                          >
                            <X className="w-3 h-3" /> Tolak
                          </Button>
                        </div>
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
