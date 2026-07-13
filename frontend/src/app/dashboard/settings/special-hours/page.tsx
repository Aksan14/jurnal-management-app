'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, ArrowLeft, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface JamKhusus {
  id: number;
  tanggal: string;
  max_jam: number;
  alasan: string;
  kelas_id: number | null;
  kelas?: { id: number; nama_kelas: string };
  keterangan: string;
}

interface Kelas {
  id: number;
  nama_kelas: string;
}

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

const defaultForm = { tanggal: '', max_jam: 6, alasan: '', kelas_id: '', keterangan: '' };

export default function SpecialHoursPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [items, setItems] = useState<JamKhusus[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const bulan = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, [bulan]);

  useEffect(() => {
    api.get('/master/kelas').then(r => setKelasList(r.data?.data || [])).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/jam-khusus?bulan=${bulan}`);
      setItems(res.data?.data || []);
    } catch {
      toast.error('Gagal memuat data jam khusus');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tanggal || !form.alasan || !form.max_jam) {
      toast.error('Tanggal, alasan, dan batas jam harus diisi');
      return;
    }
    try {
      await api.post('/attendance/jam-khusus', {
        tanggal: form.tanggal,
        max_jam: Number(form.max_jam),
        alasan: form.alasan,
        kelas_id: form.kelas_id ? Number(form.kelas_id) : null,
        keterangan: form.keterangan,
      });
      toast.success('Jam khusus berhasil ditambahkan');
      setForm(defaultForm);
      setOpen(false);
      fetchData();
    } catch {
      toast.error('Gagal menyimpan jam khusus');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jam khusus ini?')) return;
    try {
      await api.delete(`/attendance/jam-khusus/${id}`);
      toast.success('Jam khusus dihapus');
      fetchData();
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  // Calendar
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const jamMap = new Map<string, JamKhusus[]>();
  items.forEach(item => {
    const d = new Date(item.tanggal);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!jamMap.has(key)) jamMap.set(key, []);
    jamMap.get(key)!.push(item);
  });

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

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
            <Clock className="w-6 h-6 text-amber-500" />
            Kelola Jam Khusus
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tetapkan batas jam mengajar pada tanggal tertentu — misalnya saat ujian, acara sekolah, atau kondisi darurat.
            Sistem akan membatasi input jam ke pada hari tersebut sesuai nilai <strong>Maks. Jam</strong>.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Tambah Jam Khusus
        </Button>
      </div>

      {/* Calendar */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-foreground">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }} className="px-2 py-1 text-xs rounded-lg hover:bg-primary/10 text-primary font-medium transition-colors">Hari Ini</button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-orange-400' : 'text-muted-foreground'}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const dateKey = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const jams = jamMap.get(dateKey) || [];
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const dow = new Date(viewYear, viewMonth, day).getDay();
              return (
                <div key={idx} className={`relative flex flex-col items-center rounded-lg aspect-square text-xs font-medium transition-all select-none p-0.5 justify-center
                  ${isToday ? 'bg-primary text-white font-bold shadow-md' : jams.length ? 'bg-amber-500/15 border border-amber-500/30' : dow === 0 ? 'text-red-400/70' : dow === 6 ? 'text-orange-400/70' : 'text-foreground hover:bg-muted/50'}
                `} title={jams.map(j => `Maks ${j.max_jam} jam — ${j.alasan}`).join('\n') || undefined}>
                  <span>{day}</span>
                  {jams.length > 0 && (
                    <span className={`text-[8px] font-bold mt-0.5 ${isToday ? 'text-white/80' : 'text-amber-500'}`}>Maks {jams[0].max_jam}j</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30 inline-block" /> Jam Khusus (ada batasan)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Hari Ini</span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Daftar Jam Khusus — {MONTH_NAMES[viewMonth]} {viewYear}</CardTitle>
          <CardDescription className="text-muted-foreground">{items.length} entri terdaftar bulan ini</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-32"><div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <AlertCircle className="w-10 h-10 opacity-30" />
              <p className="text-sm">Belum ada jam khusus bulan ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Tanggal</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Maks. Jam</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Alasan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Berlaku Untuk</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Keterangan</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const d = new Date(item.tanggal);
                    return (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-foreground">
                          {d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-bold">{item.max_jam} Jam</Badge>
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground">{item.alasan}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">{item.kelas?.nama_kelas || <span className="italic">Semua Kelas</span>}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground max-w-48 truncate">{item.keterangan || '-'}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Tambah Jam Khusus</DialogTitle>
            <p className="text-sm text-muted-foreground">Batasi jumlah jam mengajar pada tanggal tertentu.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-foreground text-sm">Tanggal</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})} />
                <p className="text-[11px] text-muted-foreground">Tanggal berlakunya pembatasan jam ini</p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-foreground text-sm">Maks. Jam Mengajar</Label>
                <Input type="number" min={1} max={12} value={form.max_jam} onChange={e => setForm({...form, max_jam: Number(e.target.value)})} />
                <p className="text-[11px] text-muted-foreground">Guru tidak bisa mengisi jurnal melebihi jam ini pada hari tersebut</p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-foreground text-sm">Alasan <span className="text-destructive">*</span></Label>
                <Input placeholder="Contoh: Ujian Akhir Semester, Acara Sekolah, Rapat Dinas" value={form.alasan} onChange={e => setForm({...form, alasan: e.target.value})} />
                <p className="text-[11px] text-muted-foreground">Alasan singkat mengapa jam dibatasi hari ini</p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-foreground text-sm">Berlaku Untuk Kelas</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                  value={form.kelas_id}
                  onChange={e => setForm({...form, kelas_id: e.target.value})}
                >
                  <option value="">Semua Kelas</option>
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground">Kosongkan jika berlaku untuk seluruh kelas</p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-foreground text-sm">Keterangan Tambahan</Label>
                <Input placeholder="Opsional — detail lebih lanjut jika diperlukan" value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
