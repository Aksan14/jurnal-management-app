"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users, GraduationCap, School, BookOpen, Clock,
  AlertTriangle, Award, CheckCircle, XCircle, FileSpreadsheet,
  TrendingUp, Calendar, Activity, BarChart2, ShieldCheck,
  Clipboard, Timer, Briefcase, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import SchoolCalendar from "@/components/SchoolCalendar";
import Link from "next/link";

function StatCard({ label, value, sub, icon, color = "text-primary" }: {
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        if (["admin", "kepsek", "super_admin"].includes(user.role)) {
          const res = await api.get("/reports/dashboard");
          setStats(res.data.data);
        } else if (user.role === "guru" || user.role === "wali_kelas") {
          const res = await api.get("/reports/dashboard/guru");
          setStats(res.data.data);
        } else if (user.role === "siswa") {
          const res = await api.get("/reports/dashboard");
          setStats(res.data.data);
        }
      } catch {
        toast.error("Gagal memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ADMIN / KEPSEK
  if (["admin", "kepsek", "super_admin"].includes(user.role)) {
    const COLORS = ["#3b82f6", "#f59e0b", "#6b7280"];
    const barData = [
      { name: "Guru Hadir", val: stats?.guru_hadir_hari_ini || 0 },
      { name: "Guru Absen", val: stats?.guru_tidak_hadir || 0 },
      { name: "Siswa Hadir", val: stats?.siswa_hadir_hari_ini || 0 },
      { name: "Terlambat", val: stats?.siswa_terlambat || 0 },
    ];
    const totalSiswa = stats?.total_siswa || 0;
    const pieData = [
      { name: "Hadir", value: stats?.siswa_hadir_hari_ini || 0 },
      { name: "Terlambat", value: stats?.siswa_terlambat || 0 },
      { name: "Alpa/Izin", value: Math.max(0, totalSiswa - (stats?.siswa_hadir_hari_ini || 0)) },
    ];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Ringkasan</h1>
          <p className="text-muted-foreground text-sm">Monitoring sekolah hari ini — {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Guru" value={stats?.total_guru || 0} sub="Terdaftar aktif" icon={<Users className="h-5 w-5" />} color="text-primary" />
          <StatCard label="Total Siswa" value={stats?.total_siswa || 0} sub="Terdaftar aktif" icon={<GraduationCap className="h-5 w-5" />} color="text-emerald-500" />
          <StatCard label="Jurnal Hari Ini" value={stats?.jurnal_hari_ini || 0} sub="Sudah dikirim guru" icon={<BookOpen className="h-5 w-5" />} color="text-blue-500" />
          <StatCard label="Total Kelas" value={stats?.total_kelas || 0} sub="Rombongan belajar" icon={<School className="h-5 w-5" />} color="text-amber-500" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Guru Hadir Hari Ini" value={stats?.guru_hadir_hari_ini || 0} sub={`dari ${stats?.total_guru || 0} guru`} icon={<CheckCircle className="h-5 w-5" />} color="text-emerald-500" />
          <StatCard label="Guru Tidak Hadir" value={stats?.guru_tidak_hadir || 0} sub="Belum check-in" icon={<XCircle className="h-5 w-5" />} color="text-red-500" />
          <StatCard label="Siswa Hadir" value={stats?.siswa_hadir_hari_ini || 0} sub={`dari ${totalSiswa} siswa`} icon={<Activity className="h-5 w-5" />} color="text-blue-500" />
          <StatCard label="Siswa Terlambat" value={stats?.siswa_terlambat || 0} sub="Hari ini" icon={<Timer className="h-5 w-5" />} color="text-amber-500" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Kehadiran Hari Ini</CardTitle>
              <CardDescription>Perbandingan guru dan siswa</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--tw-prose-body, #fff)', border: '1px solid rgba(128,128,128,0.2)', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'rgba(128,128,128,0.08)' }}
                  />
                  <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Proporsi Siswa</CardTitle>
              <CardDescription>Distribusi kehadiran hari ini</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <SchoolCalendar />
      </div>
    );
  }

  // GURU / WALI KELAS
  if (user.role === "guru" || user.role === "wali_kelas") {
    const sudahCheckIn = stats?.sudah_check_in === true;
    const rate = stats?.kehadiran_rate ?? 0;
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6">
          <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
              <ShieldCheck className="h-3 w-3" /> {user.role === "wali_kelas" ? "Wali Kelas" : "Guru Pengajar"}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Selamat datang kembali, <span className="text-primary">{user.username}</span>!</h1>
            <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jurnal Bulan Ini" value={stats?.jurnal_bulan_ini ?? 0} sub="Entri jurnal mengajar" icon={<BookOpen className="h-5 w-5" />} color="text-primary" />
          <StatCard label="Mengajar Hari Ini" value={stats?.mengajar_hari_ini ?? 0} sub={`Jadwal hari ${stats?.hari_ini || "-"}`} icon={<Calendar className="h-5 w-5" />} color="text-blue-500" />
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">Status Check-In</p>
              {sudahCheckIn ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-lg font-bold text-emerald-500">Sudah Hadir</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{stats?.check_in_time ? `Pukul ${stats.check_in_time} WIB` : "Check-in hari ini"}</p>
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
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">Kehadiran Bulan Ini</p>
              <p className={`text-2xl font-bold ${rate >= 80 ? "text-emerald-500" : rate >= 60 ? "text-amber-500" : "text-red-500"}`}>{rate}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div className={`h-1.5 rounded-full transition-all ${rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.hadir_bulan_ini ?? 0} hari hadir</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Perizinan Pending" value={stats?.perizinan_pending ?? 0} sub="Menunggu persetujuan" icon={<Clipboard className="h-5 w-5" />} color="text-amber-500" />
          <StatCard label="Request Jurnal Mundur" value={stats?.request_pending ?? 0} sub="Menunggu review admin" icon={<Clock className="h-5 w-5" />} color="text-purple-500" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Kelola Pengajaran</CardTitle>
              <CardDescription>Menu pengisian dan riwayat jurnal mengajar harian.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ActionCard href="/dashboard/jurnal" icon={<Clipboard className="h-5 w-5 text-primary" />} title="Isi Jurnal & Absensi Kelas" sub="Catat materi dan kehadiran siswa" />
              <ActionCard href="/dashboard/jurnal" icon={<FileSpreadsheet className="h-5 w-5 text-blue-500" />} title="Lihat Riwayat Jurnal" sub="Semua entri jurnal Anda" />
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-500" /> Perizinan & Kehadiran</CardTitle>
              <CardDescription>Ajukan dan kelola perizinan diri Anda sendiri.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ActionCard href="/dashboard/perizinan" icon={<Briefcase className="h-5 w-5 text-emerald-500" />} title="Ajukan / Kelola Izin Guru" sub="Sakit, cuti, atau dinas luar" />
              <ActionCard href="/dashboard/attendance" icon={<Clock className="h-5 w-5 text-amber-500" />} title="Lihat Riwayat Absensi Saya" sub="Rekap kehadiran bulan ini" />
            </CardContent>
          </Card>
        </div>
        <SchoolCalendar />
      </div>
    );
  }

  // SISWA
  if (user.role === "siswa") {
    const rate = stats?.attendance_rate ?? 0;
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6">
          <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 mb-3">
              <GraduationCap className="h-3 w-3" /> Portal Siswa
            </div>
            <h1 className="text-2xl font-bold text-foreground">Halo, <span className="text-primary">{user.username}</span>!</h1>
            <p className="text-muted-foreground text-sm mt-1">Pantau kehadiran dan perkembangan akademik Anda.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">Kehadiran Bulan Ini</p>
              <p className={`text-2xl font-bold ${rate >= 80 ? "text-emerald-500" : rate >= 60 ? "text-amber-500" : "text-red-500"}`}>{rate}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2 mb-1">
                <div className={`h-1.5 rounded-full ${rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{rate >= 80 ? "Sangat Baik" : rate >= 60 ? "Perlu Ditingkatkan" : "Perhatian Khusus"}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">Poin Pelanggaran</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold text-amber-500">{stats?.violation_points ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{stats?.violations ?? 0} catatan · batas 100 poin</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">Prestasi Tercatat</p>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-500">{stats?.prestasi ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(stats?.perizinan_pending ?? 0) > 0 ? `${stats.perizinan_pending} perizinan pending` : "Tidak ada izin pending"}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Menu Mandiri</CardTitle>
            <CardDescription>Akses absensi atau perizinan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ActionCard href="/dashboard/attendance" icon={<Clock className="h-5 w-5 text-emerald-500" />} title="QR Code Absensi" sub="Tunjukkan saat check-in gerbang" />
            <ActionCard href="/dashboard/perizinan" icon={<FileSpreadsheet className="h-5 w-5 text-primary" />} title="Ajukan Izin" sub="Kirim perizinan ke BK / wali kelas" />
          </CardContent>
        </Card>
        <SchoolCalendar />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Selamat datang, {user.username}!</h1>
      <SchoolCalendar />
    </div>
  );
}
