'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Award,
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck
} from 'lucide-react';

export default function KepsekDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'kepsek') {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const statsRes = await api.get('/reports/dashboard');
      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error('Error fetching principal stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'kepsek') return null;

  return (
    <div className="space-y-8 pb-12 text-white">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#111420]/80 border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
            <Award className="h-3.5 w-3.5" />
            Portal Kepala Sekolah
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Selamat datang, <span className="text-primary">{user?.username}</span>
          </h1>
          <p className="text-gray-400 mt-2 max-w-xl">
            Akses dashboard pemantauan read-only untuk seluruh data akademik, kehadiran guru, jurnal mengajar, dan log aktivitas sekolah.
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#111420]/60 border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Guru</CardTitle>
            <Users className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.total_guru || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Tenaga pengajar aktif</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111420]/60 border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Siswa</CardTitle>
            <Users className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.total_siswa || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Peserta didik terdaftar</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111420]/60 border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Kelas</CardTitle>
            <Calendar className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.total_kelas || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Rombongan belajar</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111420]/60 border-border/30 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Mata Pelajaran</CardTitle>
            <BookOpen className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.total_mapel || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Kurikulum aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#111420]/80 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Jurnal Mengajar Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.jurnal_hari_ini || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Materi pembelajaran diisi</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111420]/80 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Kehadiran Guru Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {stats?.guru_hadir_hari_ini || 0} / {stats?.total_guru || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tingkat kehadiran staff</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111420]/80 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Kehadiran Siswa Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats?.siswa_hadir_hari_ini || 0} / {stats?.total_siswa || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Siswa masuk & belajar</p>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Health Status & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#111420]/80 border-border/40">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Pemantauan Kedisiplinan</CardTitle>
            <CardDescription className="text-gray-400">Status anomali dan tingkat keterlambatan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#161a2b] border border-border/30 rounded-xl">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Siswa Terlambat Hari Ini
              </span>
              <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{stats?.siswa_terlambat || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#161a2b] border border-border/30 rounded-xl">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Guru Tidak Hadir
              </span>
              <Badge className="bg-red-500/10 text-red-400 border border-red-500/20">{stats?.guru_tidak_hadir || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#161a2b] border border-border/30 rounded-xl">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Status Operasional
              </span>
              <Badge className="bg-green-500/10 text-green-400 border border-green-500/20">Optimal</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Action / Report Links */}
        <Card className="bg-[#111420]/80 border-border/40 shadow-xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Akses Laporan & Rekap</CardTitle>
            <CardDescription className="text-gray-400">Navigasi instan ke modul pelaporan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/reports">
              <Button className="w-full justify-between bg-primary hover:bg-primary/95 text-white font-medium" size="lg">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rekap Jurnal & Absensi Guru/Siswa
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/master">
              <Button className="w-full justify-between border-border/40 hover:bg-white/5 text-gray-300" variant="outline" size="lg">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Lihat Master Data
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
