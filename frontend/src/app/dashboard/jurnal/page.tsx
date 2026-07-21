"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BookOpen, Plus, Clock, Send, ListChecks, AlertCircle,
  Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  RefreshCw, ClipboardList, BookMarked, Users, CalendarDays,
  FileText, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Mengajar {
  id: number;
  hari: string;
  jam_ke: string;
  kelas_id?: number;
  tahun_ajaran?: string;
  semester?: string;
  mapel?: { id?: number; nama_mapel: string };
  kelas?: { id?: number; nama_kelas: string };
}

interface PresensiItem {
  siswa_id: number;
  nama?: string;
  nis?: string;
  status_kehadiran: "H" | "S" | "I" | "A";
  keterangan: string;
}

interface Jurnal {
  id: number;
  tanggal: string;
  jam_ke: string;
  topik_materi: string;
  catatan_guru: string;
  mengajar?: {
    mapel?: { nama_mapel: string };
    kelas?: { nama_kelas: string };
    hari?: string;
    guru?: { nama: string };
  };
  created_at: string;
}

interface RequestMundur {
  id: number;
  tanggal_jurnal: string;
  alasan: string;
  status: "pending" | "approved" | "rejected";
  admin_catatan?: string;
  created_at: string;
  guru?: { nama: string; nip: string };
  mengajar?: { hari: string; mapel?: { nama_mapel: string }; kelas?: { nama_kelas: string } };
}

type NavTab = "riwayat" | "isi_jurnal" | "beban_mengajar" | "request_mundur" | "review_request";

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
};

const KEHADIRAN_ACTIVE: Record<string, string> = {
  H: "bg-emerald-500 text-white border-emerald-600 shadow-sm",
  S: "bg-amber-500 text-white border-amber-600 shadow-sm",
  I: "bg-blue-500 text-white border-blue-600 shadow-sm",
  A: "bg-red-500 text-white border-red-600 shadow-sm",
};

const KEHADIRAN_INACTIVE = "bg-muted text-muted-foreground border-border hover:bg-muted/70";

