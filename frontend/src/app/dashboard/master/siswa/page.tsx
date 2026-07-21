'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { getBackendUrl } from '@/lib/utils';

const BACKEND_URL = getBackendUrl();
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Search, Camera, X, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Kelas { id: number; nama_kelas: string }
interface Jurusan { id: number; nama_jurusan: string }
interface Siswa {
  id: number
  user_id: number
  nisn: string
  nis: string
  nama: string
  kelas_id: number
  jurusan_id: number
  gender: string
  phone: string
  alamat: string
  status: string
  tahun_masuk: number
  foto_url?: string
  instagram?: string
  youtube?: string
  nama_ayah?: string
  nama_ibu?: string
  pekerjaan_ortu?: string
  wa_ortu?: string
  pendapatan_ortu?: number
  username?: string
  email?: string
  kelas?: { nama_kelas: string }
  jurusan?: { nama_jurusan: string }
  user?: { username: string; email: string }
}

interface FormData {
  username: string
  email: string
  nama: string
  nisn: string
  nis: string
  kelas_id: string
  jurusan_id: string
  gender: string
  phone: string
  alamat: string
  tahun_masuk: string
  foto_url: string
  instagram: string
  youtube: string
  nama_ayah: string
  nama_ibu: string
  pekerjaan_ortu: string
  wa_ortu: string
  pendapatan_ortu: string
  status: string
}

const defaultForm: FormData = {
  username: '',
  email: '',
  nama: '',
  nisn: '',
  nis: '',
  kelas_id: '',
  jurusan_id: '',
  gender: '',
  phone: '',
  alamat: '',
  tahun_masuk: new Date().getFullYear().toString(),
  foto_url: '',
  instagram: '',
  youtube: '',
  nama_ayah: '',
  nama_ibu: '',
  pekerjaan_ortu: '',
  wa_ortu: '',
  pendapatan_ortu: '0',
  status: 'Aktif',
}

