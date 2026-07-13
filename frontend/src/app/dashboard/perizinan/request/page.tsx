'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUpload } from '@/components/FileUpload';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Perizinan {
  id: number;
  siswa_id?: number;
  guru_id?: number;
  tipe: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  status: string;
  bukti_file?: string;
  created_at?: string;
}

export default function PerizinanPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [perizinanList, setPerizinanList] = useState<Perizinan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tipe: 'Sakit',
    tanggal_mulai: '',
    tanggal_selesai: '',
    alasan: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'siswa' && user.role !== 'guru')) {
      router.push('/login');
      return;
    }
    loadPerizinan();
  }, [user, router]);

  const loadPerizinan = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === 'guru' ? '/perizinan/guru' : '/perizinan/siswa';
      const res = await api.get(endpoint);
      setPerizinanList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load perizinan:', err);
      toast.error('Gagal memuat data perizinan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tanggal_mulai || !formData.alasan) {
      toast.error('Silakan lengkapi semua field');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = user?.role === 'guru' ? '/perizinan/guru' : '/perizinan/siswa';
      const data = {
        ...formData,
        siswa_id: user?.role === 'siswa' ? user?.id : undefined,
        guru_id: user?.role === 'guru' ? user?.id : undefined,
      };

      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, data);
        toast.success('Perizinan berhasil diperbarui');
      } else {
        await api.post(endpoint, data);
        toast.success('Perizinan berhasil dibuat');
      }

      setFormData({
        tipe: 'Sakit',
        tanggal_mulai: '',
        tanggal_selesai: '',
        alasan: '',
      });
      setEditingId(null);
      setShowForm(false);
      loadPerizinan();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan perizinan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus perizinan ini?')) return;

    try {
      const endpoint = user?.role === 'guru' ? '/perizinan/guru' : '/perizinan/siswa';
      await api.delete(`${endpoint}/${id}`);
      toast.success('Perizinan berhasil dihapus');
      loadPerizinan();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus perizinan');
    }
  };

  const handleEdit = (item: Perizinan) => {
    setFormData({
      tipe: item.tipe,
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai,
      alasan: item.alasan,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      approved: { bg: 'bg-green-100', text: 'text-green-800' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        {status}
      </Badge>
    );
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Perizinan</h1>
          <p className="text-gray-500 mt-2">Kelola permintaan izin/cuti</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingId(null);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Buat Perizinan
        </Button>
      </div>

      {/* Form Create/Edit */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Perizinan' : 'Buat Perizinan Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipe Perizinan</Label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option>Sakit</option>
                    <option>Izin</option>
                    <option>Cuti</option>
                    <option>Dinas</option>
                  </select>
                </div>
                <div>
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="date"
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Alasan</Label>
                <textarea
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                  placeholder="Jelaskan alasan perizinan"
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? 'Perbarui' : 'Buat'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Perizinan</CardTitle>
        </CardHeader>
        <CardContent>
          {perizinanList.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Belum ada perizinan</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perizinanList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.tipe}</TableCell>
                      <TableCell>
                        {new Date(item.tanggal_mulai).toLocaleDateString('id-ID')}
                        {item.tanggal_selesai && ` - ${new Date(item.tanggal_selesai).toLocaleDateString('id-ID')}`}
                      </TableCell>
                      <TableCell className="text-sm">{item.alasan.substring(0, 50)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.status === 'Pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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
