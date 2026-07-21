"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, RefreshCw, Search, TrendingUp, Filter, AlertTriangle } from "lucide-react";

interface RekapRow {
  guru_id: number;
  nama_guru: string;
  nip: string;
  total_hadir: number;
  total_terlambat: number;
  total_izin: number;
  total_sakit: number;
  total_alpa: number;
  total_jurnal: number;
  persentase: number;
  hadir_tanpa_jurnal: number;
}
interface Guru { id: number; nama: string; nip?: string }

function pctColor(p: number) {
  if (p >= 90) return "text-green-500 font-bold";
  if (p >= 75) return "text-blue-400 font-semibold";
  if (p >= 60) return "text-yellow-400";
  return "text-red-400";
}

export default function AbsensiGuruPage() {
  const [rekap, setRekap]     = useState<RekapRow[]>([]);
  const [guruList, setGuru]   = useState<Guru[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStart, setFilterStart] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [filterEnd, setFilterEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterGuru, setFilterGuru] = useState("all");
  const [search, setSearch]         = useState("");

  const fetchMaster = useCallback(async () => {
    try {
      const r = await api.get("/master/guru?limit=500");
      setGuru(r.data.data ?? []);
    } catch {}
  }, []);

  const fetchRekap = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { start_date: filterStart, end_date: filterEnd };
      if (filterGuru !== "all") params.guru_id = filterGuru;
      const r = await api.get("/reports/rekap-absensi-guru", { params });
      setRekap(r.data.data ?? []);
    } catch {
      toast.error("Gagal memuat rekap absensi guru");
    } finally {
      setLoading(false);
    }
  }, [filterStart, filterEnd, filterGuru]);

  useEffect(() => { fetchMaster(); }, []);
  useEffect(() => { fetchRekap(); }, [filterStart, filterEnd, filterGuru]);

  const displayed = rekap.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.nama_guru.toLowerCase().includes(q) || r.nip.toLowerCase().includes(q);
  });

  const total = displayed.length;
  const avgPct = total > 0 ? (displayed.reduce((s, r) => s + r.persentase, 0) / total).toFixed(1) : "0";
  const totalJurnalKurang = displayed.filter(r => r.hadir_tanpa_jurnal > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-primary" />
          Laporan Absensi Guru
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rekap kehadiran harian (scan QR) + jurnal mengajar per guru
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Rata-rata Kehadiran
            </div>
            <div className={`text-3xl font-bold ${pctColor(parseFloat(avgPct))}`}>{avgPct}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">{total} guru</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Hadir</div>
            <div className="text-2xl font-bold text-green-500">
              {displayed.reduce((s, r) => s + r.total_hadir + r.total_terlambat, 0)}
            </div>
            <div className="text-xs text-muted-foreground">hari (termasuk terlambat)</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Jurnal Terisi</div>
            <div className="text-2xl font-bold text-blue-400">
              {displayed.reduce((s, r) => s + r.total_jurnal, 0)}
            </div>
            <div className="text-xs text-muted-foreground">entri jurnal</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" /> Hadir Tanpa Jurnal
            </div>
            <div className="text-2xl font-bold text-orange-400">{totalJurnalKurang}</div>
            <div className="text-xs text-muted-foreground">guru perlu perhatian</div>
          </CardContent>
        </Card>
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
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Guru</Label>
              <Select value={filterGuru} onValueChange={v => setFilterGuru(v ?? "all")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Semua Guru" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Guru</SelectItem>
                  {guruList.map(g => (
                    <SelectItem key={g.id} value={String(g.id)} label={g.nama}>{g.nama}</SelectItem>
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
            <Input className="pl-9 h-8 text-sm" placeholder="Cari nama guru atau NIP…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/40">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Rekap Absensi & Jurnal Guru ({displayed.length} guru)</span>
            <span className="text-xs font-normal text-muted-foreground">{filterStart} s/d {filterEnd}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Memuat…</div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <UserCheck className="w-8 h-8 opacity-30" />
              Tidak ada data pada periode ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8">No</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead className="text-center">Hadir</TableHead>
                    <TableHead className="text-center">Terlambat</TableHead>
                    <TableHead className="text-center">Izin</TableHead>
                    <TableHead className="text-center">Sakit</TableHead>
                    <TableHead className="text-center">Alpa</TableHead>
                    <TableHead className="text-center">Jurnal Terisi</TableHead>
                    <TableHead className="text-center">Hadir Tanpa Jurnal</TableHead>
                    <TableHead className="text-center min-w-[120px]">% Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((r, idx) => (
                    <TableRow key={r.guru_id} className={`text-sm ${r.hadir_tanpa_jurnal > 0 ? "bg-orange-500/5" : ""}`}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{r.nama_guru}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.nip || "—"}</TableCell>
                      <TableCell className="text-center text-green-500 font-semibold">{r.total_hadir}</TableCell>
                      <TableCell className="text-center text-yellow-400">{r.total_terlambat}</TableCell>
                      <TableCell className="text-center text-blue-400">{r.total_izin}</TableCell>
                      <TableCell className="text-center text-orange-400">{r.total_sakit}</TableCell>
                      <TableCell className="text-center text-red-400">{r.total_alpa}</TableCell>
                      <TableCell className="text-center text-blue-400 font-semibold">{r.total_jurnal}</TableCell>
                      <TableCell className="text-center">
                        {r.hadir_tanpa_jurnal > 0 ? (
                          <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                            {r.hadir_tanpa_jurnal} hari
                          </Badge>
                        ) : (
                          <span className="text-green-500 text-xs">✓ Lengkap</span>
                        )}
                      </TableCell>
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
