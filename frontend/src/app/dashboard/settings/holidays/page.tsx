'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Calendar, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface Holiday {
  id: number;
  tanggal: string;
  keterangan: string;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ tanggal: '', nama_libur: '', jenis: 'libur_nasional', kelas_id: '', keterangan: '' });

  useEffect(() => { fetchHolidays(); }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/holidays');
      setHolidays(res.data?.data || []);
    } catch {
      toast.error('Gagal memuat data hari libur');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tanggal || !formData.nama_libur) {
      toast.error('Tanggal dan nama hari libur harus diisi');
      return;
    }
    try {
      await api.post('/attendance/holidays', {
        tanggal: formData.tanggal,
        nama_libur: formData.nama_libur,
        jenis: formData.jenis,
        kelas_id: formData.kelas_id ? Number(formData.kelas_id) : null,
        keterangan: formData.keterangan,
      });
      toast.success('Hari libur berhasil ditambahkan');
      setFormData({ tanggal: '', nama_libur: '', jenis: 'libur_nasional', kelas_id: '', keterangan: '' });
      setOpen(false);
      fetchHolidays();
    } catch {
      toast.error('Gagal menambahkan hari libur');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus?')) return;
    try {
      await api.delete(`/attendance/holidays/${id}`);
      toast.success('Hari libur berhasil dihapus');
      fetchHolidays();
    } catch {
      toast.error('Gagal menghapus hari libur');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground -ml-2 mb-1">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Pengaturan
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-red-500" />
            Kelola Hari Libur
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atur hari libur dan tanggal-tanggal khusus dalam kalender sekolah
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Tambah Hari Libur
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : holidays.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Calendar className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Belum ada hari libur yang ditambahkan</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Tambah Sekarang
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Daftar Hari Libur</CardTitle>
            <CardDescription className="text-muted-foreground">{holidays.length} hari libur terdaftar</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Nama Hari Libur</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Tanggal</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Jenis</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Berlaku</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{(holiday as any).nama_libur || holiday.keterangan}</td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(holiday.tanggal)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          (holiday as any).jenis === 'libur_nasional' ? 'bg-red-500/20 text-red-400' :
                          (holiday as any).jenis === 'libur_sekolah' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {(holiday as any).jenis === 'libur_nasional' ? 'Nasional' : (holiday as any).jenis === 'libur_sekolah' ? 'Sekolah' : 'Hari Khusus'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{(holiday as any).kelas?.nama_kelas || <span className="italic">Semua Kelas</span>}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="text-destructive hover:text-destructive/80 transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Tambah Hari Libur Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-foreground">Nama Hari Libur <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Contoh: Hari Raya Idul Fitri, Hari Guru Nasional"
                value={formData.nama_libur}
                onChange={(e) => setFormData({ ...formData, nama_libur: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Nama resmi hari libur yang akan ditampilkan di kalender</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Tanggal <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Jenis Hari Libur</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                value={formData.jenis}
                onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
              >
                <option value="libur_nasional">🔴 Libur Nasional — berlaku nasional (Lebaran, HUT RI, dll)</option>
                <option value="libur_sekolah">🔵 Libur Sekolah — keputusan internal sekolah</option>
                <option value="hari_khusus">🟡 Hari Khusus — kegiatan khusus (ujian, upacara, dll)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Keterangan Tambahan</Label>
              <Input
                placeholder="Opsional — catatan atau detail lebih lanjut"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
