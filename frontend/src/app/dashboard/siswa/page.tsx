'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Award,
  ChevronRight,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

interface SiswaStats {
  attendance_rate: number;
  perizinan_pending: number;
  violations: number;
  violation_points: number;
  prestasi: number;
}

export default function SiswaDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<SiswaStats>({
    attendance_rate: 0,
    perizinan_pending: 0,
    violations: 0,
    violation_points: 0,
    prestasi: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/reports/dashboard');
        if (response.data?.data) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
              <Award className="h-3 w-3" />
              Siswa Aktif
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Selamat datang, <span className="text-primary">{user?.username}</span>!
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Pantau tingkat kehadiran Anda, periksa catatan bimbingan konseling, prestasi, dan kelola pengajuan izin kelas Anda.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-muted border border-border/30 rounded-2xl p-4 self-start md:self-auto">
            <Clock className="h-10 w-10 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Tanggal Hari Ini</div>
              <div className="text-sm font-bold text-foreground">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attendance Rate */}
        <Card className="bg-card border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tingkat Kehadiran</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.attendance_rate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Kehadiran bulan ini</p>
          </CardContent>
        </Card>

        {/* Perizinan Pending */}
        <Card className="bg-card border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Izin Pending</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.perizinan_pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Menunggu persetujuan</p>
          </CardContent>
        </Card>

        {/* Violations */}
        <Card className="bg-card border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pelanggaran</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {stats.violations} <span className="text-sm text-muted-foreground font-normal">({stats.violation_points || 0} Poin)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pelanggaran terdaftar</p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-card border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prestasi</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
              <Award className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">{stats.prestasi}</div>
            <p className="text-xs text-muted-foreground mt-1">Total penghargaan prestasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-primary" />
              Pembelajaran & Kehadiran
            </CardTitle>
            <CardDescription className="text-muted-foreground">Lihat jurnal harian dan riwayat absensi kelas Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/jurnal">
              <Button className="w-full justify-between bg-primary hover:bg-primary/95 text-white font-medium" variant="default">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Lihat Jurnal Pembelajaran
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/attendance">
              <Button className="w-full justify-between border-border/40 hover:bg-muted text-foreground" variant="outline">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Lihat Riwayat Absensi
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-orange-400" />
              Bimbingan BK & Perizinan
            </CardTitle>
            <CardDescription className="text-muted-foreground">Kelola ajuan izin dan periksa status BK Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/perizinan">
              <Button className="w-full justify-between bg-orange-600 hover:bg-orange-500 text-white font-medium animate-pulse-slow" variant="default">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Ajukan Izin Baru
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/bk">
              <Button className="w-full justify-between border-border/40 hover:bg-muted text-foreground" variant="outline">
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Status Konseling & Prestasi BK
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Educational message */}
      <Card className="bg-card border-border/40 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <div className="flex gap-4">
          <TrendingUp className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h4 className="font-bold text-foreground mb-1">Pemberitahuan Akademik</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Jaga tingkat kehadiran Anda di atas 90% sebagai syarat mengikuti ujian sekolah. Lakukan konsultasi ke Guru BK atau Wali Kelas apabila Anda mengalami kesulitan belajar.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
