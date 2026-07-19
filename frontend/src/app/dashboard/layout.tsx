"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { 
  GraduationCap, 
  LayoutDashboard, 
  Database, 
  BookOpen, 
  Clock, 
  HeartHandshake, 
  FileCheck, 
  BarChart3, 
  LogOut, 
  User, 
  Menu, 
  X,
  Bell,
  Settings,
  ChevronDown,
  FileBarChart2,
  FileUp,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarItem {
  title: string;
  href: string;
  icon: any;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin", "guru", "guru_bk", "counselor", "wali_kelas", "kepsek", "siswa", "orang_tua"],
  },
  {
    title: "Data Master",
    href: "/dashboard/master",
    icon: Database,
    roles: ["super_admin", "admin", "kepsek"],
  },
  {
    title: "Jurnal Mengajar",
    href: "/dashboard/jurnal",
    icon: BookOpen,
    roles: ["super_admin", "admin", "guru", "wali_kelas"],
  },
  {
    title: "Import Data",
    href: "/dashboard/import",
    icon: FileUp,
    roles: ["super_admin", "admin"],
  },
  {
    title: "Absensi & QR",
    href: "/dashboard/attendance",
    icon: Clock,
    roles: ["super_admin", "admin", "guru", "siswa", "orang_tua", "kepsek"],
  },
  {
    title: "Bimbingan BK",
    href: "/dashboard/bk",
    icon: HeartHandshake,
    roles: ["super_admin", "admin", "guru_bk", "counselor", "siswa", "orang_tua"],
  },
  {
    title: "Perizinan",
    href: "/dashboard/perizinan",
    icon: FileCheck,
    roles: ["super_admin", "admin", "guru", "siswa", "guru_bk", "wali_kelas", "kepsek"],
  },
  {
    title: "Penilaian",
    href: "/dashboard/nilai",
    icon: Star,
    roles: ["super_admin", "admin", "guru", "wali_kelas", "siswa"],
  },
  {
    title: "Laporan & Log",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["super_admin", "admin", "kepsek"],
  },
  {
    title: "Pengaturan",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["super_admin", "admin"],
  },
  {
    title: "Profil Saya",
    href: "/dashboard/profile",
    icon: User,
    roles: ["super_admin", "admin", "guru", "guru_bk", "counselor", "wali_kelas", "kepsek", "siswa", "orang_tua"],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [masterOpen, setMasterOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [bkOpen, setBkOpen] = useState(false);
  const [perizinanOpen, setPerizinanOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/pesan/inbox");
      const inbox = res.data.data || [];
      setUnreadCount(inbox.filter((p: any) => !p.is_read).length);
    } catch {}
  }, []);

  useEffect(() => {
    if (mounted && accessToken) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted, accessToken, fetchUnread]);

  // Buka sub-menu otomatis jika sedang di halaman master
  useEffect(() => {
    if (pathname.startsWith("/dashboard/master")) {
      setMasterOpen(true);
    }
  }, [pathname]);

  // Buka sub-menu BK otomatis
  useEffect(() => {
    if (pathname.startsWith("/dashboard/bk")) {
      setBkOpen(true);
    }
  }, [pathname]);

  // Buka sub-menu reports otomatis
  useEffect(() => {
    if (pathname.startsWith("/dashboard/reports")) {
      setReportsOpen(true);
    }
  }, [pathname]);

  // Buka sub-menu perizinan otomatis
  useEffect(() => {
    if (pathname.startsWith("/dashboard/perizinan")) {
      setPerizinanOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Role-based dashboard redirect
  useEffect(() => {
    if (mounted && user && pathname === "/dashboard") {
      if (user.role === "guru" || user.role === "wali_kelas") {
        router.push("/dashboard/guru");
      } else if (user.role === "siswa") {
        router.push("/dashboard/siswa");
      } else if (user.role === "orang_tua") {
        router.push("/dashboard/orang-tua");
      } else if (user.role === "kepsek") {
        router.push("/dashboard/kepsek");
      }
    }
  }, [mounted, user, pathname, router]);

  useEffect(() => {
    if (mounted && !accessToken) {
      router.replace("/login");
    }
  }, [mounted, accessToken, router]);

  // Role-based route guard check
  useEffect(() => {
    if (mounted && user && pathname !== "/dashboard") {
      const currentItem = sidebarItems.find(item => item.href !== "/dashboard" && (pathname === item.href || pathname.startsWith(item.href + "/")));
      if (currentItem && !currentItem.roles.includes(user.role)) {
        toast.error("Anda tidak memiliki akses ke halaman ini.");
        
        // Redirect to their respective correct dashboard instead of generic dashboard
        if (user.role === "guru" || user.role === "wali_kelas") {
          router.replace("/dashboard/guru");
        } else if (user.role === "siswa") {
          router.replace("/dashboard/siswa");
        } else if (user.role === "orang_tua") {
          router.replace("/dashboard/orang-tua");
        } else if (user.role === "kepsek") {
          router.replace("/dashboard/kepsek");
        } else {
          router.replace("/dashboard");
        }
      }
    }
  }, [mounted, user, pathname, router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Skeleton Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border/30 shrink-0">
          <div className="h-16 flex items-center px-6 gap-3 border-b border-border/20">
            <div className="w-6 h-6 rounded bg-primary/20 animate-pulse" />
            <div className="h-4 w-28 rounded bg-foreground/10 animate-pulse" />
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-foreground/5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </nav>
        </aside>
        {/* Skeleton Main */}
        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-card/80 border-b border-border/30 flex items-center px-6 gap-4">
            <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse" />
            <div className="ml-auto flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-foreground/10 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-foreground/10 animate-pulse" />
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="space-y-4">
              <div className="h-8 w-48 rounded-lg bg-foreground/10 animate-pulse" />
              <div className="h-4 w-72 rounded bg-foreground/5 animate-pulse" />
              <div className="mt-6 h-64 rounded-xl bg-foreground/5 animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Filter sidebar items by user role
  const filteredItems = sidebarItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const getRoleLabel = (role: string) => {
    const rolesMap: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Administrator",
      guru: "Guru",
      guru_bk: "Guru BK",
      counselor: "Konselor",
      wali_kelas: "Wali Kelas",
      kepsek: "Kepala Sekolah",
      siswa: "Siswa",
      orang_tua: "Orang Tua",
    };
    return rolesMap[role] || role;
  };

  return (
    <div className="min-h-screen flex bg-background dashboard-enter">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border/30 shrink-0">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-border/20">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground tracking-wider">JURNAL APPS</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const isMaster = item.href === "/dashboard/master";

            const masterSubItems = [
              { label: "Jurusan", tab: "jurusan" },
              { label: "Kelas", tab: "kelas" },
              { label: "Mata Pelajaran", tab: "mapel" },
              { label: "Guru", tab: "guru" },
              { label: "Siswa", tab: "siswa" },
              { label: "Jadwal Mengajar", tab: "mengajar" },
            ];

            const isReports = item.href === "/dashboard/reports";
            const isBk = item.href === "/dashboard/bk";
            const isPerizinan = item.href === "/dashboard/perizinan";

            const perizinanSubItems = [
              { label: "Izin Siswa", href: "/dashboard/perizinan" },
              { label: "Izin Guru", href: "/dashboard/perizinan/guru" },
              { label: "Persetujuan", href: "/dashboard/perizinan/persetujuan" },
            ];

            const reportsSubItems = [
              { label: "Log Aktivitas", href: "/dashboard/reports" },
              { label: "Rekap Jurnal Guru", href: "/dashboard/reports/rekap-guru" },
            ];

            const bkSubItems = [
              { label: "Sesi Konseling", href: "/dashboard/bk" },
              { label: "Pelanggaran & Poin", href: "/dashboard/bk/pelanggaran" },
              { label: "Prestasi", href: "/dashboard/bk/prestasi" },
              { label: "Hasil Psikotes", href: "/dashboard/bk/psikotes" },
              { label: "Proyek BK", href: "/dashboard/bk/proyek" },
            ];

            return (
              <div key={item.href}>
                {isMaster ? (
                  <button
                    onClick={() => setMasterOpen((prev) => !prev)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-gray-400 hover:bg-accent/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${masterOpen ? "rotate-180" : ""} ${isActive ? "text-white/70" : ""}`} />
                  </button>
                ) : isReports ? (
                  <button
                    onClick={() => setReportsOpen((prev) => !prev)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-gray-400 hover:bg-accent/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${reportsOpen ? "rotate-180" : ""} ${isActive ? "text-white/70" : ""}`} />
                  </button>
                ) : isBk ? (
                  <button
                    onClick={() => setBkOpen((prev) => !prev)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-gray-400 hover:bg-accent/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${bkOpen ? "rotate-180" : ""} ${isActive ? "text-white/70" : ""}`} />
                  </button>
                ) : isPerizinan ? (
                  <button
                    onClick={() => setPerizinanOpen((prev) => !prev)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-gray-400 hover:bg-accent/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${perizinanOpen ? "rotate-180" : ""} ${isActive ? "text-white/70" : ""}`} />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-gray-400 hover:bg-accent/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{item.title}</span>
                  </a>
                )}
                {isMaster && masterOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border/20 space-y-0.5">
                    {masterSubItems.map((sub) => {
                      const currentTab = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab") || "jurusan";
                      const isSubActive = currentTab === sub.tab;
                      return (
                        <a
                          key={sub.tab}
                          href={`/dashboard/master?tab=${sub.tab}`}
                          className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isSubActive
                              ? "bg-primary/15 text-primary"
                              : "text-gray-500 hover:bg-accent/50 hover:text-gray-200"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? "bg-primary" : "bg-gray-600"}`} />
                          {sub.label}
                        </a>
                      );
                    })}
                  </div>
                )}
                {isReports && reportsOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border/20 space-y-0.5">
                    {reportsSubItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isSubActive
                              ? "bg-primary/15 text-primary"
                              : "text-gray-500 hover:bg-accent/50 hover:text-gray-200"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? "bg-primary" : "bg-gray-600"}`} />
                          {sub.label}
                        </a>
                      );
                    })}
                  </div>
                )}
                {isBk && bkOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border/20 space-y-0.5">
                    {bkSubItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isSubActive
                              ? "bg-primary/15 text-primary"
                              : "text-gray-500 hover:bg-accent/50 hover:text-gray-200"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? "bg-primary" : "bg-gray-600"}`} />
                          {sub.label}
                        </a>
                      );
                    })}
                  </div>
                )}
                {isPerizinan && perizinanOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border/20 space-y-0.5">
                    {perizinanSubItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isSubActive
                              ? "bg-primary/15 text-primary"
                              : "text-gray-500 hover:bg-accent/50 hover:text-gray-200"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? "bg-primary" : "bg-gray-600"}`} />
                          {sub.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/20">
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:bg-destructive/10 hover:text-destructive gap-3 rounded-xl py-5"
          >
            <LogOut className="h-5 w-5" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-card border-r border-border/30 h-full">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border/20">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                <span className="font-bold text-foreground tracking-wider">JURNAL APPS</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {filteredItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const isMaster    = item.href === "/dashboard/master";
                const isReports   = item.href === "/dashboard/reports";
                const isBk        = item.href === "/dashboard/bk";
                const isPerizinan = item.href === "/dashboard/perizinan";

                const masterSubItems = [
                  { label: "Jurusan", tab: "jurusan" },
                  { label: "Kelas", tab: "kelas" },
                  { label: "Mata Pelajaran", tab: "mapel" },
                  { label: "Guru", tab: "guru" },
                  { label: "Siswa", tab: "siswa" },
                  { label: "Jadwal Mengajar", tab: "mengajar" },
                ];

                const bkSubItems = [
                  { label: "Sesi Konseling",   href: "/dashboard/bk" },
                  { label: "Pelanggaran & Poin", href: "/dashboard/bk/pelanggaran" },
                  { label: "Prestasi",          href: "/dashboard/bk/prestasi" },
                  { label: "Hasil Psikotes",    href: "/dashboard/bk/psikotes" },
                  { label: "Proyek BK",         href: "/dashboard/bk/proyek" },
                ];

                const perizinanSubItems = [
                  { label: "Izin Siswa",  href: "/dashboard/perizinan" },
                  { label: "Izin Guru",   href: "/dashboard/perizinan/guru" },
                  { label: "Persetujuan", href: "/dashboard/perizinan/persetujuan" },
                ];

                const reportsSubItems = [
                  { label: "Log Aktivitas",    href: "/dashboard/reports" },
                  { label: "Rekap Jurnal Guru", href: "/dashboard/reports/rekap-guru" },
                ];

                const hasSubMenu = isMaster || isReports || isBk || isPerizinan;
                const subOpen =
                  isMaster ? masterOpen :
                  isReports ? reportsOpen :
                  isBk ? bkOpen :
                  isPerizinan ? perizinanOpen : false;
                const toggleSub = () => {
                  if (isMaster)    setMasterOpen(v => !v);
                  else if (isReports)   setReportsOpen(v => !v);
                  else if (isBk)        setBkOpen(v => !v);
                  else if (isPerizinan) setPerizinanOpen(v => !v);
                };
                const subItems =
                  isMaster ? [] :
                  isReports ? reportsSubItems :
                  isBk ? bkSubItems :
                  isPerizinan ? perizinanSubItems : [];

                return (
                  <div key={item.href}>
                    {hasSubMenu ? (
                      <button
                        onClick={toggleSub}
                        className={`w-full flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "text-gray-400 hover:bg-accent/50 hover:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${subOpen ? "rotate-180" : ""} ${isActive ? "text-white/70" : ""}`} />
                      </button>
                    ) : (
                      <a
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "text-gray-400 hover:bg-accent/50 hover:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.title}</span>
                      </a>
                    )}

                    {/* Master sub-items (tab-based) */}
                    {isMaster && masterOpen && (
                      <div className="mt-1 ml-4 pl-4 border-l border-border/20 space-y-0.5">
                        {masterSubItems.map((sub) => {
                          const currentTab = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab") || "jurusan";
                          const isSubActive = currentTab === sub.tab;
                          return (
                            <a
                              key={sub.tab}
                              href={`/dashboard/master?tab=${sub.tab}`}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                                isSubActive ? "bg-primary/15 text-primary" : "text-gray-500 hover:bg-accent/50 hover:text-gray-200"
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? "bg-primary" : "bg-gray-600"}`} />
                              {sub.label}
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* href-based sub-items (BK, Perizinan, Laporan) */}
                    {!isMaster && hasSubMenu && subOpen && (
                      <div className="mt-1 ml-4 pl-4 border-l border-border/20 space-y-0.5">
                        {subItems.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <a
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                                isSubActive ? "bg-primary/15 text-primary" : "text-gray-500 hover:bg-accent/50 hover:text-gray-200"
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? "bg-primary" : "bg-gray-600"}`} />
                              {sub.label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border/20">
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full justify-start text-gray-400 hover:bg-destructive/10 hover:text-destructive gap-3 rounded-xl py-5"
              >
                <LogOut className="h-5 w-5" />
                Keluar
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-card/80 border-b border-border/30 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="hidden md:block text-lg font-semibold text-white">
              {pathname === "/dashboard" ? "Beranda" : filteredItems.find(item => item.href !== "/dashboard" && pathname.startsWith(item.href))?.title || "Sistem"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white" onClick={() => { router.push("/dashboard/inbox"); setUnreadCount(0); }}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
            
            <a
              href="/dashboard/profile"
              className="flex items-center gap-3 cursor-pointer hover:bg-foreground/5 p-1 px-2 rounded-xl transition-all"
            >
              <Avatar className="h-8 w-8 bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                {user.username.substring(0, 2).toUpperCase()}
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground">{user.username}</p>
                <p className="text-[10px] text-muted-foreground">{getRoleLabel(user.role)}</p>
              </div>
            </a>
          </div>
        </header>

        {/* Content Body */}
        <main className="grow p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