const KEHADIRAN_LABEL: Record<string, string> = {
  H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function JurnalPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<NavTab>("riwayat");
  // Admin-only filter states
  const [filterGuruID, setFilterGuruID] = useState("");
  const [filterKelasID, setFilterKelasID] = useState("");
  const [guruList, setGuruList] = useState<{ id: number; nama: string }[]>([]);
  const [kelasList, setKelasList] = useState<{ id: number; nama_kelas: string }[]>([]);

  // Riwayat state
  const [jurnalList, setJurnalList] = useState<Jurnal[]>([]);
  const [jurnalLoading, setJurnalLoading] = useState(false);
  const [jurnalPage, setJurnalPage] = useState(1);
  const [jurnalTotal, setJurnalTotal] = useState(0);
  const [jurnalTotalPages, setJurnalTotalPages] = useState(1);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Mengajar state
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([]);

  // Isi Jurnal form state
  const [selectedMengajar, setSelectedMengajar] = useState<Mengajar | null>(null);
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [formJamKe, setFormJamKe] = useState("");
  const [formTopik, setFormTopik] = useState("");
  const [formCatatan, setFormCatatan] = useState("");
  const [presensi, setPresensi] = useState<PresensiItem[]>([]);
  const [presensiLoading, setPresensiLoading] = useState(false);
  const [dayWarning, setDayWarning] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Request mundur state
  const [requestList, setRequestList] = useState<RequestMundur[]>([]);
  const [reqMengajarID, setReqMengajarID] = useState("");
  const [reqTanggal, setReqTanggal] = useState("");
  const [reqAlasan, setReqAlasan] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  // Admin review state
  const [allRequestList, setAllRequestList] = useState<RequestMundur[]>([]);
  const [reviewCatatan, setReviewCatatan] = useState<Record<number,string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<number,boolean>>({});

  // Presensi detail dialog
  const [presensiDialogOpen, setPresensiDialogOpen] = useState(false);
  const [selectedJurnalID, setSelectedJurnalID] = useState<number | null>(null);
  const [presensiDetail, setPresensiDetail] = useState<PresensiItem[]>([]);

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchJurnal = useCallback(async () => {
    setJurnalLoading(true);
    try {
      const params = new URLSearchParams({ page: String(jurnalPage), limit: "15" });
      if (filterStart) params.set("start_date", filterStart);
      if (filterEnd) params.set("end_date", filterEnd);
      if (filterGuruID) params.set("guru_id", filterGuruID);
      if (filterKelasID) params.set("kelas_id", filterKelasID);
      const res = await api.get(`/jurnal?${params}`);
      setJurnalList(res.data.data || []);
      const meta = res.data.meta || {};
      setJurnalTotal(meta.total || 0);
      setJurnalTotalPages(meta.total_pages || meta.totalPages || 1);
    } catch {
      toast.error("Gagal memuat riwayat jurnal");
    } finally {
      setJurnalLoading(false);
    }
  }, [jurnalPage, filterStart, filterEnd, filterGuruID, filterKelasID]);

  const fetchMengajar = useCallback(async () => {
    try {
      const res = await api.get("/master/mengajar?limit=200");
      setMengajarList(res.data.data || []);
    } catch {
      toast.error("Gagal memuat data mengajar");
    }
  }, []);

  const loadSiswaForKelas = useCallback(async (kelasID: number) => {
    setPresensiLoading(true);
    try {
      const res = await api.get(`/master/siswa?kelas_id=${kelasID}&limit=200&status=Aktif`);
      const list = (res.data.data || []) as { id: number; nama: string; nis: string }[];
      if (list.length === 0) {
        toast.warning("Tidak ada siswa aktif di kelas ini");
      }
      setPresensi(
        list.map((s) => ({
          siswa_id: s.id,
          nama: s.nama,
          nis: s.nis,
          status_kehadiran: "H" as const,
          keterangan: "",
        }))
      );
    } catch {
      toast.error("Gagal memuat daftar siswa");
      setPresensi([]);
    } finally {
      setPresensiLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get("/jurnal/request-mundur?limit=20");
      setRequestList(res.data.data || []);
    } catch {
      toast.error("Gagal memuat request mundur");
    }
  }, []);

  const fetchAllRequests = useCallback(async () => {
    try {
      const res = await api.get("/jurnal/request-mundur?limit=100");
      setAllRequestList(res.data.data || []);
    } catch {
      toast.error("Gagal memuat semua request");
    }
  }, []);

  const handleReview = async (id: number, status: "approved" | "rejected") => {
    setReviewLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.put(`/jurnal/request-mundur/${id}/review`, {
        status,
        admin_catatan: reviewCatatan[id] || "",
      });
      toast.success(status === "approved" ? "Request disetujui! Guru akan mendapat notifikasi." : "Request ditolak.");
      fetchAllRequests();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal memproses review");
    } finally {
      setReviewLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin) {
      api.get("/master/guru?limit=200").then(r => setGuruList(r.data.data || [])).catch(() => {});
      api.get("/master/kelas?limit=200").then(r => setKelasList(r.data.data || [])).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === "riwayat") fetchJurnal();
  }, [activeTab, fetchJurnal]);

  useEffect(() => {
    if (["isi_jurnal", "beban_mengajar", "request_mundur"].includes(activeTab)) {
      fetchMengajar();
    }
  }, [activeTab, fetchMengajar]);

  useEffect(() => {
    if (activeTab === "request_mundur") fetchRequests();
  }, [activeTab, fetchRequests]);

  useEffect(() => {
    if (activeTab === "review_request") fetchAllRequests();
  }, [activeTab, fetchAllRequests]);

  // When jadwal mengajar is selected
  useEffect(() => {
    if (!selectedMengajar) {
      setPresensi([]);
      setDayWarning(null);
      return;
    }

    // Auto-fill jam_ke from jadwal
    if (selectedMengajar.jam_ke) setFormJamKe(selectedMengajar.jam_ke);

    // Load siswa dari kelas
    const kelasID = selectedMengajar.kelas_id || selectedMengajar.kelas?.id;
    if (kelasID) {
      loadSiswaForKelas(kelasID);
    } else {
      toast.warning("Kelas tidak ditemukan untuk jadwal ini");
    }

    // Day warning
    if (formTanggal) {
      const dayIdx = new Date(formTanggal + "T00:00:00").getDay();
      const hariMap = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
      const inputHari = hariMap[dayIdx];
      if (
        selectedMengajar.hari &&
        selectedMengajar.hari.toLowerCase() !== inputHari.toLowerCase()
      ) {
        setDayWarning(
          `Perhatian: Jadwal ini untuk hari ${selectedMengajar.hari}, namun tanggal yang dipilih adalah ${inputHari}.`
        );
      } else {
        setDayWarning(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMengajar, formTanggal]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMengajarSelect = (value: string) => {
    const mg = mengajarList.find((m) => String(m.id) === value);
    setSelectedMengajar(mg || null);
    setFormJamKe("");
  };

  const updatePresensiStatus = (siswaId: number, status: "H" | "S" | "I" | "A") => {
    setPresensi((prev) =>
      prev.map((p) => p.siswa_id === siswaId ? { ...p, status_kehadiran: status } : p)
    );
  };

  const updatePresensiKeterangan = (siswaId: number, ket: string) => {
    setPresensi((prev) =>
      prev.map((p) => p.siswa_id === siswaId ? { ...p, keterangan: ket } : p)
    );
  };

  const setAllStatus = (status: "H" | "S" | "I" | "A") => {
    setPresensi((prev) => prev.map((p) => ({ ...p, status_kehadiran: status })));
  };

  const handleSubmitJurnal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMengajar) { toast.error("Pilih jadwal mengajar terlebih dahulu"); return; }
    if (!formTanggal) { toast.error("Pilih tanggal"); return; }
    if (!formJamKe.trim()) { toast.error("Isi jam ke"); return; }
    if (!formTopik.trim()) { toast.error("Isi topik/materi"); return; }

    setSubmitLoading(true);
    try {
      await api.post("/jurnal", {
        mengajar_id: selectedMengajar.id,
        tanggal: formTanggal,
        jam_ke: formJamKe.trim(),
        topik_materi: formTopik,
        catatan_guru: formCatatan,
        presensi: presensi.map((p) => ({
          siswa_id: p.siswa_id,
          status_kehadiran: p.status_kehadiran,
          keterangan: p.keterangan,
        })),
      });
      toast.success("Jurnal berhasil disimpan!");
      // Reset form
      setSelectedMengajar(null);
      setFormTanggal(new Date().toISOString().split("T")[0]);
      setFormJamKe("");
      setFormTopik("");
      setFormCatatan("");
      setPresensi([]);
      setActiveTab("riwayat");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menyimpan jurnal";
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteJurnal = async (id: number) => {
    if (!confirm("Hapus jurnal ini?")) return;
    try {
      await api.delete(`/jurnal/${id}`);
      toast.success("Jurnal dihapus");
      fetchJurnal();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus"
      );
    }
  };

  const handleViewPresensi = async (jurnalID: number) => {
    setSelectedJurnalID(jurnalID);
    setPresensiDialogOpen(true);
    try {
      const res = await api.get(`/jurnal/${jurnalID}/presensi`);
      setPresensiDetail(res.data.data || []);
    } catch {
      setPresensiDetail([]);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqMengajarID || !reqTanggal || !reqAlasan.trim()) {
      toast.error("Lengkapi semua field");
      return;
    }
    setRequestLoading(true);
    try {
      await api.post("/jurnal/request-mundur", {
        mengajar_id: Number(reqMengajarID),
        tanggal_jurnal: reqTanggal,
        alasan: reqAlasan,
      });
      toast.success("Request berhasil diajukan!");
      setReqMengajarID("");
      setReqTanggal("");
      setReqAlasan("");
      fetchRequests();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal mengajukan request"
      );
    } finally {
      setRequestLoading(false);
    }
  };

  // ── Counts for summary ─────────────────────────────────────────────────────
  const countHadir = presensi.filter((p) => p.status_kehadiran === "H").length;
  const countAlpha = presensi.filter((p) => p.status_kehadiran === "A").length;
  const countSakit = presensi.filter((p) => p.status_kehadiran === "S").length;
  const countIzin = presensi.filter((p) => p.status_kehadiran === "I").length;

  // ── Nav items ──────────────────────────────────────────────────────────────
  const allNavItems: { key: NavTab; label: string; icon: React.ReactNode; guruOnly?: boolean; adminOnly?: boolean }[] = [
    { key: "riwayat", label: "Riwayat Jurnal", icon: <ListChecks className="w-4 h-4" /> },
    { key: "isi_jurnal", label: "Isi Jurnal Baru", icon: <Plus className="w-4 h-4" />, guruOnly: true },
    { key: "beban_mengajar", label: "Beban Mengajar", icon: <BookMarked className="w-4 h-4" />, guruOnly: true },
    { key: "request_mundur", label: "Request Mundur", icon: <ClipboardList className="w-4 h-4" />, guruOnly: true },
    { key: "review_request", label: "Review Request Mundur", icon: <ClipboardList className="w-4 h-4" />, adminOnly: true },
  ];
  const navItems = allNavItems.filter(i => {
    if (i.adminOnly) return isAdmin;
    if (i.guruOnly) return !isAdmin;
    return true;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jurnal Mengajar</h1>
          <p className="text-muted-foreground">Kelola jurnal kegiatan belajar mengajar harian</p>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex gap-1 p-1.5 bg-muted/60 rounded-2xl w-fit border border-border/50">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === item.key
                ? "bg-background text-foreground shadow-md ring-1 ring-border/30"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: RIWAYAT JURNAL
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "riwayat" && (
        <div className="space-y-5">
          {/* Filter row */}
          <div className="flex gap-4 items-end flex-wrap p-4 bg-card rounded-2xl border border-border">
            {isAdmin && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Guru</Label>
                  <Select value={filterGuruID || "all"} onValueChange={(v) => setFilterGuruID(v === "all" ? "" : (v ?? ""))}>
                    <SelectTrigger className="h-10 w-48">
                      <SelectValue>{filterGuruID ? (guruList.find(g => String(g.id) === filterGuruID)?.nama || "Semua Guru") : "Semua Guru"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
          <SelectGroup>
                      <SelectItem value="all">Semua Guru</SelectItem>
                      {guruList.map(g => <SelectItem key={g.id} value={String(g.id)} label={g.nama}>{g.nama}</SelectItem>)}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Kelas</Label>
                  <Select value={filterKelasID || "all"} onValueChange={(v) => setFilterKelasID(v === "all" ? "" : (v ?? ""))}>
                    <SelectTrigger className="h-10 w-44">
                      <SelectValue>{filterKelasID ? (kelasList.find(k => String(k.id) === filterKelasID)?.nama_kelas || "Semua Kelas") : "Semua Kelas"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
          <SelectGroup>
                      <SelectItem value="all">Semua Kelas</SelectItem>
                      {kelasList.map(k => <SelectItem key={k.id} value={String(k.id)} label={k.nama_kelas}>{k.nama_kelas}</SelectItem>)}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Dari Tanggal</Label>
              <Input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="h-10 w-48"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sampai Tanggal</Label>
              <Input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="h-10 w-48"
              />
            </div>
            <Button onClick={() => { setJurnalPage(1); fetchJurnal(); }} className="h-10 gap-2">
              <RefreshCw className="w-4 h-4" /> Filter
            </Button>
            {(filterStart || filterEnd || filterGuruID || filterKelasID) && (
              <Button variant="outline" className="h-10" onClick={() => { setFilterStart(""); setFilterEnd(""); setFilterGuruID(""); setFilterKelasID(""); }}>
                Reset
              </Button>
            )}
            <div className="ml-auto text-sm text-muted-foreground self-center">
              Total: <span className="font-semibold text-foreground">{jurnalTotal}</span> jurnal
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-4 pl-6 font-semibold">Tanggal</TableHead>
                  {isAdmin && <TableHead className="py-4 font-semibold">Guru</TableHead>}
                  <TableHead className="py-4 font-semibold">Mata Pelajaran</TableHead>
                  <TableHead className="py-4 font-semibold">Kelas</TableHead>
                  <TableHead className="py-4 font-semibold">Jam Ke</TableHead>
                  <TableHead className="py-4 font-semibold">Topik Materi</TableHead>
                  <TableHead className="py-4 font-semibold">Catatan Guru</TableHead>
                  <TableHead className="py-4 pr-6 text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jurnalLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-16">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : jurnalList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-16">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Belum ada jurnal</p>
                      {!isAdmin && <p className="text-sm mt-1">Mulai isi jurnal baru dengan klik tab &ldquo;Isi Jurnal Baru&rdquo;</p>}
                    </TableCell>
                  </TableRow>
                ) : (
                  jurnalList.map((j) => (
                    <TableRow key={j.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-muted-foreground" />
                          {new Date(j.tanggal).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-4">
                          <span className="text-sm font-medium">{j.mengajar?.guru?.nama ?? "-"}</span>
                        </TableCell>
                      )}
                      <TableCell className="py-4">
                        <span className="font-medium">{j.mengajar?.mapel?.nama_mapel ?? "-"}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary" className="font-normal">
                          {j.mengajar?.kelas?.nama_kelas ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="font-medium">
                          <Clock className="w-3 h-3 mr-1" />Jam {j.jam_ke}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 max-w-60">
                        <p className="truncate">{j.topik_materi}</p>
                      </TableCell>
                      <TableCell className="py-4 max-w-[180px] text-muted-foreground">
                        <p className="truncate">{j.catatan_guru || "-"}</p>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => handleViewPresensi(j.id)}
                          >
                            <Users className="w-3.5 h-3.5" /> Presensi
                          </Button>
                          {!isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteJurnal(j.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {jurnalTotalPages > 1 && (
            <div className="flex justify-center gap-2 items-center py-2">
              <Button
                variant="outline"
                size="sm"
                disabled={jurnalPage <= 1}
                onClick={() => setJurnalPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Halaman <span className="font-semibold text-foreground">{jurnalPage}</span> / {jurnalTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={jurnalPage >= jurnalTotalPages}
                onClick={() => setJurnalPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ISI JURNAL BARU
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "isi_jurnal" && (
        <form onSubmit={handleSubmitJurnal} className="space-y-6">
          {/* Section 1: Informasi Jurnal */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                Informasi Jurnal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Row 1: Jadwal + Tanggal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Jadwal Mengajar <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedMengajar ? String(selectedMengajar.id) : ""}
                    onValueChange={(v) => handleMengajarSelect(v ?? "")}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="— Pilih jadwal mengajar —">
                        {selectedMengajar
                          ? `${selectedMengajar.hari} — ${selectedMengajar.mapel?.nama_mapel} (${selectedMengajar.kelas?.nama_kelas}) Jam ${selectedMengajar.jam_ke}`
                          : "— Pilih jadwal mengajar —"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
          <SelectGroup>
                      {[...mengajarList]
                        .sort((a, b) => HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari))
                        .map((m) => (
                          <SelectItem key={m.id} value={String(m.id)} label={m.hari}>
                            <span className="font-medium">{m.hari}</span>
                            {" — "}
                            {m.mapel?.nama_mapel}
                            {" ("}
                            {m.kelas?.nama_kelas}
                            {") Jam "}
                            {m.jam_ke}
                          </SelectItem>
                        ))}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                  {selectedMengajar && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {selectedMengajar.mapel?.nama_mapel} · {selectedMengajar.kelas?.nama_kelas} · Semester {selectedMengajar.semester} · {selectedMengajar.tahun_ajaran}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Tanggal <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Day Warning */}
              {dayWarning && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">{dayWarning}</p>
                </div>
              )}

              {/* Row 2: Jam Ke */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Jam Ke <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder='contoh: 1  atau  1-3'
                    value={formJamKe}
                    onChange={(e) => setFormJamKe(e.target.value)}
                    className="h-11 w-48"
                  />
                  <p className="text-sm text-muted-foreground">
                    Tulis <code className="bg-muted px-1 rounded text-xs">1</code> untuk 1 jam pelajaran,
                    atau <code className="bg-muted px-1 rounded text-xs">1-3</code> untuk jam ke-1 sampai ke-3
                  </p>
                </div>
              </div>

              {/* Row 3: Topik */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Topik / Materi <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Tulis topik atau materi pembelajaran yang disampaikan pada pertemuan ini..."
                  rows={4}
                  value={formTopik}
                  onChange={(e) => setFormTopik(e.target.value)}
                  className="resize-none"
                />
              </div>

              {/* Row 4: Catatan */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Catatan Guru</Label>
                <Textarea
                  placeholder="Catatan tambahan, kendala, atau hal-hal yang perlu diperhatikan... (opsional)"
                  rows={3}
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Presensi Siswa */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  Presensi Siswa
                  {presensi.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-sm font-normal">
                      {presensi.length} siswa
                    </Badge>
                  )}
                </CardTitle>

                {/* Quick set all buttons */}
                {presensi.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">Set semua:</span>
                    {(["H","S","I","A"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAllStatus(s)}
                        className={`h-7 w-8 rounded border text-xs font-bold transition-all ${KEHADIRAN_ACTIVE[s]}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary badges */}
              {presensi.length > 0 && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-muted-foreground">Hadir:</span>
                    <span className="font-semibold text-emerald-600">{countHadir}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-muted-foreground">Sakit:</span>
                    <span className="font-semibold text-amber-600">{countSakit}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-muted-foreground">Izin:</span>
                    <span className="font-semibold text-blue-600">{countIzin}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-muted-foreground">Alpha:</span>
                    <span className="font-semibold text-red-600">{countAlpha}</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0 px-0">
              {!selectedMengajar ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Pilih jadwal mengajar terlebih dahulu</p>
                  <p className="text-sm mt-1">Daftar siswa akan otomatis tampil setelah jadwal dipilih</p>
                </div>
              ) : presensiLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 opacity-40" />
                  <p>Memuat daftar siswa...</p>
                </div>
              ) : presensi.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Tidak ada siswa di kelas ini</p>
                  <p className="text-sm mt-1">Pastikan data siswa sudah diinput di master data</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="py-4 pl-6 w-14 font-semibold">No</TableHead>
                      <TableHead className="py-4 font-semibold">Nama Siswa</TableHead>
                      <TableHead className="py-4 w-32 font-semibold">NIS</TableHead>
                      <TableHead className="py-4 w-52 font-semibold">Status Kehadiran</TableHead>
                      <TableHead className="py-4 pr-6 font-semibold">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presensi.map((p, idx) => (
                      <TableRow
                        key={p.siswa_id}
                        className={`hover:bg-muted/10 transition-colors ${
                          p.status_kehadiran !== "H" ? "bg-rose-50/30 dark:bg-rose-900/5" : ""
                        }`}
                      >
                        <TableCell className="pl-6 py-3 text-muted-foreground font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-3 font-medium">{p.nama}</TableCell>
                        <TableCell className="py-3 text-muted-foreground font-mono text-sm">
                          {p.nis}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-2">
                            {(["H", "S", "I", "A"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => updatePresensiStatus(p.siswa_id, s)}
                                title={KEHADIRAN_LABEL[s]}
                                className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all ${
                                  p.status_kehadiran === s
                                    ? KEHADIRAN_ACTIVE[s]
                                    : KEHADIRAN_INACTIVE
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 pr-6">
                          <Input
                            className="h-9 text-sm bg-background"
                            placeholder={p.status_kehadiran !== "H" ? "Wajib diisi..." : "Keterangan (opsional)"}
                            value={p.keterangan}
                            onChange={(e) => updatePresensiKeterangan(p.siswa_id, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Submit buttons */}
          <div className="flex gap-3 pb-4">
            <Button type="submit" size="lg" disabled={submitLoading} className="gap-2 min-w-40">
              <Send className="w-4 h-4" />
              {submitLoading ? "Menyimpan..." : "Simpan Jurnal"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => {
                setSelectedMengajar(null);
                setFormTopik("");
                setFormCatatan("");
                setPresensi([]);
                setActiveTab("riwayat");
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: BEBAN MENGAJAR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "beban_mengajar" && (
        <div className="space-y-5">
          <p className="text-muted-foreground">Daftar jadwal mengajar yang telah ditetapkan untuk Anda.</p>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-4 pl-6 font-semibold">Hari</TableHead>
                  <TableHead className="py-4 font-semibold">Jam Ke</TableHead>
                  <TableHead className="py-4 font-semibold">Mata Pelajaran</TableHead>
                  <TableHead className="py-4 font-semibold">Kelas</TableHead>
                  <TableHead className="py-4 font-semibold">Tahun Ajaran</TableHead>
                  <TableHead className="py-4 pr-6 font-semibold">Semester</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mengajarList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                      <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Tidak ada data mengajar</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  [...mengajarList]
                    .sort((a, b) => HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari))
                    .map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/20">
                        <TableCell className="pl-6 py-4">
                          <Badge variant="outline" className="font-semibold">{m.hari}</Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            Jam {m.jam_ke}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 font-medium">{m.mapel?.nama_mapel ?? "-"}</TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary">{m.kelas?.nama_kelas ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground">{m.tahun_ajaran ?? "-"}</TableCell>
                        <TableCell className="py-4 pr-6 text-muted-foreground">{m.semester ?? "-"}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: REQUEST MUNDUR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "request_mundur" && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Request Jurnal Mundur</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                Jika ingin mengisi jurnal untuk tanggal yang sudah melewati batas waktu (lebih dari beberapa hari ke belakang),
                Anda perlu mengajukan request dan menunggu persetujuan admin sebelum dapat mengisi jurnal tersebut.
              </p>
            </div>
          </div>

          {/* Form */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                Ajukan Request Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmitRequest} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Jadwal Mengajar <span className="text-destructive">*</span>
                    </Label>
                    <Select value={reqMengajarID} onValueChange={(v) => setReqMengajarID(v ?? "")}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="— Pilih jadwal —">
                          {reqMengajarID
                            ? (() => { const m = mengajarList.find(x => String(x.id) === reqMengajarID); return m ? `${m.hari} — ${m.mapel?.nama_mapel} (${m.kelas?.nama_kelas})` : "— Pilih jadwal —"; })()
                            : "— Pilih jadwal —"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
          <SelectGroup>
                        {mengajarList.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)} label={m.hari}>
                            {m.hari} — {m.mapel?.nama_mapel} ({m.kelas?.nama_kelas})
                          </SelectItem>
                        ))}
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Tanggal Jurnal <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={reqTanggal}
                      onChange={(e) => setReqTanggal(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Alasan <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="Jelaskan alasan mengapa jurnal tidak dapat diisi tepat waktu..."
                    rows={4}
                    value={reqAlasan}
                    onChange={(e) => setReqAlasan(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <Button type="submit" size="lg" disabled={requestLoading} className="gap-2">
                  <Send className="w-4 h-4" />
                  {requestLoading ? "Mengajukan..." : "Ajukan Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Request history */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Riwayat Request</h3>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="py-4 pl-6 font-semibold">Tanggal Jurnal</TableHead>
                    <TableHead className="py-4 font-semibold">Alasan</TableHead>
                    <TableHead className="py-4 w-32 font-semibold">Status</TableHead>
                    <TableHead className="py-4 font-semibold">Catatan Admin</TableHead>
                    <TableHead className="py-4 pr-6 font-semibold">Diajukan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Belum ada request yang diajukan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requestList.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell className="pl-6 py-4 font-medium">
                          {new Date(r.tanggal_jurnal).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="py-4 max-w-[240px]">
                          <p className="truncate">{r.alasan}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[r.status]}`}>
                            {r.status === "approved" && <CheckCircle className="w-3.5 h-3.5" />}
                            {r.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                            {r.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                            {{pending:"Menunggu", approved:"Disetujui", rejected:"Ditolak"}[r.status]}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground text-sm">
                          {r.admin_catatan || <span className="italic opacity-50">—</span>}
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ══ REVIEW REQUEST MUNDUR (ADMIN) ══ */}
      {activeTab === "review_request" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review Request Jurnal Mundur</h2>
              <p className="text-sm text-muted-foreground">Setujui atau tolak permintaan pengisian jurnal mundur dari guru.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllRequests} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5"/>Refresh
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-4 pl-6 font-semibold">Guru</TableHead>
                  <TableHead className="py-4 font-semibold">Jadwal</TableHead>
                  <TableHead className="py-4 font-semibold">Tgl Jurnal</TableHead>
                  <TableHead className="py-4 font-semibold">Alasan</TableHead>
                  <TableHead className="py-4 font-semibold w-28">Status</TableHead>
                  <TableHead className="py-4 font-semibold">Catatan & Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequestList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                      <p>Belum ada request yang diajukan</p>
                    </TableCell>
                  </TableRow>
                ) : allRequestList.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell className="pl-6 py-4">
                      <p className="font-medium">{r.guru?.nama || "-"}</p>
                      <p className="text-xs text-muted-foreground">{r.guru?.nip || ""}</p>
                    </TableCell>
                    <TableCell className="py-4 text-sm">
                      {r.mengajar ? `${r.mengajar.hari} — ${r.mengajar.mapel?.nama_mapel} (${r.mengajar.kelas?.nama_kelas})` : "-"}
                    </TableCell>
                    <TableCell className="py-4 font-medium text-sm">
                      {new Date(r.tanggal_jurnal).toLocaleDateString("id-ID", { day:"numeric",month:"short",year:"numeric" })}
                    </TableCell>
                    <TableCell className="py-4 max-w-[180px]">
                      <p className="text-sm truncate">{r.alasan}</p>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[r.status]}`}>
                        {r.status === "approved" && <CheckCircle className="w-3 h-3"/>}
                        {r.status === "rejected" && <XCircle className="w-3 h-3"/>}
                        {r.status === "pending" && <Clock className="w-3 h-3"/>}
                        {{pending:"Pending",approved:"Disetujui",rejected:"Ditolak"}[r.status]}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 pr-6">
                      {r.status === "pending" ? (
                        <div className="flex flex-col gap-2">
                          <Input
                            placeholder="Catatan (opsional)"
                            className="h-8 text-xs"
                            value={reviewCatatan[r.id] || ""}
                            onChange={e => setReviewCatatan(prev => ({ ...prev, [r.id]: e.target.value }))}
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1" disabled={reviewLoading[r.id]}
                              onClick={() => handleReview(r.id, "approved")}>
                              <CheckCircle className="w-3 h-3"/>Setujui
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={reviewLoading[r.id]}
                              onClick={() => handleReview(r.id, "rejected")}>
                              <XCircle className="w-3 h-3"/>Tolak
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">{r.admin_catatan || "—"}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* DIALOG: Presensi Detail */}
      <Dialog open={presensiDialogOpen} onOpenChange={setPresensiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              Presensi Siswa — Jurnal #{selectedJurnalID}
            </DialogTitle>
          </DialogHeader>
          {presensiDetail.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-20" />
              <p>Tidak ada data presensi untuk jurnal ini</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-3">#</TableHead>
                  <TableHead className="py-3">Nama Siswa</TableHead>
                  <TableHead className="py-3 w-24">Status</TableHead>
                  <TableHead className="py-3">Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presensiDetail.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{p.nama || `Siswa #${p.siswa_id}`}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 text-xs font-bold ${KEHADIRAN_ACTIVE[p.status_kehadiran] || "bg-muted"}`}>
                        {p.status_kehadiran}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.keterangan || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
