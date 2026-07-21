"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Users, RefreshCw, Search, TrendingUp, Filter } from "lucide-react";

interface RekapRow {
  siswa_id: number;
  nama_siswa: string;
  nis: string;
  nama_kelas: string;
  total_hadir: number;
  total_sakit: number;
  total_izin: number;
  total_alpha: number;
  total_hari: number;
  persentase: number;
}
interface Kelas { id: number; nama_kelas: string }
interface Siswa { id: number; nama: string; nis: string }

function pctColor(p: number) {
  if (p >= 90) return "text-green-500 font-bold";
  if (p >= 75) return "text-blue-400 font-semibold";
  if (p >= 60) return "text-yellow-400";
  return "text-red-400";
}

export default function AbsensiSiswaPage() {
  const [rekap, setRekap]     = useState<RekapRow[]>([]);
  const [kelasList, setKelas] = useState<Kelas[]>([]);
  const [siswaList, setSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterStart,  setFilterStart]  = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [filterEnd,    setFilterEnd]    = useState(() => new Date().toISOString().split("T")[0]);
  const [filterKelas,  setFilterKelas]  = useState("all");
  const [filterSiswa,  setFilterSiswa]  = useState("all");
  const [search,       setSearch]       = useState("");

  const fetchMaster = useCallback(async () => {
    try {
      const [kRes, sRes] = await Promise.all([
        api.get("/master/kelas?limit=200"),
        api.get("/master/siswa?limit=500"),
      ]);
      setKelas(kRes.data.data ?? []);
      setSiswa(sRes.data.data ?? []);
    } catch {}
  }, []);

  const fetchRekap = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        start_date: filterStart,
        end_date:   filterEnd,
      };
      if (filterKelas !== "all") params.kelas_id  = filterKelas;
      if (filterSiswa !== "all") params.siswa_id  = filterSiswa;
      const r = await api.get("/reports/rekap-absensi-siswa", { params });
      setRekap(r.data.data ?? []);
    } catch {
      toast.error("Gagal memuat rekap absensi siswa");
    } finally {
      setLoading(false);
    }
  }, [filterStart, filterEnd, filterKelas, filterSiswa]);

  useEffect(() => { fetchMaster(); }, []);
  useEffect(() => { fetchRekap(); }, [filterStart, filterEnd, filterKelas, filterSiswa]);

  const displayed = rekap.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.nama_siswa.toLowerCase().includes(q) ||
           r.nis.toLowerCase().includes(q) ||
           r.nama_kelas.toLowerCase().includes(q);
  });

  // Aggregate stats
  const total = displayed.length;
  const avgPct = total > 0
    ? (displayed.reduce((s, r) => s + r.persentase, 0) / total).toFixed(1)
    : "0";
  const sumH = displayed.reduce((s, r) => s + r.total_hadir, 0);
  const sumS = displayed.reduce((s, r) => s + r.total_sakit, 0);
  const sumI = displayed.reduce((s, r) => s + r.total_izin, 0);
  const sumA = displayed.reduce((s, r) => s + r.total_alpha, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Laporan Absensi Siswa
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rekap kehadiran per siswa — data dari presensi jurnal guru dan scan QR harian
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-border/40 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Rata-rata Kehadiran
            </div>
            <div className={`text-3xl font-bold ${pctColor(parseFloat(avgPct))}`}>{avgPct}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">{total} siswa</div>
          </CardContent>
        </Card>
        {[
          { label: "Hadir (H)",  val: sumH, color: "text-green-500" },
          { label: "Sakit (S)",  val: sumS, color: "text-yellow-400" },
          { label: "Izin (I)",   val: sumI, color: "text-blue-400" },
          { label: "Alpha (A)", val: sumA, color: "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="border-border/40">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-muted-foreground">total catatan</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
              <Filter className="w-4 h-4" /> Filter:
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Dari</Label>
              <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Sampai</Label>
              <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Kelas</Label>
              <Select value={filterKelas} onValueChange={v => setFilterKelas(v ?? "all")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList.map(k => (
                    <SelectItem key={k.id} value={String(k.id)} label={k.nama_kelas}>{k.nama_kelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Siswa</Label>
              <Select value={filterSiswa} onValueChange={v => setFilterSiswa(v ?? "all")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Semua Siswa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Siswa</SelectItem>
                  {siswaList.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} label={`${s.nama} (${s.nis})`}>
                      {s.nama} — {s.nis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 shrink-0" onClick={fetchRekap}>
              <RefreshCw className="w-3.5 h-3.5" /> Muat
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-8 text-sm" placeholder="Cari nama, NIS, atau kelas…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/40">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Rekap Kehadiran ({displayed.length} siswa)</span>
            <span className="text-xs font-normal text-muted-foreground">{filterStart} s/d {filterEnd}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Memuat…</div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <Users className="w-8 h-8 opacity-30" />
              Tidak ada data pada periode ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8">No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">S</TableHead>
                    <TableHead className="text-center">I</TableHead>
                    <TableHead className="text-center">A</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center min-w-[120px]">% Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((r, idx) => (
                    <TableRow key={r.siswa_id} className="text-sm">
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{r.nama_siswa}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.nis}</TableCell>
                      <TableCell>{r.nama_kelas}</TableCell>
                      <TableCell className="text-center text-green-500 font-semibold">{r.total_hadir}</TableCell>
                      <TableCell className="text-center text-yellow-400">{r.total_sakit}</TableCell>
                      <TableCell className="text-center text-blue-400">{r.total_izin}</TableCell>
                      <TableCell className="text-center text-red-400">{r.total_alpha}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{r.total_hari}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.persentase >= 75 ? "bg-green-500" : "bg-red-400"}`}
                              style={{ width: `${Math.min(r.persentase, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${pctColor(r.persentase)}`}>
                            {r.persentase.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
