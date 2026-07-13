"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  FileSpreadsheet, FileText, Search, BarChart3, Loader2,
  BookOpen, User, AlertTriangle, CheckCircle, Calendar,
  ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHeader, TableRow, TableHead,
} from "@/components/ui/table";

// ─── Types ─────────────────────────────────────────────────────────────────
interface MengajarItem {
  id: number;
  hari: string;
  jam_ke: string;
  tahun_ajaran: string;
  semester: string;
  guru?: { id: number; nama: string; nip?: string };
  mapel?: { id: number; nama_mapel: string };
  kelas?: { id: number; nama_kelas: string };
}

interface JurnalItem {
  id: number;
  tanggal: string;
  jam_ke: string;
  topik_materi: string;
  catatan_guru?: string;
  mengajar?: {
    id: number;
    hari: string;
    jam_ke: string;
    guru?: { id: number; nama: string; nip?: string };
    mapel?: { id: number; nama_mapel: string };
    kelas?: { id: number; nama_kelas: string };
  };
}

interface GuruRow {
  id: number;
  nama: string;
  nip?: string;
  schedules: {
    mengajar: MengajarItem;
    jamPerMinggu: number;
    seharusnya: number;
    liburJamKhusus: number;
    terlaksana: number;
    selisih: number;
    jurnals: JurnalItem[];
  }[];
  totalSeharusnya: number;
  totalLiburJamKhusus: number;
  totalTerlaksana: number;
  totalSelisih: number;
  totalTidakHadir: number;
  expanded: boolean;
}

