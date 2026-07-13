'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Guru {
  id: number;
  nip: string;
  nama: string;
  email: string;
  jabatan: string;
  bidang: string;
}

export default function GuruManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    email: '',
    jabatan: 'Guru Mata Pelajaran',
    bidang: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadGuru();
  }, [user, router, page, searchTerm]);

  const loadGuru = async () => {
    try {
      setLoading(true);
      const res = await api.get('/guru', {
        params: {
          page,
          limit: 10,
          search: searchTerm,
        },
      });
      setGuruList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load guru:', err);
      toast.error('Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email) {
      toast.error('Silakan lengkapi semua field');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/guru/${editingId}`, formData);
        toast.success('Guru berhasil diperbarui');
      } else {
        await api.post('/guru', formData);
        toast.success('Guru berhasil ditambahkan');
      }

      setFormData({
        nip: '',
        nama: '',
        email: '',
        jabatan: 'Guru Mata Pelajaran',
        bidang: '',
      });
      setEditingId(null);
      setShowForm(false);
      loadGuru();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan guru');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus guru ini?')) return;

    try {
      await api.delete(`/guru/${id}`);
      toast.success('Guru berhasil dihapus');
      loadGuru();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus guru');
    }
  };

  const handleEdit = (item: Guru) => {
    setFormData({
      nip: item.nip,
      nama: item.nama,
      email: item.email,
      jabatan: item.jabatan,
      bidang: item.bidang,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Guru</h1>
          <p className="text-gray-500 mt-2">Kelola data guru di sekolah</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingId(null);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Guru
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Cari nama atau NIP guru..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Create/Edit */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Guru' : 'Tambah Guru Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>NIP</Label>
                  <Input
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Nomor Induk Pegawai"
                  />
                </div>
                <div>
                  <Label>Nama Lengkap</Label>
                  <Input
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama guru"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email guru"
                    required
                  />
                </div>
                <div>
                  <Label>Jabatan</Label>
                  <select
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option>Guru Mata Pelajaran</option>
                    <option>Guru BK</option>
                    <option>Koordinator</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Bidang/Mata Pelajaran</Label>
                <Input
                  value={formData.bidang}
                  onChange={(e) => setFormData({ ...formData, bidang: e.target.value })}
                  placeholder="Bidang keahlian"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? 'Perbarui' : 'Tambah'}
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
          <CardTitle>Daftar Guru ({guruList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : guruList.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Belum ada data guru</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Bidang</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guruList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nip}</TableCell>
                      <TableCell>{item.nama}</TableCell>
                      <TableCell className="text-sm">{item.email}</TableCell>
                      <TableCell className="text-sm">{item.jabatan}</TableCell>
                      <TableCell className="text-sm">{item.bidang}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button variant="outline" disabled>
          Page {page}
        </Button>
        <Button
          variant="outline"
          onClick={() => setPage(page + 1)}
          disabled={guruList.length < 10}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
