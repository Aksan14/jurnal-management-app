'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Loader2, Search, ChevronLeft, ChevronRight, Mail, Users, User, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Siswa {
  id: number;
  nisn: string;
  nis: string;
  nama: string;
  email: string;
  kelas_id: number;
  jurusan_id: number;
  phone: string;
  gender: string;
  alamat: string;
  status: string;
  tahun_masuk: number;
  foto_url: string;
  instagram: string;
  youtube: string;
  nama_ayah: string;
  nama_ibu: string;
  pekerjaan_ortu: string;
  wa_ortu: string;
  pendapatan_ortu: number;
  kelas?: { nama_kelas: string };
  jurusan?: { nama_jurusan: string; kode_jurusan: string };
}

interface FormData {
  username: string;
  email: string;
  nisn: string;
  nis: string;
  nama: string;
  kelas_id: string;
  jurusan_id: string;
  gender: string;
  phone: string;
  alamat: string;
  status: string;
  tahun_masuk: string;
  foto_url: string;
  instagram: string;
  youtube: string;
  nama_ayah: string;
  nama_ibu: string;
  pekerjaan_ortu: string;
  wa_ortu: string;
  pendapatan_ortu: string;
}

const defaultForm: FormData = {
  username: '',
  email: '',
  nisn: '',
  nis: '',
  nama: '',
  kelas_id: '',
  jurusan_id: '',
  gender: 'L',
  phone: '',
  alamat: '',
  status: 'Aktif',
  tahun_masuk: String(new Date().getFullYear()),
  foto_url: '',
  instagram: '',
  youtube: '',
  nama_ayah: '',
  nama_ibu: '',
  pekerjaan_ortu: '',
  wa_ortu: '',
  pendapatan_ortu: '0',
};

