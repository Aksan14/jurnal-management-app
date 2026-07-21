"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GraduationCap, BookOpen, TrendingUp, RefreshCw, Calculator,
  PlusCircle, ChevronDown, Pencil, Settings2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Mengajar {
  id: number;
  mapel?: { nama_mapel: string };
  kelas?: { nama_kelas: string; id: number };
  semester: string;
  tahun_ajaran: string;
}

interface StudentRow {
  siswa_id: number;
  nama_siswa: string;
  nis: string;
  rekap_id: number | null;
  tugas: (number | null)[];
  mid: number | null;
  uas: number | null;
  nilai_akhir: number | null;
}

interface KelasView {
  mengajar_id: number;
  nama_mapel: string;
  nama_kelas: string;
  semester: string;
  tahun_ajaran: string;
  jumlah_tugas: number;
  bobot_tugas: number;
  bobot_mid: number;
  bobot_uas: number;
  siswa: StudentRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nilaiColor(n: number): string {
  if (n >= 90) return "text-green-500 font-bold";
  if (n >= 75) return "text-blue-400 font-semibold";
  if (n >= 60) return "text-yellow-400";
  return "text-red-400";
}
function nilaiLabel(n: number): string {
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "E";
}
function fmtNilai(v: number | null): string {
  return v != null ? String(v) : "";
}
function calcPreview(
  jumlahTugas: number,
  rows: { nilai: string }[],
  mid: string, uas: string,
  bTugas: number, bMid: number, bUAS: number
): string | null {
  const midV = parseFloat(mid), uasV = parseFloat(uas);
  if (isNaN(midV) || isNaN(uasV)) return null;
  const tugasVals = rows.slice(0, jumlahTugas).map(r => parseFloat(r.nilai)).filter(v => !isNaN(v));
  const avgTugas = tugasVals.length > 0 ? tugasVals.reduce((a, b) => a + b, 0) / tugasVals.length : 0;
  return ((avgTugas * bTugas / 100) + (midV * bMid / 100) + (uasV * bUAS / 100)).toFixed(2);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NilaiPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "";
  const isGuru = ["guru", "wali_kelas"].includes(role);
  const isAdmin = ["admin", "super_admin", "kepsek"].includes(role);
  const isSiswa = role === "siswa";
  const isOrtu = role === "orang_tua";

  // Guru's teaching assignments
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([]);
  // Selected class context
  const [selMengajar, setSelMengajar] = useState("");
  const [selSemester, setSelSemester] = useState("");
  const [selTahun, setSelTahun] = useState("");
  // Class view data
  const [kelasView, setKelasView] = useState<KelasView | null>(null);
  // Siswa/ortu own siswa_id
  const [mySiswaID, setMySiswaID] = useState(0);
  // Own rekap rows (for siswa/ortu)
  const [myRows, setMyRows] = useState<StudentRow[]>([]);
  const [myMeta, setMyMeta] = useState({ bobot_tugas: 30, bobot_mid: 30, bobot_uas: 40 });

  const [loading, setLoading] = useState(false);

  // ── Bobot state (in selector panel) ──────────────────────────────────────────
  const [bobotOpen, setBobotOpen] = useState(false); // unused, kept to avoid removing bobotForm side-effects
  const [bobotForm, setBobotForm] = useState({ tugas: "30", mid: "30", uas: "40" });

  // ── Batch input dialog ────────────────────────────────────────────────────
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchKomponen, setBatchKomponen] = useState<"tugas" | "mid" | "uas">("tugas");
  const [batchKeTugas, setBatchKeTugas] = useState(1);
  const [batchTitle, setBatchTitle] = useState("");
  // batchRows: one entry per student { siswa_id, nama, nis, nilai }
  const [batchRows, setBatchRows] = useState<{ siswa_id: number; nama: string; nis: string; nilai: string }[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);


  // ── Fetch guru mengajar ────────────────────────────────────────────────────
  const fetchMengajar = useCallback(async () => {
    if (!isGuru && !isAdmin) return;
    try {
      if (isAdmin) {
        // Admin/kepsek: fetch ALL teaching assignments
        const res = await api.get("/master/mengajar", { params: { limit: 500 } });
        setMengajarList(res.data.data ?? []);
      } else {
        // Guru: only own assignments
        const r = await api.get("/profile");
        const guruID: number = r.data.data?.guru_id ?? 0;
        if (!guruID) return;
        const res = await api.get(`/master/mengajar/guru/${guruID}`);
        setMengajarList(res.data.data ?? []);
      }
    } catch {}
  }, [isGuru, isAdmin]);

