'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function GuruAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [gurus, setGurus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    email: '',
    no_telepon: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchGurus();
  }, [user, router]);

  const fetchGurus = async () => {
    try {
      const res = await api.get('/master/guru');
      setGurus(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to fetch gurus');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuru = async () => {
    if (!formData.nama || !formData.email) {
      toast.error('Nama dan email harus diisi');
      return;
    }
    try {
      const payload = { ...formData };
      const res = await api.post('/master/guru', payload);
      toast.success('Guru berhasil ditambahkan');
      setGurus([...gurus, res.data?.data]);
      setFormData({ nama: '', nip: '', email: '', no_telepon: '' });
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to add guru');
    }
  };

  const handleDeleteGuru = async (id: number) => {
    if (!confirm('Apakah Anda yakin?')) return;
    try {
      await api.delete(`/master/guru/${id}`);
      setGurus(gurus.filter(g => g.id !== id));
      toast.success('Guru berhasil dihapus');
    } catch (err) {
      toast.error('Failed to delete guru');
    }
  };

  const filteredGurus = gurus.filter(g =>
    g.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.nip.includes(searchTerm)
  );

  if (!user || user.role !== 'admin') return null;
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manajemen Guru</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Guru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Guru Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nama</Label>
                <Input
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <Label>NIP</Label>
                <Input
                  value={formData.nip}
                  onChange={(e) => setFormData({...formData, nip: e.target.value})}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  type="email"
                  placeholder="email@domain.com"
                />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input
                  value={formData.no_telepon}
                  onChange={(e) => setFormData({...formData, no_telepon: e.target.value})}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <Button onClick={handleAddGuru} className="w-full">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari berdasarkan nama atau NIP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>No. Telepon</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGurus.map((guru, idx) => (
                  <TableRow key={guru.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{guru.nama}</TableCell>
                    <TableCell>{guru.nip || '-'}</TableCell>
                    <TableCell>{guru.email}</TableCell>
                    <TableCell>{guru.no_telepon || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Edit2 className="w-3 h-3" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => handleDeleteGuru(guru.id)}
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredGurus.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Tidak ada data guru</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
