'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Users, Calendar, AlertTriangle, Award, BookOpen,
  ShieldCheck, TrendingUp, CheckCircle, XCircle, Clock,
  RefreshCw, ChevronRight, GraduationCap, Heart
} from 'lucide-react';
import Link from 'next/link';

interface AnakData {
  id: number;
  nama: string;
  nis: string;
  nisn: string;
  kelas: string;
  jurusan: string;
  hubungan: string;
  attendance_rate: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  violations: number;
  violation_points: number;
  prestasi: number;
  perizinan_pending: number;
}

interface OrtuData {
  nama_ortu: string;
  anak_count: number;
  anak_list: AnakData[];
}

const HUB_COLOR: Record<string, string> = {
  Ayah: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Ibu: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Wali: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function OrangTuaDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<OrtuData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard/ortu');
      setData(res.data.data);
    } catch {
      toast.error('Gagal memuat data. Silakan refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'orang_tua') { router.push('/login'); return; }
    fetchData();
  }, [user, router, fetchData]);

  if (!user || user.role !== 'orang_tua') return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/30 p-6 shadow-lg">
        <div className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
              <ShieldCheck className="h-3 w-3" /> Portal Orang Tua / Wali Murid
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Selamat datang, <span className="text-primary">{data?.nama_ortu || user.username}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Pantau perkembangan akademik putra/putri Anda secara real-time.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : !data || data.anak_list.length === 0 ? (
        <Card className="bg-card border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Belum ada data anak</p>
              <p className="text-muted-foreground text-sm mt-1">
                Akun Anda belum dihubungkan dengan siswa. Hubungi admin sekolah.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Putra/Putri', value: data.anak_count, icon: <Users className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Total Prestasi', value: data.anak_list.reduce((s,a)=>s+a.prestasi,0), icon: <Award className="h-5 w-5" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'Total Pelanggaran', value: data.anak_list.reduce((s,a)=>s+a.violations,0), icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Izin Pending', value: data.anak_list.reduce((s,a)=>s+a.perizinan_pending,0), icon: <Clock className="h-5 w-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(stat => (
              <Card key={stat.label} className="bg-card border-border/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Card per anak */}
          <div className="space-y-5">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Rincian Per Anak
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {data.anak_list.map(anak => (
                <Card key={anak.id} className="bg-card border-border/30 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-blue-500" />
                  <CardHeader className="pb-3 border-b border-border/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold">{anak.nama}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{anak.kelas}{anak.jurusan ? ` · ${anak.jurusan}` : ''}</span>
                          <span className="text-xs text-muted-foreground">NIS: {anak.nis || '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={HUB_COLOR[anak.hubungan] || 'bg-gray-500/20 text-gray-400'}>
                          <Heart className="h-3 w-3 mr-1" />{anak.hubungan}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Kehadiran bulan ini */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Kehadiran Bulan Ini
                        </p>
                        <span className={`text-sm font-bold ${anak.attendance_rate >= 80 ? 'text-emerald-400' : anak.attendance_rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          {anak.attendance_rate}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-muted rounded-full h-2 mb-3">
                        <div className={`h-2 rounded-full transition-all ${anak.attendance_rate >= 80 ? 'bg-emerald-500' : anak.attendance_rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(anak.attendance_rate, 100)}%` }} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'Hadir', val: anak.hadir, color: 'text-emerald-400', icon: <CheckCircle className="h-3.5 w-3.5" /> },
                          { label: 'Sakit', val: anak.sakit, color: 'text-blue-400', icon: <Heart className="h-3.5 w-3.5" /> },
                          { label: 'Izin', val: anak.izin, color: 'text-purple-400', icon: <Clock className="h-3.5 w-3.5" /> },
                          { label: 'Alpa', val: anak.alpa, color: 'text-red-400', icon: <XCircle className="h-3.5 w-3.5" /> },
                        ].map(s => (
                          <div key={s.label} className="p-2 rounded-lg bg-muted/30 border border-border/20">
                            <div className={`flex justify-center mb-0.5 ${s.color}`}>{s.icon}</div>
                            <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pelanggaran & Prestasi */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-center">
                        <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-red-400">{anak.violations}</p>
                        <p className="text-[10px] text-muted-foreground">Pelanggaran</p>
                        {anak.violation_points > 0 && <p className="text-[10px] text-red-400/70">{anak.violation_points} poin</p>}
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-center">
                        <Award className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-yellow-400">{anak.prestasi}</p>
                        <p className="text-[10px] text-muted-foreground">Prestasi</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-center">
                        <Clock className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-amber-400">{anak.perizinan_pending}</p>
                        <p className="text-[10px] text-muted-foreground">Izin Pending</p>
                      </div>
                    </div>

                    {/* Aksi */}
                    <div className="flex gap-2 pt-1">
                      <Link href={`/dashboard/perizinan`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-border/30">
                          <CheckCircle className="h-3.5 w-3.5" /> Ajukan Izin
                        </Button>
                      </Link>
                      <Link href={`/dashboard/attendance`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-border/30">
                          <TrendingUp className="h-3.5 w-3.5" /> Absensi Detail
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Info */}
          <Card className="bg-card border-border/30">
            <CardContent className="flex gap-4 p-5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0"><BookOpen className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-sm mb-1">Catatan Penting</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Data kehadiran yang ditampilkan adalah rekap absensi per mata pelajaran dari jurnal mengajar guru.
                  Jika ada ketidaksesuaian, hubungi Wali Kelas atau Guru BK putra/putri Anda.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