  // ── Load class roster ──────────────────────────────────────────────────────
  const loadKelas = useCallback(async (
    mengajarID: string, semester: string, tahun: string, signal?: AbortSignal
  ) => {
    if (!mengajarID || !semester || !tahun) return;
    setLoading(true);
    try {
      const r = await api.get("/nilai/rekap/kelas", {
        params: { mengajar_id: mengajarID, semester, tahun_ajaran: tahun },
        signal,
      });
      setKelasView(r.data.data ?? null);
      const view: KelasView = r.data.data;
      setBobotForm({
        tugas: String(view?.bobot_tugas ?? 30),
        mid: String(view?.bobot_mid ?? 30),
        uas: String(view?.bobot_uas ?? 40),
      });
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "CanceledError") return;
      toast.error("Gagal memuat data kelas");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load own grades (siswa / ortu) ─────────────────────────────────────────────
  const loadMyGrades = useCallback(async (siswaID: number) => {
    if (!siswaID) return;
    setLoading(true);
    try {
      const r = await api.get("/nilai/rekap", {
        params: { siswa_id: siswaID, limit: 200 },
      });
      const rows: StudentRow[] = (r.data.data ?? []).map((rekap: {
        siswa_id: number;
        siswa?: { nama: string; nis: string };
        id: number;
        tugas?: { ke: number; nilai: number }[];
        nilai_mid: number | null;
        nilai_uas: number | null;
        nilai_akhir: number | null;
        bobot_tugas: number;
        bobot_mid: number;
        bobot_uas: number;
      }) => {
        const maxKe = Math.max(0, ...(rekap.tugas ?? []).map((t: { ke: number }) => t.ke));
        const tugas: (number | null)[] = Array(maxKe).fill(null);
        (rekap.tugas ?? []).forEach((t: { ke: number; nilai: number }) => {
          if (t.ke >= 1 && t.ke <= maxKe) tugas[t.ke - 1] = t.nilai;
        });
        return {
          siswa_id: rekap.siswa_id,
          nama_siswa: rekap.siswa?.nama ?? "",
          nis: rekap.siswa?.nis ?? "",
          rekap_id: rekap.id,
          tugas,
          mid: rekap.nilai_mid,
          uas: rekap.nilai_uas,
          nilai_akhir: rekap.nilai_akhir,
        };
      });
      setMyRows(rows);
      if (r.data.data?.[0]) {
        setMyMeta({
          bobot_tugas: r.data.data[0].bobot_tugas,
          bobot_mid: r.data.data[0].bobot_mid,
          bobot_uas: r.data.data[0].bobot_uas,
        });
      }
    } catch {
      toast.error("Gagal memuat nilai");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Resolve siswa ID ───────────────────────────────────────────────────────
  const resolveMyID = useCallback(async () => {
    if (!isSiswa && !isOrtu) return;
    try {
      const r = await api.get("/profile");
      if (isSiswa) setMySiswaID(r.data.data?.siswa_id ?? 0);
      if (isOrtu) {
        const anak = r.data.data?.anak ?? [];
        if (anak.length > 0) setMySiswaID(anak[0]?.siswa_id ?? 0);
      }
    } catch {}
  }, [isSiswa, isOrtu]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Use a `cancelled` flag instead of initDone ref — this resets on every
    // unmount so React StrictMode double-mount works correctly.
    let cancelled = false;

    const init = async () => {
      await fetchMengajar();
      if (cancelled) return;

      if (isSiswa || isOrtu) {
        let sid = 0;
        try {
          const r = await api.get("/profile");
          if (cancelled) return;
          if (isSiswa) sid = r.data.data?.siswa_id ?? 0;
          if (isOrtu) sid = r.data.data?.anak?.[0]?.siswa_id ?? 0;
        } catch {}

        if (sid && !cancelled) {
          setMySiswaID(sid);
          await loadMyGrades(sid);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Auto-populate semester/tahun from selected mengajar
  const handleSelMengajar = (v: string) => {
    setSelMengajar(v ?? "");
    setKelasView(null);
    const m = mengajarList.find(x => String(x.id) === v);
    if (m) {
      setSelSemester(m.semester);
      setSelTahun(m.tahun_ajaran);
    }
  };

  const handleTampilkan = () => {
    if (!selMengajar || !selSemester || !selTahun) {
      toast.error("Pilih mata pelajaran, semester, dan tahun ajaran");
      return;
    }
    loadKelas(selMengajar, selSemester, selTahun);
  };

  // ── Open batch input dialog ────────────────────────────────────────────────
  const openBatch = (komponen: "tugas" | "mid" | "uas", ke?: number) => {
    if (!kelasView) return;
    setBatchKomponen(komponen);
    setBatchKeTugas(ke ?? 1);
    const title = komponen === "tugas"
      ? `Tugas ${ke ?? 1}`
      : komponen === "mid" ? "Mid / UTS" : "UAS";
    setBatchTitle(`Input ${title} — ${kelasView.nama_mapel} (${kelasView.nama_kelas})`);
    // Pre-fill existing values
    setBatchRows(
      kelasView.siswa.map(s => {
        let existing = "";
        if (komponen === "tugas" && ke != null) {
          const v = s.tugas[ke - 1];
          existing = v != null ? String(v) : "";
        } else if (komponen === "mid") {
          existing = s.mid != null ? String(s.mid) : "";
        } else if (komponen === "uas") {
          existing = s.uas != null ? String(s.uas) : "";
        }
        return { siswa_id: s.siswa_id, nama: s.nama_siswa, nis: s.nis, nilai: existing };
      })
    );
    setBatchOpen(true);
  };

  const openNewTugas = () => {
    if (!kelasView) return;
    openBatch("tugas", kelasView.jumlah_tugas + 1);
  };

  // ── Save batch ─────────────────────────────────────────────────────────────
  const saveBatch = async () => {
    if (!kelasView) return;
    for (const row of batchRows) {
      if (row.nilai === "") continue;
      const v = parseFloat(row.nilai);
      if (isNaN(v) || v < 0 || v > 100) {
        toast.error(`Nilai ${row.nama} harus 0–100`);
        return;
      }
    }
    // Only send students that have a filled nilai
    const data = batchRows
      .filter(r => r.nilai !== "")
      .map(r => ({ siswa_id: r.siswa_id, nilai: parseFloat(r.nilai), keterangan: "" }));
    if (data.length === 0) { toast.error("Tidak ada nilai yang diisi"); return; }

    setBatchSaving(true);
    try {
      const bT = parseFloat(bobotForm.tugas) || 30;
      const bM = parseFloat(bobotForm.mid) || 30;
      const bU = parseFloat(bobotForm.uas) || 40;
      await api.post("/nilai/rekap/batch", {
        mengajar_id: kelasView.mengajar_id,
        semester: kelasView.semester,
        tahun_ajaran: kelasView.tahun_ajaran,
        komponen: batchKomponen,
        ke_tugas: batchKomponen === "tugas" ? batchKeTugas : 0,
        bobot_tugas: bT,
        bobot_mid: bM,
        bobot_uas: bU,
        data,
      });
      toast.success("Nilai berhasil disimpan");
      setBatchOpen(false);
      loadKelas(selMengajar, selSemester, selTahun);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? "Gagal menyimpan nilai");
    } finally {
      setBatchSaving(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const gradedRows = kelasView?.siswa.filter(s => s.nilai_akhir != null) ?? [];
  const avgAkhir = gradedRows.length > 0
    ? (gradedRows.reduce((sum, s) => sum + (s.nilai_akhir ?? 0), 0) / gradedRows.length).toFixed(1)
    : null;

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderGradeCell = (v: number | null) =>
    v != null
      ? <span className={nilaiColor(v)}>{v}</span>
      : <span className="text-muted-foreground/40 text-xs">—</span>;

  // ════════════════════════════════════════════════════════════════════════════
  // SISWA / ORTU VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (isSiswa || isOrtu) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Rekap Nilai Akademik
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Nilai per mata pelajaran</p>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Memuat…</div>
        ) : myRows.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <GraduationCap className="w-8 h-8 opacity-30" />
              Belum ada data nilai
            </CardContent>
          </Card>
        ) : (
          myRows.map((row, idx) => {
            const maxKe = row.tugas.length;
            const avgTugas = row.tugas.filter(v => v != null).length > 0
              ? (row.tugas.filter(v => v != null) as number[]).reduce((a, b) => a + b, 0) /
                row.tugas.filter(v => v != null).length
              : null;
            return (
              <Card key={idx} className="border-border/40">
                <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Mata Pelajaran {idx + 1}</CardTitle>
                  {row.nilai_akhir != null && (
                    <Badge variant="outline" className={`font-bold border-current ${nilaiColor(row.nilai_akhir)}`}>
                      {nilaiLabel(row.nilai_akhir)} — {row.nilai_akhir}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {Array.from({ length: maxKe }).map((_, i) => (
                      <div key={i}>
                        <div className="text-xs text-muted-foreground">Tugas {i + 1}</div>
                        <div className={`text-lg font-semibold ${row.tugas[i] != null ? nilaiColor(row.tugas[i]!) : "text-muted-foreground/40"}`}>
                          {row.tugas[i] ?? "—"}
                        </div>
                      </div>
                    ))}
                    {maxKe > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground">Rata Tugas</div>
                        <div className={`text-lg font-semibold ${avgTugas != null ? nilaiColor(avgTugas) : "text-muted-foreground/40"}`}>
                          {avgTugas?.toFixed(1) ?? "—"}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Mid / UTS</div>
                      <div className={`text-lg font-semibold ${row.mid != null ? nilaiColor(row.mid) : "text-muted-foreground/40"}`}>
                        {row.mid ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">UAS</div>
                      <div className={`text-lg font-semibold ${row.uas != null ? nilaiColor(row.uas) : "text-muted-foreground/40"}`}>
                        {row.uas ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Nilai Akhir</div>
                      <div className={`text-xl font-bold ${row.nilai_akhir != null ? nilaiColor(row.nilai_akhir) : "text-muted-foreground/40"}`}>
                        {row.nilai_akhir ?? "—"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GURU / ADMIN / KEPSEK VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Penilaian Siswa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin
              ? "Lihat rekap nilai seluruh kelas (read-only)"
              : "Input nilai per komponen (Tugas dinamis · Mid · UAS) — nilai akhir dihitung otomatis"}
          </p>
        </div>
      </div>

      {/* Class selector + bobot configuration */}
      <Card className="border-border/40">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {isAdmin ? "Pilih Kelas &amp; Mata Pelajaran" : "1. Pilih Kelas &amp; Mata Pelajaran"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Subject / class / semester / tahun row */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-[2] min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Mata Pelajaran / Kelas</Label>
              {(isGuru || isAdmin) ? (
                <Select value={selMengajar} onValueChange={(v) => handleSelMengajar(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isAdmin ? "Pilih kelas / mapel (semua guru)" : "Pilih mata pelajaran Anda"}>
                      {selMengajar && (() => {
                        const m = mengajarList.find(x => String(x.id) === selMengajar);
                        return m
                          ? `${m.mapel?.nama_mapel ?? "—"} — ${m.kelas?.nama_kelas ?? "—"} (${m.semester} ${m.tahun_ajaran})`
                          : null;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {mengajarList.map(m => {
                      const labelText = `${m.mapel?.nama_mapel ?? "—"} — ${m.kelas?.nama_kelas ?? "—"} (${m.semester} ${m.tahun_ajaran})`;
                      return (
                        <SelectItem key={m.id} value={String(m.id)} label={labelText}>
                          {labelText}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Masukkan mengajar_id" value={selMengajar}
                  onChange={e => setSelMengajar(e.target.value)} />
              )}
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Semester</Label>
              <Select value={selSemester} onValueChange={(v) => setSelSemester(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ganjil">Ganjil</SelectItem>
                  <SelectItem value="Genap">Genap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Tahun Ajaran</Label>
              <Input placeholder="2025/2026" value={selTahun}
                onChange={e => setSelTahun(e.target.value)} />
            </div>
          </div>

          {/* Bobot configuration — only for guru (admin just views) */}
          {!isAdmin && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">2. Tentukan Bobot Penilaian</span>
                <span className="text-xs text-muted-foreground">(total harus 100%)</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(["tugas", "mid", "uas"] as const).map(k => (
                  <div key={k}>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {k === "tugas" ? "Rata-rata Tugas (%)" : k === "mid" ? "Mid / UTS (%)" : "UAS (%)"}
                    </Label>
                    <Input
                      type="number" min={0} max={100}
                      value={bobotForm[k]}
                      onChange={e => setBobotForm(f => ({ ...f, [k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className={
                  Math.abs(
                    (parseFloat(bobotForm.tugas) || 0) +
                    (parseFloat(bobotForm.mid) || 0) +
                    (parseFloat(bobotForm.uas) || 0) - 100
                  ) < 0.01 ? "text-xs text-green-500 font-semibold" : "text-xs text-red-400 font-semibold"
                }>
                  {((parseFloat(bobotForm.tugas) || 0) + (parseFloat(bobotForm.mid) || 0) + (parseFloat(bobotForm.uas) || 0)).toFixed(0)}%
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  Rumus: (Rata Tugas × {bobotForm.tugas || 0}%) + (Mid × {bobotForm.mid || 0}%) + (UAS × {bobotForm.uas || 0}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleTampilkan} disabled={loading} className="gap-2">
              <BookOpen className="w-4 h-4" />
              {loading ? "Memuat…" : isAdmin ? "Tampilkan Rekap Nilai" : "3. Tampilkan Daftar Nilai"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* When no selection yet */}
      {!kelasView && !loading && (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
            <BookOpen className="w-10 h-10 opacity-30" />
            {isAdmin
              ? "Pilih kelas/mapel lalu klik \"Tampilkan Rekap Nilai\""
              : "Isi semua pilihan di atas lalu klik \"Tampilkan Daftar Nilai\""
            }
          </CardContent>
        </Card>
      )}

      {/* Class view */}
      {kelasView && (
        <>
          {/* Stats + bobot bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="col-span-2 sm:col-span-1 border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Rata-rata Akhir
                </div>
                <div className={`text-3xl font-bold ${avgAkhir ? nilaiColor(parseFloat(avgAkhir)) : "text-muted-foreground"}`}>
                  {avgAkhir ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {gradedRows.length}/{kelasView.siswa.length} siswa
                </div>
              </CardContent>
            </Card>
            {(["A (≥90)", "B (80-89)", "C (70-79)", "< C"] as const).map((label, i) => {
              const ranges = [
                (n: number) => n >= 90,
                (n: number) => n >= 80 && n < 90,
                (n: number) => n >= 70 && n < 80,
                (n: number) => n < 70,
              ];
              const colors = ["text-green-500", "text-blue-400", "text-yellow-400", "text-red-400"];
              const count = gradedRows.filter(s => ranges[i](s.nilai_akhir!)).length;
              return (
                <Card key={label} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className={`text-2xl font-bold ${colors[i]}`}>{count}</div>
                    <div className="text-xs text-muted-foreground">siswa</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Input Nilai section (guru only) ─────────────────────────────── */}
          {isGuru && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-primary" />
                  Input Nilai — Pilih komponen yang ingin diisi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  {/* Existing tugas — edit */}
                  {Array.from({ length: kelasView.jumlah_tugas }).map((_, i) => (
                    <Button
                      key={i}
                      variant="secondary"
                      className="gap-2"
                      onClick={() => openBatch("tugas", i + 1)}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Nilai Tugas {i + 1}
                    </Button>
                  ))}
                  {/* Add next tugas */}
                  <Button
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={openNewTugas}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Input Tugas {kelasView.jumlah_tugas + 1} (Semua Siswa)
                  </Button>
                  {/* Mid / UTS */}
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => openBatch("mid")}
                  >
                    <Pencil className="w-4 h-4" />
                    Input Nilai Mid / UTS (Semua Siswa)
                  </Button>
                  {/* UAS */}
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => openBatch("uas")}
                  >
                    <Pencil className="w-4 h-4" />
                    Input Nilai UAS (Semua Siswa)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Klik salah satu tombol di atas → akan muncul form daftar seluruh siswa → isi nilai masing-masing → Simpan.
                  Bobot aktif: Tugas <b>{bobotForm.tugas || 30}%</b> · Mid <b>{bobotForm.mid || 30}%</b> · UAS <b>{bobotForm.uas || 40}%</b> (ubah di panel atas).
                </p>
              </CardContent>
            </Card>
          )}

          {/* Refresh + info bar */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
              onClick={() => loadKelas(selMengajar, selSemester, selTahun)}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <span>
              Bobot: Tugas <b className="text-foreground">{bobotForm.tugas || 30}%</b> · Mid <b className="text-foreground">{bobotForm.mid || 30}%</b> · UAS <b className="text-foreground">{bobotForm.uas || 40}%</b>
            </span>
          </div>

          {/* Roster table */}
          <Card className="border-border/40">
            <CardHeader className="py-3 px-4 border-b border-border/40">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {kelasView.nama_mapel} — {kelasView.nama_kelas} ({kelasView.semester} {kelasView.tahun_ajaran})
                <span className="text-muted-foreground font-normal">({kelasView.siswa.length} siswa)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8">No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NIS</TableHead>
                    {Array.from({ length: kelasView.jumlah_tugas }).map((_, i) => (
                      <TableHead key={i} className="text-center min-w-[60px]">T{i + 1}</TableHead>
                    ))}
                    {kelasView.jumlah_tugas > 1 && (
                      <TableHead className="text-center min-w-[70px]">Rata T</TableHead>
                    )}
                    <TableHead className="text-center min-w-[60px]">Mid</TableHead>
                    <TableHead className="text-center min-w-[60px]">UAS</TableHead>
                    <TableHead className="text-center min-w-[80px]">Nilai Akhir</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelasView.siswa.map((s, idx) => {
                    const tugasVals = s.tugas.filter(v => v != null) as number[];
                    const avgT = tugasVals.length > 0
                      ? tugasVals.reduce((a, b) => a + b, 0) / tugasVals.length
                      : null;
                    return (
                      <TableRow key={s.siswa_id} className="text-sm">
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{s.nama_siswa}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{s.nis}</TableCell>
                        {Array.from({ length: kelasView.jumlah_tugas }).map((_, i) => (
                          <TableCell key={i} className="text-center">
                            {renderGradeCell(s.tugas[i] ?? null)}
                          </TableCell>
                        ))}
                        {kelasView.jumlah_tugas > 1 && (
                          <TableCell className="text-center">
                            {avgT != null
                              ? <span className={nilaiColor(avgT)}>{avgT.toFixed(1)}</span>
                              : <span className="text-muted-foreground/40 text-xs">—</span>}
                          </TableCell>
                        )}
                        <TableCell className="text-center">{renderGradeCell(s.mid)}</TableCell>
                        <TableCell className="text-center">{renderGradeCell(s.uas)}</TableCell>
                        <TableCell className="text-center">
                          {s.nilai_akhir != null
                            ? <span className={`text-base font-bold ${nilaiColor(s.nilai_akhir)}`}>{s.nilai_akhir}</span>
                            : <span className="text-muted-foreground/40 text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.nilai_akhir != null && (
                            <Badge variant="outline" className={`font-bold border-current ${nilaiColor(s.nilai_akhir)}`}>
                              {nilaiLabel(s.nilai_akhir)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Batch Input Dialog ──────────────────────────────────────────────── */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {batchTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Isi nilai 0–100. Kosongkan baris jika belum dinilai.
            </p>

            {/* Preview formula */}
            {kelasView && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                Formula: Rata-rata Tugas × {kelasView.bobot_tugas}% + Mid × {kelasView.bobot_mid}% + UAS × {kelasView.bobot_uas}%
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/30">
                    <TableHead>No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead className="min-w-[90px]">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRows.map((row, idx) => (
                    <TableRow key={row.siswa_id} className="text-sm">
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell>{row.nama}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.nis}</TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0} max={100} step={0.5}
                          placeholder="—"
                          className="h-7 w-20 text-sm"
                          value={row.nilai}
                          onChange={e => {
                            const next = [...batchRows];
                            next[idx] = { ...next[idx], nilai: e.target.value };
                            setBatchRows(next);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBatchOpen(false)}>Batal</Button>
              <Button onClick={saveBatch} disabled={batchSaving}>
                {batchSaving ? "Menyimpan…" : "Simpan Nilai"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