export default function SiswaManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadKelas();
    loadJurusan();
    loadSiswa();
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'admin') loadSiswa();
  }, [page, searchTerm]);

  const loadKelas = async () => {
    try {
      const res = await api.get('/kelas', { params: { limit: 100 } });
      setKelasList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load kelas:', err);
    }
  };

  const loadJurusan = async () => {
    try {
      const res = await api.get('/master/jurusan', { params: { limit: 100 } });
      setJurusanList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load jurusan:', err);
    }
  };

  const loadSiswa = async () => {
    try {
      setLoading(true);
      const res = await api.get('/siswa', {
        params: { page, limit: 10, search: searchTerm },
      });
      setSiswaList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load siswa:', err);
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof FormData, val: string) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email || !formData.username) {
      toast.error('Nama, email, dan username wajib diisi');
      return;
    }
    if (!formData.kelas_id || !formData.jurusan_id) {
      toast.error('Kelas dan jurusan wajib dipilih');
      return;
    }

    const payload = {
      username: formData.username,
      email: formData.email,
      nisn: formData.nisn,
      nis: formData.nis,
      nama: formData.nama,
      kelas_id: parseInt(formData.kelas_id),
      jurusan_id: parseInt(formData.jurusan_id),
      gender: formData.gender,
      phone: formData.phone,
      alamat: formData.alamat,
      status: formData.status || 'Aktif',
      tahun_masuk: parseInt(formData.tahun_masuk) || new Date().getFullYear(),
      foto_url: formData.foto_url,
      instagram: formData.instagram,
      youtube: formData.youtube,
      nama_ayah: formData.nama_ayah,
      nama_ibu: formData.nama_ibu,
      pekerjaan_ortu: formData.pekerjaan_ortu,
      wa_ortu: formData.wa_ortu,
      pendapatan_ortu: parseInt(formData.pendapatan_ortu) || 0,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put('/siswa/' + editingId, payload);
        toast.success('Data siswa berhasil diperbarui');
      } else {
        await api.post('/siswa', payload);
        toast.success('Siswa berhasil didaftarkan! Password dikirim ke email siswa.');
      }
      setFormData(defaultForm);
      setEditingId(null);
      setShowForm(false);
      loadSiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan siswa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data siswa ini?')) return;
    try {
      await api.delete('/siswa/' + id);
      toast.success('Siswa berhasil dihapus');
      loadSiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus siswa');
    }
  };

  const handleEdit = (item: Siswa) => {
    setFormData({
      username: '',
      email: item.email || '',
      nisn: item.nisn || '',
      nis: item.nis || '',
      nama: item.nama || '',
      kelas_id: String(item.kelas_id || ''),
      jurusan_id: String(item.jurusan_id || ''),
      gender: item.gender || 'L',
      phone: item.phone || '',
      alamat: item.alamat || '',
      status: item.status || 'Aktif',
      tahun_masuk: String(item.tahun_masuk || new Date().getFullYear()),
      foto_url: item.foto_url || '',
      instagram: item.instagram || '',
      youtube: item.youtube || '',
      nama_ayah: item.nama_ayah || '',
      nama_ibu: item.nama_ibu || '',
      pekerjaan_ortu: item.pekerjaan_ortu || '',
      wa_ortu: item.wa_ortu || '',
      pendapatan_ortu: String(item.pendapatan_ortu || 0),
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(defaultForm);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Siswa</h1>
          <p className="text-gray-500 mt-1">Password otomatis dikirim ke email siswa saat pendaftaran</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tambah Siswa
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Edit Data Siswa' : 'Daftarkan Siswa Baru'}
            </CardTitle>
            {!editingId && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="w-4 h-4 text-blue-500" />
                Password akan di-generate otomatis dan dikirim ke email siswa
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* DATA PRIBADI */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Data Pribadi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.nama}
                      onChange={(e) => set('nama', e.target.value)}
                      placeholder="Nama Lengkap"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>NISN</Label>
                    <Input
                      value={formData.nisn}
                      onChange={(e) => set('nisn', e.target.value)}
                      placeholder="NISN (kosongkan untuk auto-generate)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>NIS</Label>
                    <Input
                      value={formData.nis}
                      onChange={(e) => set('nis', e.target.value)}
                      placeholder="NIS (kosongkan untuk auto-generate)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Jenis Kelamin <span className="text-red-500">*</span></Label>
                    <Select value={formData.gender} onValueChange={(v) => set('gender', v ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jenis Kelamin">{formData.gender === "L" ? "Laki-laki" : formData.gender === "P" ? "Perempuan" : "Pilih Jenis Kelamin"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
          <SelectGroup>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* DATA AKADEMIK */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Data Akademik
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Kelas <span className="text-red-500">*</span></Label>
                    <Select value={formData.kelas_id} onValueChange={(v) => set('kelas_id', v ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Pilih Kelas --">{formData.kelas_id ? (kelasList.find(k => String(k.id || k.ID) === formData.kelas_id)?.nama_kelas || formData.kelas_id) : "-- Pilih Kelas --"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
          <SelectGroup>
                        {kelasList.map((k) => (
                          <SelectItem key={k.id || k.ID} value={String(k.id || k.ID)} label={k.nama_kelas || k.nama}>
                            {k.nama_kelas || k.nama}
                          </SelectItem>
                        ))}
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Jurusan <span className="text-red-500">*</span></Label>
                    <Select value={formData.jurusan_id} onValueChange={(v) => set('jurusan_id', v ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Pilih Jurusan --">{formData.jurusan_id ? (jurusanList.find(j => String(j.id || j.ID) === formData.jurusan_id)?.nama_jurusan || formData.jurusan_id) : "-- Pilih Jurusan --"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
          <SelectGroup>
                        {jurusanList.map((j) => (
                          <SelectItem key={j.id || j.ID} value={String(j.id || j.ID)} label={j.nama_jurusan}>
                            {j.nama_jurusan} ({j.kode_jurusan})
                          </SelectItem>
                        ))}
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tahun Masuk</Label>
                    <Input
                      type="number"
                      value={formData.tahun_masuk}
                      onChange={(e) => set('tahun_masuk', e.target.value)}
                      placeholder={String(new Date().getFullYear())}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => set('status', v ?? '')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
          <SelectGroup>
                        <SelectItem value="Aktif">Aktif</SelectItem>
                        <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                        <SelectItem value="Alumni">Alumni</SelectItem>
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* KONTAK & SOSIAL */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Kontak &amp; Sosial Media
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>WhatsApp</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Instagram</Label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => set('instagram', e.target.value)}
                      placeholder="Username Instagram"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>YouTube</Label>
                    <Input
                      value={formData.youtube}
                      onChange={(e) => set('youtube', e.target.value)}
                      placeholder="Link/Nama Channel"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Foto URL</Label>
                    <Input
                      value={formData.foto_url}
                      onChange={(e) => set('foto_url', e.target.value)}
                      placeholder="https://example.com/foto.jpg"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label>Alamat Lengkap</Label>
                    <Textarea
                      value={formData.alamat}
                      onChange={(e) => set('alamat', e.target.value)}
                      placeholder="Alamat rumah"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* DATA ORANG TUA */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Informasi Orang Tua
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nama Ayah</Label>
                    <Input
                      value={formData.nama_ayah}
                      onChange={(e) => set('nama_ayah', e.target.value)}
                      placeholder="Nama Lengkap Ayah"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Nama Ibu</Label>
                    <Input
                      value={formData.nama_ibu}
                      onChange={(e) => set('nama_ibu', e.target.value)}
                      placeholder="Nama Lengkap Ibu"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Pekerjaan Orang Tua</Label>
                    <Input
                      value={formData.pekerjaan_ortu}
                      onChange={(e) => set('pekerjaan_ortu', e.target.value)}
                      placeholder="Pekerjaan"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>WhatsApp Orang Tua</Label>
                    <Input
                      value={formData.wa_ortu}
                      onChange={(e) => set('wa_ortu', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Pendapatan Orang Tua (Bulanan)</Label>
                    <div className="flex items-center border rounded-md overflow-hidden">
                      <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border-r">Rp</span>
                      <Input
                        type="number"
                        value={formData.pendapatan_ortu}
                        onChange={(e) => set('pendapatan_ortu', e.target.value)}
                        placeholder="0"
                        className="border-0 rounded-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AKUN LOGIN */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" /> Akun Login
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Username <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => set('username', e.target.value)}
                      placeholder="username_siswa"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="email@siswa.sch.id"
                      required
                    />
                  </div>
                </div>
                {!editingId && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Password akan di-generate otomatis dan dikirim ke alamat email di atas
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="min-w-32">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? 'Simpan Perubahan' : 'Daftarkan Siswa'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {!showForm && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Cari nama, NISN, atau email siswa..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Daftar Siswa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : siswaList.length === 0 ? (
              <p className="text-center text-gray-500 py-10">Belum ada data siswa</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NISN / NIS</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jurusan</TableHead>
                      <TableHead>Tahun Masuk</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siswaList.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          <div>{item.nisn || '-'}</div>
                          {item.nis && <div className="text-xs text-muted-foreground">{item.nis}</div>}
                        </TableCell>
                        <TableCell className="font-medium">{item.nama}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                        <TableCell className="text-sm">{item.kelas?.nama_kelas || kelasList.find(k => (k.id || k.ID) === item.kelas_id)?.nama_kelas || "-"}</TableCell>
                        <TableCell className="text-sm">{item.jurusan?.nama_jurusan || item.jurusan?.kode_jurusan || jurusanList.find(j => (j.id || j.ID) === item.jurusan_id)?.nama_jurusan || "-"}</TableCell>
                        <TableCell className="text-sm">{item.tahun_masuk || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'Aktif' ? 'default' : 'secondary'}>
                            {item.status || 'Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
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
      )}

      {/* Pagination */}
      {!showForm && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground px-2">Halaman {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={siswaList.length < 10}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
