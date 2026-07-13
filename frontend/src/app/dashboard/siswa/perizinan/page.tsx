'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

interface Perizinan {
  id: number;
  siswaID: number;
  jenisIzin: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  buktiUrl?: string;
  status: string;
  createdAt: string;
}

export default function PerizinanPage() {
  const { user } = useAuthStore();
  const [perizinanList, setPerizinanList] = useState<Perizinan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    jenisIzin: 'keperluan' as string,
    tanggalMulai: '',
    tanggalSelesai: '',
    alasan: '',
  });

  const jenisIzinOptions = [
    { value: 'sakit', label: 'Sakit' },
    { value: 'keperluan', label: 'Keperluan' },
    { value: 'dispensasi', label: 'Dispensasi' },
    { value: 'lainnya', label: 'Lainnya' },
  ];

  const statusBadgeColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    fetchPerizinan();
  }, []);

  const fetchPerizinan = async () => {
    try {
      setLoading(true);
      const response = await api.get('/perizinan/siswa');
      if (response.data?.data) {
        setPerizinanList(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch perizinan:', error);
      toast.error('Gagal mengambil data perizinan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tanggalMulai || !formData.tanggalSelesai || !formData.alasan) {
      toast.error('Mohon lengkapi semua field');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        siswaID: user?.id,
        jenisIzin: formData.jenisIzin,
        tanggalMulai: formData.tanggalMulai,
        tanggalSelesai: formData.tanggalSelesai,
        alasan: formData.alasan,
      };

      const response = await api.post('/perizinan/siswa', payload);
      if (response.data?.success) {
        toast.success('Perizinan berhasil diajukan');
        setPerizinanList([...perizinanList, response.data.data]);
        setFormData({ jenisIzin: 'keperluan', tanggalMulai: '', tanggalSelesai: '', alasan: '' });
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to submit perizinan:', error);
      toast.error('Gagal mengajukan perizinan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus perizinan ini?')) return;

    try {
      const response = await api.delete(`/perizinan/siswa/${id}`);
      if (response.data?.success) {
        toast.success('Perizinan berhasil dihapus');
        setPerizinanList(perizinanList.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete perizinan:', error);
      toast.error('Gagal menghapus perizinan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Perizinan</h1>
          <p className="text-gray-600 mt-1">Ajukan dan kelola perizinan Anda</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajukan Perizinan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajukan Perizinan Baru</DialogTitle>
              <DialogDescription>Isi form di bawah untuk mengajukan perizinan</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="jenis">Jenis Perizinan</Label>
                <Select value={formData.jenisIzin || ''} onValueChange={(value) => setFormData({ ...formData, jenisIzin: value ?? '' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
          <SelectGroup>
                    {jenisIzinOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mulai">Tanggal Mulai</Label>
                  <Input
                    id="mulai"
                    type="date"
                    value={formData.tanggalMulai}
                    onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="selesai">Tanggal Selesai</Label>
                  <Input
                    id="selesai"
                    type="date"
                    value={formData.tanggalSelesai}
                    onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="alasan">Alasan</Label>
                <Textarea
                  id="alasan"
                  placeholder="Jelaskan alasan perizinan Anda"
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Mengirim...' : 'Ajukan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Perizinan</CardTitle>
          <CardDescription>Daftar semua permintaan perizinan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : perizinanList.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Belum ada perizinan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perizinanList.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="capitalize">{p.jenisIzin}</TableCell>
                      <TableCell>{format(new Date(p.tanggalMulai), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(p.tanggalSelesai), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeColor[p.status as keyof typeof statusBadgeColor] || 'bg-gray-100 text-gray-800'}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