export default function AdminSiswaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchAll();
  }, [user, router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [siswaRes, kelasRes, jurusanRes] = await Promise.all([
        api.get('/master/siswa?limit=500'),
        api.get('/master/kelas?limit=200'),
        api.get('/master/jurusan?limit=100'),
      ]);
      setSiswaList(siswaRes.data?.data || []);
      setKelasList(kelasRes.data?.data || []);
      setJurusanList(jurusanRes.data?.data || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.kelas_id || !formData.jurusan_id) {
      toast.error('Lengkapi field yang wajib diisi');
      return;
    }
    try {
      let fotoUrl = formData.foto_url;

      // Upload foto jika ada file baru yang dipilih
      if (fotoFile) {
        const fd = new FormData();
        fd.append('file', fotoFile);
        fd.append('prefix', 'siswa');
        const uploadRes = await api.post('/upload/foto', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fotoUrl = uploadRes.data?.data?.url || fotoUrl;
      }

      const payload = {
        username: formData.username,
        email: formData.email,
        nama: formData.nama,
        nisn: formData.nisn,
        nis: formData.nis,
        kelas_id: parseInt(formData.kelas_id),
        jurusan_id: parseInt(formData.jurusan_id),
        gender: formData.gender,
        phone: formData.phone,
        alamat: formData.alamat,
        tahun_masuk: parseInt(formData.tahun_masuk) || new Date().getFullYear(),
        foto_url: fotoUrl,
        instagram: formData.instagram,
        youtube: formData.youtube,
        nama_ayah: formData.nama_ayah,
        nama_ibu: formData.nama_ibu,
        pekerjaan_ortu: formData.pekerjaan_ortu,
        wa_ortu: formData.wa_ortu,
        pendapatan_ortu: parseInt(formData.pendapatan_ortu || '0'),
        status: formData.status || 'Aktif',
      };
      if (editMode && selectedId) {
        await api.put(`/master/siswa/${selectedId}`, payload);
        toast.success('Data siswa berhasil diupdate');
      } else {
        await api.post('/master/siswa', payload);
        toast.success('Siswa berhasil ditambahkan! Password dikirim ke email.');
      }
      setOpen(false);
      setFormData(defaultForm);
      setFotoFile(null);
      setFotoPreview('');
      setEditMode(false);
      setSelectedId(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan data');
    }
  };

  const handleEdit = (siswa: Siswa) => {
    setFormData({
      username: siswa.user?.username || '',
      email: siswa.user?.email || '',
      nama: siswa.nama,
      nisn: siswa.nisn || '',
      nis: siswa.nis || '',
      kelas_id: siswa.kelas_id?.toString() || '',
      jurusan_id: siswa.jurusan_id?.toString() || '',
      gender: siswa.gender || '',
      phone: siswa.phone || '',
      alamat: siswa.alamat || '',
      tahun_masuk: siswa.tahun_masuk?.toString() || new Date().getFullYear().toString(),
      foto_url: siswa.foto_url || '',
      instagram: siswa.instagram || '',
      youtube: siswa.youtube || '',
      nama_ayah: siswa.nama_ayah || '',
      nama_ibu: siswa.nama_ibu || '',
      pekerjaan_ortu: siswa.pekerjaan_ortu || '',
      wa_ortu: siswa.wa_ortu || '',
      pendapatan_ortu: siswa.pendapatan_ortu?.toString() || '0',
      status: siswa.status || 'Aktif',
    });
    setFotoFile(null);
    setFotoPreview(siswa.foto_url ? `${BACKEND_URL}${siswa.foto_url}` : '');
    setSelectedId(siswa.id);
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/master/siswa/${id}`);
      toast.success('Siswa berhasil dihapus');
      setDeleteConfirm(null);
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus siswa';
      if (err.response?.status === 409) {
        toast.warning(msg, { duration: 6000 });
        setDeleteConfirm(null);
        fetchAll();
      } else {
        toast.error(msg);
      }
    }
  };

  const filtered = siswaList.filter(s =>
    s.nama?.toLowerCase().includes(search.toLowerCase()) ||
    s.nisn?.includes(search)
  );

  const set = (key: keyof FormData, val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  if (!user || user.role !== 'admin') return null;
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Data Master</h1>
          <p className="text-muted-foreground">Kelola semua informasi siswa</p>
        </div>
        <Button onClick={() => { setFormData(defaultForm); setFotoFile(null); setFotoPreview(''); setEditMode(false); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Data
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Data Master <Badge variant="secondary">{filtered.length} data</Badge></CardTitle>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / NISN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Memuat data...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>NISN / NIS</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell>
                  </TableRow>
                ) : filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.id}</TableCell>
                    <TableCell className="font-mono text-sm">{s.nisn || '-'} / {s.nis || '-'}</TableCell>
                    <TableCell className="font-medium">{s.nama}</TableCell>
                    <TableCell>{s.kelas?.nama_kelas || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'Aktif' ? 'default' : 'destructive'} className={s.status === 'Aktif' ? 'bg-green-600' : ''}>
                        {s.status || 'Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(s.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tambah/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Data Siswa' : 'Tambah Data Master'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Info Pribadi */}
            <div className="space-y-3">
              <div>
                <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input value={formData.nama} onChange={e => set('nama', e.target.value)} placeholder="Nama Lengkap" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>NISN <span className="text-red-500">*</span></Label>
                  <Input value={formData.nisn} onChange={e => set('nisn', e.target.value)} placeholder="NISN" />
                </div>
                <div>
                  <Label>NIS</Label>
                  <Input value={formData.nis} onChange={e => set('nis', e.target.value)} placeholder="NIS (auto-generate jika kosong)" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kelas <span className="text-red-500">*</span></Label>
                  <Select value={formData.kelas_id ?? ''} onValueChange={(v: string | null) => set('kelas_id', v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Kelas --">{formData.kelas_id ? (kelasList.find(k => String(k.id) === formData.kelas_id)?.nama_kelas || formData.kelas_id) : "-- Pilih Kelas --"}</SelectValue></SelectTrigger>
                    <SelectContent>
          <SelectGroup>
                      {kelasList.map(k => (
                        <SelectItem key={k.id} value={k.id.toString()} label={k.nama_kelas}>{k.nama_kelas}</SelectItem>
                      ))}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jurusan <span className="text-red-500">*</span></Label>
                  <Select value={formData.jurusan_id ?? ''} onValueChange={(v: string | null) => set('jurusan_id', v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Jurusan --">{formData.jurusan_id ? (jurusanList.find(j => String(j.id) === formData.jurusan_id)?.nama_jurusan || formData.jurusan_id) : "-- Pilih Jurusan --"}</SelectValue></SelectTrigger>
                    <SelectContent>
          <SelectGroup>
                      {jurusanList.map(j => (
                        <SelectItem key={j.id} value={j.id.toString()} label={j.nama_jurusan}>{j.nama_jurusan}</SelectItem>
                      ))}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tahun Masuk</Label>
                <Input type="number" value={formData.tahun_masuk} onChange={e => set('tahun_masuk', e.target.value)} placeholder="2026" />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => set('status', v ?? 'Aktif')}>
                  <SelectTrigger><SelectValue placeholder="-- Pilih Status --" /></SelectTrigger>
                  <SelectContent>
          <SelectGroup>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                    <SelectItem value="Alumni">Alumni</SelectItem>
                    <SelectItem value="Pindah">Pindah</SelectItem>
                    <SelectItem value="DropOut">DropOut</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Foto Profil</Label>
                <div className="mt-1 flex items-start gap-3">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="preview" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  {/* Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setFotoFile(f);
                        setFotoPreview(URL.createObjectURL(f));
                        set('foto_url', ''); // will be replaced by upload result
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => fotoInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4" />
                      {fotoFile ? 'Ganti Foto' : fotoPreview ? 'Ubah Foto' : 'Pilih Foto'}
                    </Button>
                    {fotoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { setFotoFile(null); setFotoPreview(''); set('foto_url', ''); if (fotoInputRef.current) fotoInputRef.current.value = ''; }}
                      >
                        <X className="w-4 h-4" /> Hapus Foto
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">JPG, PNG, maks. 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Alamat Lengkap</Label>
                <Textarea value={formData.alamat} onChange={e => set('alamat', e.target.value)} placeholder="Alamat rumah" rows={2} />
              </div>

              <div>
                <Label>WhatsApp</Label>
                <Input value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Instagram</Label>
                  <Input value={formData.instagram} onChange={e => set('instagram', e.target.value)} placeholder="Username Instagram" />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input value={formData.youtube} onChange={e => set('youtube', e.target.value)} placeholder="Link/Nama Channel" />
                </div>
              </div>
            </div>

            {/* Info Orang Tua */}
            <div className="space-y-3 border-t pt-4">
              <p className="font-semibold text-sm">Informasi Orang Tua</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Ayah</Label>
                  <Input value={formData.nama_ayah} onChange={e => set('nama_ayah', e.target.value)} placeholder="Nama Lengkap Ayah" />
                </div>
                <div>
                  <Label>Nama Ibu</Label>
                  <Input value={formData.nama_ibu} onChange={e => set('nama_ibu', e.target.value)} placeholder="Nama Lengkap Ibu" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pekerjaan Orang Tua</Label>
                  <Input value={formData.pekerjaan_ortu} onChange={e => set('pekerjaan_ortu', e.target.value)} placeholder="Pekerjaan" />
                </div>
                <div>
                  <Label>WhatsApp Orang Tua</Label>
                  <Input value={formData.wa_ortu} onChange={e => set('wa_ortu', e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <div>
                <Label>Pendapatan Orang Tua (Bulanan)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rp</span>
                  <Input type="number" value={formData.pendapatan_ortu} onChange={e => set('pendapatan_ortu', e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>

            {/* Akun Login */}
            <div className="space-y-3 border-t pt-4">
              <p className="font-semibold text-sm">Akun Login</p>
              <div>
                <Label>Username <span className="text-red-500">*</span></Label>
                <Input value={formData.username} onChange={e => set('username', e.target.value)} placeholder="Username untuk login" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="Email (password akan dikirim ke email ini)" />
              </div>
              {!editMode && (
                <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  🔐 Password akan di-generate otomatis dan dikirim ke email siswa.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit">{editMode ? 'Update' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
