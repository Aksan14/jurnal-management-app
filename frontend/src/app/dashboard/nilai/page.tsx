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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap, Plus, Pencil, Trash2, Search,
  BookOpen, Star, TrendingUp, Filter, RefreshCw
} from "lucide-react";

const JENIS_NILAI = ["Tugas", "UH", "UTS", "UAS"];

const JENIS_COLOR: Record<string, string> = {
  Tugas: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  UH:    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  UTS:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
  UAS:   "bg-red-500/20 text-red-400 border-red-500/30",
};

function nilaiColor(n: number) {
  if (n >= 90) return "text-green-500 font-bold";
  if (n >= 75) return "text-blue-400 font-semibold";
  if (n >= 60) return "text-yellow-400";
  return "text-red-400";
}

function nilaiLabel(n: number) {
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "E";
}

export default function NilaiPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "";
  const isGuru = ["guru", "wali_kelas", "admin", "super_admin"].includes(role);
  const isSiswa = role === "siswa";

  // Data
  const [nilaiList, setNilaiList]   = useState<any[]>([]);
  const [mapelList, setMapelList]   = useState<any[]>([]);
  const [siswaList, setSiswaList]   = useState<any[]>([]);
  const [mySiswaID, setMySiswaID]   = useState<number>(0);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [filterSiswa,  setFilterSiswa]  = useState("all");
  const [filterMapel,  setFilterMapel]  = useState("all");
  const [filterJenis,  setFilterJenis]  = useState("all");
  const [search,       setSearch]       = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editData,   setEditData]     = useState<any>(null);
  const [delConfirm, setDelConfirm]   = useState<any>(null);
  const [saving,     setSaving]       = useState(false);

  // Form
  const [form, setForm] = useState({
    siswa_id:    "",
    mapel_id:    "",
    jenis_nilai: "",
    nilai:       "",
    keterangan:  "",
  });

  // ── Fetch siswa profile (for siswa role) ─────────────────────────────────
  const resolveSiswaID = useCallback(async () => {
    if (!isSiswa) return;
    try {
      const r = await api.get("/profile");
      setMySiswaID(r.data.data?.siswa?.id ?? 0);
    } catch {}
  }, [isSiswa]);

  // ── Fetch master data ────────────────────────────────────────────────────
  const fetchMaster = useCallback(async () => {
    try {
      const [mapelRes, siswaRes] = await Promise.all([
        api.get("/master/mapel?limit=200"),
        isGuru ? api.get("/master/siswa?limit=500") : Promise.resolve({ data: { data: [] } }),
      ]);
      setMapelList(mapelRes.data.data ?? []);
      setSiswaList(siswaRes.data.data ?? []);
    } catch {}
  }, [isGuru]);

  // ── Fetch nilai ───────────────────────────────────────────────────────────
  const fetchNilai = useCallback(async (siswaIDOverride?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      const sid = isSiswa ? (siswaIDOverride ?? mySiswaID) : (filterSiswa !== "all" ? filterSiswa : "");
      if (sid) params.set("siswa_id", String(sid));
      if (filterMapel !== "all") params.set("mapel_id", filterMapel);
      if (filterJenis !== "all") params.set("jenis_nilai", filterJenis);
      const r = await api.get(`/nilai?${params.toString()}`);
      setNilaiList(r.data.data ?? []);
    } catch (e: any) {
      toast.error("Gagal memuat data nilai");
    } finally {
      setLoading(false);
    }
  }, [isSiswa, mySiswaID, filterSiswa, filterMapel, filterJenis]);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await fetchMaster();
      if (isSiswa) {
        try {
          const r = await api.get("/profile");
          const sid = r.data.data?.siswa?.id ?? 0;
          setMySiswaID(sid);
          await fetchNilai(sid);
        } catch { setLoading(false); }
      } else {
        await fetchNilai();
      }
    };
    init();
  }, []);

  // Re-fetch on filter change (guru only)
  useEffect(() => {
    if (!isSiswa && !loading) fetchNilai();
  }, [filterSiswa, filterMapel, filterJenis]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = JENIS_NILAI.map((j) => {
    const arr = nilaiList.filter((n) => n.jenis_nilai === j).map((n) => n.nilai);
    const avg = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    return { jenis: j, count: arr.length, avg };
  });

  const overallAvg = nilaiList.length
    ? (nilaiList.reduce((a, n) => a + n.nilai, 0) / nilaiList.length).toFixed(1)
    : null;

  // ── Search filter ─────────────────────────────────────────────────────────
  const displayed = nilaiList.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.siswa?.nama?.toLowerCase().includes(q) ||
      n.mapel?.nama_mapel?.toLowerCase().includes(q) ||
      String(n.nilai).includes(q)
    );
  });

  // ── Open dialog ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditData(null);
    setForm({ siswa_id: "", mapel_id: "", jenis_nilai: "", nilai: "", keterangan: "" });
    setDialogOpen(true);
  };
  const openEdit = (n: any) => {
    setEditData(n);
    setForm({
      siswa_id:    String(n.siswa_id),
      mapel_id:    String(n.mapel_id),
      jenis_nilai: n.jenis_nilai,
      nilai:       String(n.nilai),
      keterangan:  n.keterangan ?? "",
    });
    setDialogOpen(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.siswa_id || !form.mapel_id || !form.jenis_nilai || !form.nilai) {
      toast.error("Semua field wajib diisi");
      return;
    }
    const num = parseFloat(form.nilai);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error("Nilai harus antara 0 – 100");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        siswa_id:    parseInt(form.siswa_id),
        mapel_id:    parseInt(form.mapel_id),
        jenis_nilai: form.jenis_nilai,
        nilai:       num,
        keterangan:  form.keterangan,
      };
      if (editData) {
        await api.put(`/nilai/${editData.id}`, payload);
        toast.success("Nilai berhasil diperbarui");
      } else {
        await api.post("/nilai", payload);
        toast.success("Nilai berhasil disimpan");
      }
      setDialogOpen(false);
      fetchNilai();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan nilai");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/nilai/${id}`);
      toast.success("Nilai dihapus");
      setDelConfirm(null);
      fetchNilai();
    } catch {
      toast.error("Gagal menghapus nilai");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Penilaian Siswa
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isSiswa ? "Rekap nilai akademik Anda" : "Manajemen nilai siswa per mata pelajaran"}
          </p>
        </div>
        {isGuru && (
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Input Nilai
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="col-span-2 sm:col-span-1 lg:col-span-1 border-border/40">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="w-3.5 h-3.5" /> Rata-rata Keseluruhan
            </div>
            <div className={`text-3xl font-bold ${overallAvg ? nilaiColor(parseFloat(overallAvg)) : "text-muted-foreground"}`}>
              {overallAvg ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">{nilaiList.length} total nilai</div>
          </CardContent>
        </Card>
        {stats.map((s) => (
          <Card key={s.jenis} className="border-border/40">
            <CardContent className="p-4 flex flex-col gap-1">
              <Badge variant="outline" className={`${JENIS_COLOR[s.jenis]} text-xs w-fit`}>{s.jenis}</Badge>
              <div className={`text-2xl font-bold ${s.avg != null ? nilaiColor(s.avg) : "text-muted-foreground"}`}>
                {s.avg != null ? s.avg.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{s.count} nilai</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters (guru only) */}
      {isGuru && (
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
                <Filter className="w-4 h-4" /> Filter:
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Siswa</Label>
                <Select value={filterSiswa} onValueChange={setFilterSiswa}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Semua Siswa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Siswa</SelectItem>
                    {siswaList.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nama} — {s.kelas?.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Mata Pelajaran</Label>
                <Select value={filterMapel} onValueChange={setFilterMapel}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Semua Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {mapelList.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nama_mapel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[130px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Jenis Nilai</Label>
                <Select value={filterJenis} onValueChange={setFilterJenis}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    {JENIS_NILAI.map((j) => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchNilai()} className="h-8 gap-1.5 shrink-0">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Daftar Nilai {isSiswa && "Saya"}
              <span className="text-muted-foreground font-normal text-sm">({displayed.length} data)</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama / mapel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm w-52"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Memuat data...
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <GraduationCap className="w-10 h-10 opacity-30" />
              <p className="text-sm">Belum ada data nilai</p>
              {isGuru && (
                <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Input Nilai Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    {isGuru && <TableHead>Siswa</TableHead>}
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-center">Nilai</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Dinilai Oleh</TableHead>
                    {isGuru && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((n: any) => (
                    <TableRow key={n.id} className="border-border/20">
                      {isGuru && (
                        <TableCell>
                          <div className="font-medium text-sm">{n.siswa?.nama ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{n.siswa?.user?.username}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="font-medium text-sm">{n.mapel?.nama_mapel ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{n.mapel?.kode_mapel}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${JENIS_COLOR[n.jenis_nilai]} text-xs`}>
                          {n.jenis_nilai}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-lg ${nilaiColor(n.nilai)}`}>{n.nilai}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-base font-bold ${nilaiColor(n.nilai)}`}>
                          {nilaiLabel(n.nilai)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {n.keterangan || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {n.guru?.nama ?? "—"}
                      </TableCell>
                      {isGuru && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(n)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDelConfirm(n)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog Input / Edit Nilai ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              {editData ? "Edit Nilai" : "Input Nilai"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Siswa */}
            <div className="space-y-1.5">
              <Label>Siswa <span className="text-destructive">*</span></Label>
              <Select value={form.siswa_id} onValueChange={(v) => setForm((f) => ({ ...f, siswa_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih siswa..." />
                </SelectTrigger>
                <SelectContent>
                  {siswaList.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nama} — {s.kelas?.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mapel */}
            <div className="space-y-1.5">
              <Label>Mata Pelajaran <span className="text-destructive">*</span></Label>
              <Select value={form.mapel_id} onValueChange={(v) => setForm((f) => ({ ...f, mapel_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata pelajaran..." />
                </SelectTrigger>
                <SelectContent>
                  {mapelList.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nama_mapel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jenis & Nilai dalam satu row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis Nilai <span className="text-destructive">*</span></Label>
                <Select value={form.jenis_nilai} onValueChange={(v) => setForm((f) => ({ ...f, jenis_nilai: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_NILAI.map((j) => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nilai (0–100) <span className="text-destructive">*</span>
                  {form.nilai && !isNaN(parseFloat(form.nilai)) && (
                    <span className={`ml-2 font-bold ${nilaiColor(parseFloat(form.nilai))}`}>
                      {nilaiLabel(parseFloat(form.nilai))}
                    </span>
                  )}
                </Label>
                <Input
                  type="number" min={0} max={100} step={0.5}
                  placeholder="mis. 85"
                  value={form.nilai}
                  onChange={(e) => setForm((f) => ({ ...f, nilai: e.target.value }))}
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Textarea
                placeholder="Catatan tambahan..."
                value={form.keterangan}
                onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editData ? "Simpan Perubahan" : "Simpan Nilai"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Konfirmasi Hapus ───────────────────────────────────────── */}
      <Dialog open={!!delConfirm} onOpenChange={() => setDelConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Hapus Nilai
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus nilai <span className="font-semibold text-foreground">{delConfirm?.jenis_nilai} {delConfirm?.nilai}</span>{" "}
            untuk <span className="font-semibold text-foreground">{delConfirm?.siswa?.nama}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDelConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => handleDelete(delConfirm?.id)}>
              Ya, Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
