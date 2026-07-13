'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Briefcase, FileText, Clock, CheckCircle,
  XCircle, Shield, ChevronRight, TrendingUp, Calendar,
  Clipboard, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

function StatCard({ label, value, sub, icon, color = 'text-primary' }: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <div className={`p-2.5 rounded-xl bg-primary/10 ${color} shrink-0 ml-3`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/40 hover:bg-muted border border-border transition-all duration-200 group">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}

export default function GuruDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reports/dashboard/guru');
        setStats(res.data?.data || null);
      } catch (e) {
        console.error('Failed to fetch guru stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const isWaliKelas = user?.role === 'wali_kelas';
  const sudahCheckIn = stats?.sudah_check_in === true;
  const rate = stats?.kehadiran_rate ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 shadow-sm">
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
              <Shield className="h-3 w-3" />
              {isWaliKelas ? 'Wali Kelas' : 'Guru Pengajar'}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Selamat datang kembali, <span className="text-primary">{user?.username}</span>!
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola jurnal harian, absensi kelas, dan pantau aktivitas mengajar Anda.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl p-4 self-start">
            <Clock className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Tanggal Hari Ini</div>
              <div className="text-sm font-bold text-foreground">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Jurnal Bulan Ini"
          value={stats?.jurnal_bulan_ini ?? 0}
          sub="Entri jurnal mengajar"
          icon={<BookOpen className="h-5 w-5" />}
          color="text-primary"
        />
        <StatCard
          label="Mengajar Hari Ini"
          value={stats?.mengajar_hari_ini ?? 0}
          sub={`Jadwal hari ${stats?.hari_ini || '-'}`}
          icon={<Calendar className="h-5 w-5" />}
          color="text-blue-500"
        />
        {/* Check-in status */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Status Check-In</p>
            {sudahCheckIn ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-lg font-bold text-emerald-500">Sudah Hadir</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats?.check_in_time ? `Pukul ${stats.check_in_time} WIB` : 'Check-in hari ini'}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-bold text-amber-500">Belum Check-In</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Lakukan scan QR di gerbang</p>
              </>
            )}
          </CardContent>
        </Card>
        {/* Kehadiran rate */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Kehadiran Bulan Ini</p>
            <p className={`text-2xl font-bold ${rate >= 80 ? 'text-emerald-500' : rate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{rate}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full transition-all ${rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.hadir_bulan_ini ?? 0} hari hadir</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Perizinan Pending"
          value={stats?.perizinan_pending ?? 0}
          sub="Menunggu persetujuan"
          icon={<Clipboard className="h-5 w-5" />}
          color="text-amber-500"
        />
        <StatCard
          label="Request Jurnal Mundur"
          value={stats?.request_pending ?? 0}
          sub="Menunggu review admin"
          icon={<Clock className="h-5 w-5" />}
          color="text-purple-500"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Kelola Pengajaran
            </CardTitle>
            <CardDescription>Menu pengisian dan riwayat jurnal mengajar harian.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ActionCard
              href="/dashboard/jurnal"
              icon={<Clipboard className="h-5 w-5 text-primary" />}
              title="Isi Jurnal & Absensi Kelas"
              sub="Catat materi dan kehadiran siswa"
            />
            <ActionCard
              href="/dashboard/jurnal"
              icon={<FileText className="h-5 w-5 text-blue-500" />}
              title="Lihat Riwayat Jurnal"
              sub="Semua entri jurnal Anda"
            />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Perizinan & Kehadiran
            </CardTitle>
            <CardDescription>Ajukan dan kelola perizinan diri Anda sendiri.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ActionCard
              href="/dashboard/perizinan"
              icon={<Briefcase className="h-5 w-5 text-emerald-500" />}
              title="Ajukan / Kelola Izin Guru"
              sub="Sakit, cuti, atau dinas luar"
            />
            <ActionCard
              href="/dashboard/attendance"
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              title="Lihat Riwayat Absensi Saya"
              sub="Rekap kehadiran bulan ini"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