const MONTHS = [
  { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
  { value: "3", label: "Maret" }, { value: "4", label: "April" },
  { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
  { value: "7", label: "Juli" }, { value: "8", label: "Agustus" },
  { value: "9", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];

const HARI_MAP: Record<string, number> = {
  Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6,
};

function parseJamCount(jamKe: string): number {
  if (!jamKe) return 1;
  const parts = jamKe.split("-").map(Number).filter(Boolean);
  if (parts.length === 2) return parts[1] - parts[0] + 1;
  return 1;
}

function getDatesByHari(year: number, month: number, hariName: string): Date[] {
  const dayOfWeek = HARI_MAP[hariName];
  if (dayOfWeek === undefined) return [];
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === dayOfWeek) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function fmtDate(d: string | Date) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RekapGuruPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GuruRow[]>([]);
  const [fetched, setFetched] = useState(false);

  const toggleExpand = (id: number) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, expanded: !r.expanded } : r)));

  const handleFetch = useCallback(async () => {
    setLoading(true);
    setFetched(false);
    try {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
      const bulanStr = `${y}-${String(m).padStart(2, "0")}`;

      const [guruRes, mengajarRes, jurnalRes, liburRes, jamKhususRes, absensiRes] = await Promise.all([
        api.get("/master/guru?limit=500"),
        api.get("/master/mengajar?limit=2000"),
        api.get(`/reports/jurnal?limit=10000&start_date=${startDate}&end_date=${endDate}`),
        api.get(`/attendance/holidays/bulan?bulan=${bulanStr}`).catch(() => ({ data: { data: [] } })),
        api.get(`/attendance/jam-khusus?bulan=${bulanStr}`).catch(() => ({ data: { data: [] } })),
        api.get(`/attendance/teacher?limit=2000&start_date=${startDate}&end_date=${endDate}`).catch(() => ({ data: { data: [] } })),
      ]);

      const guruList: any[] = guruRes.data.data || [];
      const mengajarList: MengajarItem[] = mengajarRes.data.data || [];
      const jurnalList: JurnalItem[] = jurnalRes.data.data || [];
      const liburList: any[] = liburRes.data.data || [];
      const jamKhususList: any[] = jamKhususRes.data.data || [];
      const absensiList: any[] = absensiRes.data.data || [];

      const liburDates = new Set(liburList.map((l: any) => (l.tanggal || "").split("T")[0]));
      const jamKhususMap = new Map<string, number>();
      for (const jk of jamKhususList) {
        if (!jk.kelas_id) {
          jamKhususMap.set((jk.tanggal || "").split("T")[0], jk.max_jam);
        }
      }

      const jurnalByMengajar = new Map<number, JurnalItem[]>();
      for (const j of jurnalList) {
        const mid = j.mengajar?.id;
        if (!mid) continue;
        if (!jurnalByMengajar.has(mid)) jurnalByMengajar.set(mid, []);
        jurnalByMengajar.get(mid)!.push(j);
      }

      const absensiByGuru = new Map<number, number>();
      for (const a of absensiList) {
        const gid = a.guru_id || a.guru?.id;
        if (!gid) continue;
        if (a.status && a.status !== "hadir") {
          absensiByGuru.set(gid, (absensiByGuru.get(gid) || 0) + 1);
        }
      }

      const guruMap = new Map<number, GuruRow>();
      for (const g of guruList) {
        const gid = g.id || g.ID;
        guruMap.set(gid, {
          id: gid, nama: g.nama, nip: g.nip,
          schedules: [],
          totalSeharusnya: 0, totalLiburJamKhusus: 0,
          totalTerlaksana: 0, totalSelisih: 0, totalTidakHadir: 0,
          expanded: false,
        });
      }

      for (const mg of mengajarList) {
        const gid = mg.guru?.id || 0;
        if (!gid) continue;
        if (!guruMap.has(gid)) {
          guruMap.set(gid, {
            id: gid, nama: mg.guru?.nama || "?", nip: mg.guru?.nip,
            schedules: [],
            totalSeharusnya: 0, totalLiburJamKhusus: 0,
            totalTerlaksana: 0, totalSelisih: 0, totalTidakHadir: 0,
            expanded: false,
          });
        }

        const jamPerMinggu = parseJamCount(mg.jam_ke);
        const allDates = getDatesByHari(y, m, mg.hari);
        const seharusnya = allDates.length * jamPerMinggu;

        let liburJamKhusus = 0;
        for (const d of allDates) {
          const ymd = toYMD(d);
          if (liburDates.has(ymd)) {
            liburJamKhusus += jamPerMinggu;
          } else if (jamKhususMap.has(ymd)) {
            const maxJam = jamKhususMap.get(ymd)!;
            const jamStart = parseInt(mg.jam_ke.split("-")[0]) || 1;
            if (jamStart > maxJam) liburJamKhusus += jamPerMinggu;
          }
        }

        const jurnals = jurnalByMengajar.get(mg.id) || [];
        const terlaksana = jurnals.reduce((s, j) => s + parseJamCount(j.jam_ke || mg.jam_ke), 0);
        const efektif = seharusnya - liburJamKhusus;
        const selisih = efektif - terlaksana;

        guruMap.get(gid)!.schedules.push({
          mengajar: mg, jamPerMinggu, seharusnya, liburJamKhusus,
          terlaksana, selisih, jurnals,
        });
      }

      for (const row of guruMap.values()) {
        row.totalSeharusnya = row.schedules.reduce((s, sc) => s + sc.seharusnya, 0);
        row.totalLiburJamKhusus = row.schedules.reduce((s, sc) => s + sc.liburJamKhusus, 0);
        row.totalTerlaksana = row.schedules.reduce((s, sc) => s + sc.terlaksana, 0);
        row.totalSelisih = row.schedules.reduce((s, sc) => s + sc.selisih, 0);
        row.totalTidakHadir = absensiByGuru.get(row.id) || 0;
      }

      setRows(Array.from(guruMap.values()).sort((a, b) => a.nama.localeCompare(b.nama)));
      setFetched(true);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Gagal mengambil data rekap");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const filtered = rows.filter(
    (r) => !search || r.nama.toLowerCase().includes(search.toLowerCase()) || (r.nip || "").includes(search)
  );

  const monthLabel = MONTHS.find((m) => m.value === month)?.label || month;
  const totalTerlaksana = filtered.reduce((s, r) => s + r.totalTerlaksana, 0);
  const totalSelisih = filtered.reduce((s, r) => s + r.totalSelisih, 0);
  const totalTidakHadir = filtered.reduce((s, r) => s + r.totalTidakHadir, 0);

  // ─── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Sheet ringkasan
    const rows1: (string | number)[][] = [
      [`Rekap Jurnal Mengajar Per Guru — ${monthLabel} ${year}`],
      [],
      ["No", "Nama Guru", "NIP", "Mapel — Kelas", "Jam/Minggu", "Seharusnya", "Libur/Jam Khusus", "Terlaksana", "Selisih", "Tidak Hadir", "Total Rekap Guru"],
    ];
    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];
      const mk = [...new Set(r.schedules.map((sc) => `${sc.mengajar.mapel?.nama_mapel || "-"} — ${sc.mengajar.kelas?.nama_kelas || "-"}`))].join("; ");
      const jpw = r.schedules.reduce((s, sc) => s + sc.jamPerMinggu, 0);
      rows1.push([i + 1, r.nama, r.nip || "-", mk, jpw, r.totalSeharusnya, r.totalLiburJamKhusus, r.totalTerlaksana, r.totalSelisih, r.totalTidakHadir, r.totalTerlaksana - r.totalTidakHadir]);
    }
    const ws1 = XLSX.utils.aoa_to_sheet(rows1);
    ws1["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 45 }, { wch: 11 }, { wch: 12 }, { wch: 17 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

    // Sheet detail
    const rows2: (string | number)[][] = [
      [`Detail Jurnal Per Guru — ${monthLabel} ${year}`], [],
      ["No", "Nama Guru", "Hari", "Mapel", "Kelas", "Jam Ke", "Tanggal", "Topik Materi", "Catatan"],
    ];
    let no = 1;
    for (const r of filtered) {
      for (const sc of r.schedules) {
        if (sc.jurnals.length === 0) {
          rows2.push([no++, r.nama, sc.mengajar.hari, sc.mengajar.mapel?.nama_mapel || "-", sc.mengajar.kelas?.nama_kelas || "-", sc.mengajar.jam_ke, "-", "(Belum ada jurnal)", ""]);
        } else {
          for (const j of sc.jurnals) {
            rows2.push([no++, r.nama, sc.mengajar.hari, sc.mengajar.mapel?.nama_mapel || "-", sc.mengajar.kelas?.nama_kelas || "-", j.jam_ke || sc.mengajar.jam_ke, fmtDate(j.tanggal), j.topik_materi, j.catatan_guru || ""]);
          }
        }
      }
    }
    const ws2 = XLSX.utils.aoa_to_sheet(rows2);
    ws2["!cols"] = [{ wch: 5 }, { wch: 26 }, { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 45 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Detail Jurnal");

    XLSX.writeFile(wb, `Rekap_Jurnal_Guru_${monthLabel}_${year}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Rekap Jurnal Mengajar Per Guru — ${monthLabel} ${year}`, 14, 14);

    autoTable(doc, {
      startY: 20,
      head: [["No", "Nama Guru", "Mapel — Kelas", "Jam/\nMinggu", "Seharusnya", "Libur/\nJam Khusus", "Terlaksana", "Selisih", "Tidak\nHadir", "Total\nRekap"]],
      body: filtered.map((r, i) => {
        const mk = [...new Set(r.schedules.map((sc) => `${sc.mengajar.mapel?.nama_mapel || "-"} (${sc.mengajar.kelas?.nama_kelas || "-"})`))]
          .join("\n");
        const jpw = r.schedules.reduce((s, sc) => s + sc.jamPerMinggu, 0);
        return [i + 1, r.nama, mk, jpw, r.totalSeharusnya, r.totalLiburJamKhusus, r.totalTerlaksana, r.totalSelisih, r.totalTidakHadir, r.totalTerlaksana - r.totalTidakHadir];
      }),
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" as const },
      headStyles: { fillColor: [30, 64, 175] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: "bold" as const },
      alternateRowStyles: { fillColor: [245, 247, 255] as [number,number,number] },
      columnStyles: { 2: { cellWidth: 55 } },
    });

    for (const r of filtered) {
      const hasJurnal = r.schedules.some((sc) => sc.jurnals.length > 0);
      if (!hasJurnal) continue;
      doc.addPage();
      doc.setFontSize(12);
      doc.text(`Detail Jurnal — ${r.nama}${r.nip ? ` (NIP: ${r.nip})` : ""}`, 14, 14);
      doc.setFontSize(9);
      doc.text(`Bulan: ${monthLabel} ${year}  |  Terlaksana: ${r.totalTerlaksana} jam  |  Selisih: ${r.totalSelisih} jam`, 14, 21);
      const body: (string | number)[][] = [];
      let no = 1;
      for (const sc of r.schedules) {
        for (const j of sc.jurnals) {
          body.push([no++, fmtDate(j.tanggal), sc.mengajar.hari, `${sc.mengajar.mapel?.nama_mapel || "-"} (${sc.mengajar.kelas?.nama_kelas || "-"})`, j.jam_ke || sc.mengajar.jam_ke, j.topik_materi, j.catatan_guru || "-"]);
        }
      }
      autoTable(doc, {
        startY: 26,
        head: [["No", "Tanggal", "Hari", "Mapel (Kelas)", "Jam Ke", "Topik Materi", "Catatan"]],
        body,
        styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" as const },
        headStyles: { fillColor: [30, 64, 175] as [number,number,number], textColor: [255,255,255] as [number,number,number] },
        columnStyles: { 5: { cellWidth: 60 }, 6: { cellWidth: 45 } },
      });
    }
    doc.save(`Rekap_Jurnal_Guru_${monthLabel}_${year}.pdf`);
    toast.success("File PDF berhasil diunduh");
  };

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Rekap Jurnal Bulanan Per Guru
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitoring jam mengajar, keterlaksanaan jurnal, libur, jam khusus, dan kehadiran guru per bulan
        </p>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Filter Laporan</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1 w-44">
            <label className="text-xs text-muted-foreground">Bulan</label>
            <Select value={month} onValueChange={(val) => { if (val) setMonth(val); }}>
              <SelectTrigger className="h-9">
                <SelectValue>{MONTHS.find((m) => m.value === month)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
          <SelectGroup>
                {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectGroup>
        </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-28">
            <label className="text-xs text-muted-foreground">Tahun</label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} className="h-9" placeholder="2026" />
          </div>
          <Button onClick={handleFetch} disabled={loading} className="h-9 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Tampilkan Rekap
          </Button>
          {fetched && (
            <div className="relative ml-auto">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama guru / NIP..." className="h-9 w-56 pl-8" />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Stats + Export */}
      {fetched && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3 flex-wrap">
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm">{filtered.length} Guru</span>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">{totalTerlaksana} Jam Terlaksana</span>
            </div>
            {totalSelisih > 0 && (
              <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">{totalSelisih} Jam Belum Terisi</span>
              </div>
            )}
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-400" />
              <span className="text-sm">{totalTidakHadir} Hari Tidak Hadir</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportExcel} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-white text-xs h-8">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
            </Button>
            <Button onClick={exportPDF} size="sm" className="bg-red-600 hover:bg-red-700 gap-1.5 text-white text-xs h-8">
              <FileText className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {fetched && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
                  <TableHead rowSpan={2} className="text-center w-10 border-r border-border/50 align-middle text-xs font-bold uppercase">No</TableHead>
                  <TableHead rowSpan={2} className="border-r border-border/50 align-middle text-xs font-bold uppercase min-w-[160px]">Nama Guru</TableHead>
                  <TableHead rowSpan={2} className="border-r border-border/50 align-middle text-xs font-bold uppercase min-w-[180px]">Mapel – Kelas</TableHead>
                  <TableHead colSpan={2} className="text-center border-r border-border/50 text-xs font-bold uppercase py-2 bg-blue-50 dark:bg-blue-950/30">JAM ROSTER</TableHead>
                  <TableHead rowSpan={2} className="text-center border-r border-border/50 align-middle text-xs font-bold uppercase bg-purple-50 dark:bg-purple-950/30 min-w-[90px]">LIBUR/<br />JAM KHUSUS</TableHead>
                  <TableHead colSpan={2} className="text-center border-r border-border/50 text-xs font-bold uppercase py-2 bg-emerald-50 dark:bg-emerald-950/30">JAM BULAN INI</TableHead>
                  <TableHead rowSpan={2} className="text-center border-r border-border/50 align-middle text-xs font-bold uppercase bg-red-50 dark:bg-red-950/30 min-w-[80px]">TIDAK<br />HADIR</TableHead>
                  <TableHead rowSpan={2} className="text-center align-middle text-xs font-bold uppercase min-w-[90px]">TOTAL<br />REKAP GURU</TableHead>
                </TableRow>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="text-center text-xs border-r border-border/30 py-1.5 bg-blue-50 dark:bg-blue-950/20">PER MINGGU</TableHead>
                  <TableHead className="text-center text-xs border-r border-border/50 py-1.5 bg-blue-50 dark:bg-blue-950/20">SEHARUSNYA</TableHead>
                  <TableHead className="text-center text-xs border-r border-border/30 py-1.5 bg-emerald-50 dark:bg-emerald-950/20">TERLAKSANA</TableHead>
                  <TableHead className="text-center text-xs border-r border-border/50 py-1.5 bg-emerald-50 dark:bg-emerald-950/20">SELISIH</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Tidak ada data ditemukan</TableCell>
                  </TableRow>
                ) : filtered.map((r, i) => {
                  const mks = [...new Set(r.schedules.map((sc) => `${sc.mengajar.mapel?.nama_mapel || "-"} (${sc.mengajar.kelas?.nama_kelas || "-"})`))]
                  const jpw = r.schedules.reduce((s, sc) => s + sc.jamPerMinggu, 0);
                  const totalRekap = r.totalTerlaksana - r.totalTidakHadir;
                  const hasSelisih = r.totalSelisih > 0;

                  return (
                    <React.Fragment key={r.id}>
                      <TableRow
                        className={`border-border/20 cursor-pointer transition-colors ${hasSelisih ? "bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50/70 dark:hover:bg-amber-900/20" : "hover:bg-muted/20"}`}
                        onClick={() => r.schedules.length > 0 && toggleExpand(r.id)}
                      >
                        <TableCell className="text-center text-muted-foreground text-sm border-r border-border/20">{i + 1}</TableCell>
                        <TableCell className="border-r border-border/20">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{r.nama}</p>
                              {r.nip && <p className="text-xs text-muted-foreground font-mono">{r.nip}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-border/20">
                          <div className="flex flex-wrap gap-1">
                            {mks.length === 0 ? <span className="text-muted-foreground text-xs italic">—</span>
                              : mks.slice(0, 3).map((mk, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] font-normal px-1.5">{mk}</Badge>
                              ))}
                            {mks.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5">+{mks.length - 3}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center border-r border-border/20 bg-blue-50/30 dark:bg-blue-950/10">
                          <span className="font-bold text-sm">{jpw}</span>
                          <span className="text-xs text-muted-foreground"> jam</span>
                        </TableCell>
                        <TableCell className="text-center border-r border-border/50 bg-blue-50/30 dark:bg-blue-950/10">
                          <span className="font-bold text-sm">{r.totalSeharusnya}</span>
                          <span className="text-xs text-muted-foreground"> jam</span>
                        </TableCell>
                        <TableCell className="text-center border-r border-border/50 bg-purple-50/30 dark:bg-purple-950/10">
                          {r.totalLiburJamKhusus > 0
                            ? <span className="font-semibold text-sm text-purple-600">{r.totalLiburJamKhusus} jam</span>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-center border-r border-border/20 bg-emerald-50/30 dark:bg-emerald-950/10">
                          <span className="font-bold text-sm text-emerald-600">{r.totalTerlaksana}</span>
                          <span className="text-xs text-muted-foreground"> jam</span>
                        </TableCell>
                        <TableCell className="text-center border-r border-border/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                          {r.totalSelisih > 0
                            ? <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold dark:bg-amber-900/40 dark:text-amber-300">-{r.totalSelisih}</Badge>
                            : r.totalSelisih < 0
                              ? <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs dark:bg-blue-900/40 dark:text-blue-300">+{Math.abs(r.totalSelisih)}</Badge>
                              : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs dark:bg-emerald-900/40 dark:text-emerald-300">✓ Lunas</Badge>}
                        </TableCell>
                        <TableCell className="text-center border-r border-border/50 bg-red-50/30 dark:bg-red-950/10">
                          {r.totalTidakHadir > 0
                            ? <span className="font-bold text-sm text-red-500">{r.totalTidakHadir}</span>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={`font-bold text-sm ${totalRekap < 0 ? "text-red-500" : totalRekap > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                              {totalRekap}
                            </span>
                            {r.schedules.length > 0 && (
                              r.expanded
                                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail per jadwal */}
                      {r.expanded && r.schedules.map((sc, si) => (
                        <TableRow key={`${r.id}-sc-${si}`} className="bg-muted/5 hover:bg-muted/10 border-border/10 text-xs">
                          <TableCell className="border-r border-border/10" />
                          <TableCell className="text-muted-foreground border-r border-border/10 pl-10 py-2">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3 w-3 shrink-0 text-primary" />
                              <span className="font-medium">{sc.mengajar.hari}</span>
                              <span className="text-muted-foreground">· Jam {sc.mengajar.jam_ke}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sc.jurnals.length} jurnal terisi</p>
                          </TableCell>
                          <TableCell className="border-r border-border/10 text-muted-foreground py-2">
                            {sc.mengajar.mapel?.nama_mapel} — {sc.mengajar.kelas?.nama_kelas}
                          </TableCell>
                          <TableCell className="text-center border-r border-border/10 bg-blue-50/20 dark:bg-blue-950/5">{sc.jamPerMinggu}</TableCell>
                          <TableCell className="text-center border-r border-border/10 bg-blue-50/20 dark:bg-blue-950/5">{sc.seharusnya}</TableCell>
                          <TableCell className="text-center border-r border-border/10 bg-purple-50/20 dark:bg-purple-950/5">
                            {sc.liburJamKhusus > 0 ? <span className="text-purple-500">{sc.liburJamKhusus}</span> : "—"}
                          </TableCell>
                          <TableCell className="text-center border-r border-border/10 text-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/5">{sc.terlaksana}</TableCell>
                          <TableCell className="text-center border-r border-border/10 bg-emerald-50/20 dark:bg-emerald-950/5">
                            {sc.selisih > 0
                              ? <span className="text-amber-600 font-semibold">-{sc.selisih}</span>
                              : sc.selisih < 0
                                ? <span className="text-blue-500">+{Math.abs(sc.selisih)}</span>
                                : <span className="text-emerald-500">✓</span>}
                          </TableCell>
                          <TableCell className="border-r border-border/10 bg-red-50/10 dark:bg-red-950/5" />
                          <TableCell />
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!fetched && !loading && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <BarChart3 className="h-12 w-12 opacity-20" />
          <p className="text-sm">Pilih bulan dan tahun, lalu klik <strong className="text-muted-foreground/80">Tampilkan Rekap</strong></p>
        </div>
      )}
    </div>
  );
}
