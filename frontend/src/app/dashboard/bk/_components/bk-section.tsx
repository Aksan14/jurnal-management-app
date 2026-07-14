"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { Plus, Search, Calendar, Upload, FileText, X, Eye, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type BKTab = "konseling" | "pelanggaran" | "prestasi" | "psikotes" | "proyek";

import { getBackendUrl } from "@/lib/utils";

const BACKEND_URL = getBackendUrl();

const tabConfig: Record<BKTab, { title: string; description: string; endpoint: string; dialogTitle: string }> = {
  konseling: {
    title: "Sesi Konseling",
    description: "Pencatatan sesi bimbingan dan konseling siswa.",
    endpoint: "/bk/konseling",
    dialogTitle: "Catat Sesi Bimbingan Baru",
  },
  pelanggaran: {
    title: "Pelanggaran & Poin",
    description: "Pencatatan poin pelanggaran tata tertib siswa.",
    endpoint: "/bk/pelanggaran",
    dialogTitle: "Log Pelanggaran Siswa",
  },
  prestasi: {
    title: "Prestasi",
    description: "Pencatatan prestasi akademik dan non-akademik siswa.",
    endpoint: "/bk/prestasi",
    dialogTitle: "Log Prestasi Siswa",
  },
  psikotes: {
    title: "Hasil Psikotes",
    description: "Pencatatan dan pengelolaan hasil tes psikologi siswa.",
    endpoint: "/bk/tes-psikologi",
    dialogTitle: "Unggah Hasil Psikotes",
  },
  proyek: {
    title: "Proyek BK",
    description: "Manajemen proyek dan program bimbingan konseling.",
    endpoint: "/bk/proyek",
    dialogTitle: "Buat Proyek BK Baru",
  },
};

export default function BKSection({ tab }: { tab: BKTab }) {
  const { user } = useAuthStore();
  const cfg = tabConfig[tab];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [psikotesFile, setPsikotesFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePreview = async (fileUrl: string) => {
    setPreviewUrl(fileUrl);
    setPreviewBlobUrl(null);
    setPreviewLoading(true);
    try {
      const fullUrl = `${BACKEND_URL}${fileUrl}`;
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(blobUrl);
    } catch {
      toast.error("Gagal memuat dokumen");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewUrl(null);
    setPreviewBlobUrl(null);
  };
  const [formData, setFormData] = useState<any>({
    tanggal: new Date().toISOString().substring(0, 10),
    tanggal_mulai: new Date().toISOString().substring(0, 10),
    tanggal_selesai: new Date().toISOString().substring(0, 10),
    status: "Proses",
    tipe: "Pribadi",
    kategori: "Akademik",
    poin: "10",
    siswa_id: "",
    kelas_id: "",
    masalah: "",
    solusi: "",
    nama_pelanggaran: "",
    keterangan: "",
    nama_prestasi: "",
    tingkat: "",
    jenis_tes: "",
    hasil: "",
    rekomendasi: "",
    file_url: "",
    nama_proyek: "",
    deskripsi: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(cfg.endpoint);
      setData(res.data.data || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.get("/master/siswa").then(r => setStudents(r.data.data || [])).catch(() => {});
    api.get("/master/kelas").then(r => setClasses(r.data.data || [])).catch(() => {});
  }, [tab]);

  const handleOpenAdd = () => {
    setFormData({
      tanggal: new Date().toISOString().substring(0, 10),
      tanggal_mulai: new Date().toISOString().substring(0, 10),
      tanggal_selesai: new Date().toISOString().substring(0, 10),
      status: tab === "proyek" ? "planning" : tab === "konseling" ? "Proses" : "Aktif",
      tipe: "Pribadi",
      kategori: "Akademik",
      poin: "10",
      siswa_id: "",
      kelas_id: "",
      masalah: "",
      solusi: "",
      nama_pelanggaran: "",
      keterangan: "",
      nama_prestasi: "",
      tingkat: "",
      jenis_tes: "",
      hasil: "",
      rekomendasi: "",
      file_url: "",
      nama_proyek: "",
      deskripsi: "",
    });
    setPsikotesFile(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.siswa_id) payload.siswa_id = Number(payload.siswa_id);
      if (payload.kelas_id) payload.kelas_id = Number(payload.kelas_id);
      if (payload.poin) payload.poin = Number(payload.poin);

      // Upload file psikotes jika ada
      if (tab === "psikotes" && psikotesFile) {
        const fd = new FormData();
        fd.append("file", psikotesFile);
        const uploadRes = await api.post("/upload/psikotes", fd, { headers: { "Content-Type": "multipart/form-data" } });
        payload.file_url = uploadRes.data.data?.url || "";
      }

      await api.post(cfg.endpoint, payload);
      toast.success("Catatan BK berhasil disimpan");
      setPsikotesFile(null);
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan catatan");
    }
  };

  const isBKStaff = ["super_admin", "guru_bk", "counselor"].includes(user?.role || "");

  const filteredData = data.filter((item: any) => {
    const s = search.toLowerCase();
    return (
      (item.siswa?.nama || "").toLowerCase().includes(s) ||
      (item.masalah || "").toLowerCase().includes(s) ||
      (item.nama_pelanggaran || "").toLowerCase().includes(s) ||
      (item.nama_prestasi || "").toLowerCase().includes(s) ||
      (item.nama_proyek || "").toLowerCase().includes(s) ||
      (item.jenis_tes || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{cfg.title}</h1>
          <p className="text-gray-400 text-sm">{cfg.description}</p>
        </div>
        {isBKStaff && (
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/95 gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Catat Baru
          </Button>
        )}
      </div>

      <Card className="bg-[#111420] border-border/30 text-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">{cfg.title}</CardTitle>
            <CardDescription className="text-gray-400">Total catatan: {filteredData.length}</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#161a2b] border-border/30 text-white placeholder-gray-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Belum ada catatan terdaftar</div>
          ) : (
            <Table>
              <TableHeader className="border-border/30">
                <TableRow className="hover:bg-white/5 border-border/30">
                  <TableHead className="text-gray-400">{tab === "proyek" ? "Mulai" : "Tanggal"}</TableHead>
                  <TableHead className="text-gray-400">{tab === "proyek" ? "Kelas Target" : "Nama Siswa"}</TableHead>
                  {tab === "konseling" && (<><TableHead className="text-gray-400">Tipe</TableHead><TableHead className="text-gray-400">Masalah</TableHead><TableHead className="text-gray-400">Status</TableHead></>)}
                  {tab === "pelanggaran" && (<><TableHead className="text-gray-400">Pelanggaran</TableHead><TableHead className="text-gray-400 text-center">Poin</TableHead><TableHead className="text-gray-400">Keterangan</TableHead></>)}
                  {tab === "prestasi" && (<><TableHead className="text-gray-400">Nama Prestasi</TableHead><TableHead className="text-gray-400">Kategori</TableHead><TableHead className="text-gray-400">Tingkat</TableHead></>)}
                  {tab === "psikotes" && (<><TableHead className="text-gray-400">Jenis Tes</TableHead><TableHead className="text-gray-400">Rekomendasi</TableHead><TableHead className="text-gray-400">Dokumen</TableHead></>)}
                  {tab === "proyek" && (<><TableHead className="text-gray-400">Nama Proyek</TableHead><TableHead className="text-gray-400">Deskripsi</TableHead><TableHead className="text-gray-400">Status</TableHead></>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id || item.ID} className="hover:bg-white/5 border-border/20">
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(tab === "proyek" ? item.tanggal_mulai : (item.tanggal || item.created_at)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {tab === "proyek"
                        ? (item.kelas?.nama_kelas || classes.find(c => String(c.id || c.ID) === String(item.kelas_id))?.nama_kelas || "-")
                        : (item.siswa?.nama || students.find(s => String(s.id || s.ID) === String(item.siswa_id))?.nama || "-")}
                    </TableCell>
                    {tab === "konseling" && (<><TableCell><Badge variant="outline" className="bg-[#161a2b] text-primary border-primary/20">{item.tipe}</Badge></TableCell><TableCell className="text-gray-300 max-w-xs truncate">{item.masalah}</TableCell><TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === "Selesai" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{item.status}</span></TableCell></>)}
                    {tab === "pelanggaran" && (<><TableCell className="text-white">{item.nama_pelanggaran}</TableCell><TableCell className="text-center font-bold text-red-400">+{item.poin}</TableCell><TableCell className="text-gray-400 text-xs">{item.keterangan || "-"}</TableCell></>)}
                    {tab === "prestasi" && (<><TableCell className="text-white">{item.nama_prestasi}</TableCell><TableCell className="text-gray-300">{item.kategori}</TableCell><TableCell className="text-emerald-400 font-semibold">{item.tingkat}</TableCell></>)}
                    {tab === "psikotes" && (<><TableCell className="text-white">{item.jenis_tes}</TableCell><TableCell className="text-gray-300 max-w-xs truncate">{item.rekomendasi || "-"}</TableCell><TableCell>{item.file_url ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handlePreview(item.file_url)} className="flex items-center gap-1 text-primary text-xs hover:underline">
                            <Eye className="h-3 w-3" />Tinjau
                          </button>
                          <a href={`${BACKEND_URL}${item.file_url}`} download target="_blank" rel="noreferrer" className="flex items-center gap-1 text-gray-400 text-xs hover:text-white ml-2">
                            <Download className="h-3 w-3" />Unduh
                          </a>
                        </div>
                      ) : <span className="text-gray-500 text-xs">-</span>}</TableCell></>)}
                    {tab === "proyek" && (<><TableCell className="text-white font-semibold">{item.nama_proyek}</TableCell><TableCell className="text-gray-300 max-w-xs truncate">{item.deskripsi || "-"}</TableCell><TableCell><Badge variant="outline" className={`text-xs font-semibold capitalize ${item.status === "completed" || item.status === "Selesai" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>{item.status}</Badge></TableCell></>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{cfg.dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Siswa picker */}
            {tab !== "proyek" && (
              <div className="space-y-1">
                <Label className="text-gray-300">Pilih Siswa</Label>
                <Select value={formData.siswa_id ? String(formData.siswa_id) : ""} onValueChange={(val) => setFormData({ ...formData, siswa_id: val })}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30">
                    <SelectValue placeholder="Pilih Siswa">
                      {formData.siswa_id
                        ? (() => { const s = students.find(s => String(s.id || s.ID) === String(formData.siswa_id)); return s ? `${s.nama} (${s.kelas?.nama_kelas || "Tanpa Kelas"})` : "Pilih Siswa"; })()
                        : "Pilih Siswa"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    {students.map((s) => (<SelectItem key={s.id || s.ID} value={String(s.id || s.ID)}>{s.nama} ({s.kelas?.nama_kelas || "Tanpa Kelas"})</SelectItem>))}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
            )}
            {tab === "proyek" && (
              <div className="space-y-1">
                <Label className="text-gray-300">Pilih Kelas Target</Label>
                <Select value={formData.kelas_id ? String(formData.kelas_id) : ""} onValueChange={(val) => setFormData({ ...formData, kelas_id: val })}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30">
                    <SelectValue placeholder="Pilih Kelas">
                      {formData.kelas_id
                        ? (classes.find(c => String(c.id || c.ID) === String(formData.kelas_id))?.nama_kelas || "Pilih Kelas")
                        : "Pilih Kelas"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    {classes.map((c) => (<SelectItem key={c.id || c.ID} value={String(c.id || c.ID)}>{c.nama_kelas}</SelectItem>))}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
            )}

            {/* Tanggal */}
            {tab !== "proyek" && (
              <div className="space-y-1">
                <Label className="text-gray-300">Tanggal</Label>
                <Input type="date" value={formData.tanggal || ""} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
            )}

            {/* Konseling fields */}
            {tab === "konseling" && (<>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-gray-300">Tipe Layanan</Label>
                  <Select value={formData.tipe} onValueChange={(val) => setFormData({ ...formData, tipe: val })}>
                    <SelectTrigger className="bg-[#161a2b] border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      {["Pribadi","Sosial","Belajar","Karir"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Status Sesi</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger className="bg-[#161a2b] border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      <SelectItem value="Proses">Dalam Proses</SelectItem>
                      <SelectItem value="Selesai">Selesai</SelectItem>
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-gray-300">Masalah / Keluhan</Label><Textarea value={formData.masalah || ""} onChange={(e) => setFormData({ ...formData, masalah: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="Deskripsikan masalah siswa" required /></div>
              <div className="space-y-1"><Label className="text-gray-300">Solusi Alternatif</Label><Textarea value={formData.solusi || ""} onChange={(e) => setFormData({ ...formData, solusi: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="Alternatif jalan keluar" /></div>
            </>)}

            {/* Pelanggaran fields */}
            {tab === "pelanggaran" && (<>
              <div className="space-y-1"><Label className="text-gray-300">Bentuk Pelanggaran</Label><Input value={formData.nama_pelanggaran || ""} onChange={(e) => setFormData({ ...formData, nama_pelanggaran: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="e.g. Terlambat masuk sekolah" required /></div>
              <div className="space-y-1">
                <Label className="text-gray-300">Bobot Poin Sanksi</Label>
                <Select value={formData.poin} onValueChange={(val) => setFormData({ ...formData, poin: val })}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="5">5 Poin (Ringan)</SelectItem>
                    <SelectItem value="10">10 Poin (Sedang)</SelectItem>
                    <SelectItem value="25">25 Poin (Berat)</SelectItem>
                    <SelectItem value="75">75 Poin (Sangat Berat)</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-gray-300">Keterangan</Label><Textarea value={formData.keterangan || ""} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" /></div>
            </>)}

            {/* Prestasi fields */}
            {tab === "prestasi" && (<>
              <div className="space-y-1"><Label className="text-gray-300">Nama Penghargaan / Lomba</Label><Input value={formData.nama_prestasi || ""} onChange={(e) => setFormData({ ...formData, nama_prestasi: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="e.g. Juara 1 Olimpiade Matematika" required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-gray-300">Kategori</Label>
                  <Select value={formData.kategori} onValueChange={(val) => setFormData({ ...formData, kategori: val })}>
                    <SelectTrigger className="bg-[#161a2b] border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      <SelectItem value="Akademik">Akademik</SelectItem>
                      <SelectItem value="Non-Akademik">Non-Akademik</SelectItem>
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Tingkat</Label>
                  <Select value={formData.tingkat} onValueChange={(val) => setFormData({ ...formData, tingkat: val })}>
                    <SelectTrigger className="bg-[#161a2b] border-border/30"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      {["Sekolah","Kecamatan","Kabupaten","Provinsi","Nasional","Internasional"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-gray-300">Keterangan</Label><Textarea value={formData.keterangan || ""} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" /></div>
            </>)}

            {/* Psikotes fields */}
            {tab === "psikotes" && (<>
              <div className="space-y-1"><Label className="text-gray-300">Nama / Jenis Tes</Label><Input value={formData.jenis_tes || ""} onChange={(e) => setFormData({ ...formData, jenis_tes: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="e.g. Tes Kepribadian MBTI, Tes IQ" required /></div>
              <div className="space-y-1"><Label className="text-gray-300">Hasil Tes Ringkas</Label><Textarea value={formData.hasil || ""} onChange={(e) => setFormData({ ...formData, hasil: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="e.g. Skor IQ 120, Kepribadian INFP" required /></div>
              <div className="space-y-1"><Label className="text-gray-300">Rekomendasi Konselor</Label><Textarea value={formData.rekomendasi || ""} onChange={(e) => setFormData({ ...formData, rekomendasi: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="Saran penjurusan atau penanganan belajar" /></div>
              <div className="space-y-1">
                <Label className="text-gray-300">Unggah Dokumen Hasil (PDF / DOC / Gambar)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setPsikotesFile(e.target.files?.[0] || null)}
                />
                {psikotesFile ? (
                  <div className="flex items-center gap-2 bg-[#161a2b] border border-border/30 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-white truncate flex-1">{psikotesFile.name}</span>
                    <button type="button" onClick={() => { setPsikotesFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                      <X className="h-4 w-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 justify-center border border-dashed border-border/40 rounded-lg px-3 py-4 text-sm text-gray-400 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Klik untuk pilih file (PDF, DOC, JPG, PNG)
                  </button>
                )}
              </div>
            </>)}

            {/* Proyek fields */}
            {tab === "proyek" && (<>
              <div className="space-y-1"><Label className="text-gray-300">Nama Proyek</Label><Input value={formData.nama_proyek || ""} onChange={(e) => setFormData({ ...formData, nama_proyek: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="e.g. Pembinaan Karakter Remaja" required /></div>
              <div className="space-y-1"><Label className="text-gray-300">Deskripsi Proyek</Label><Textarea value={formData.deskripsi || ""} onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="Tujuan dan deskripsi proyek" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label className="text-gray-300">Tanggal Mulai</Label><Input type="date" value={formData.tanggal_mulai || ""} onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" required /></div>
                <div className="space-y-1"><Label className="text-gray-300">Tanggal Selesai</Label><Input type="date" value={formData.tanggal_selesai || ""} onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" /></div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Status Proyek</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30"><SelectValue placeholder="Pilih status" /></SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="planning">Perencanaan</SelectItem>
                    <SelectItem value="in_progress">Sedang Berjalan</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
            </>)}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-gray-400">Batal</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/95 text-white">Simpan Catatan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal Dokumen/Gambar Psikotes */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClosePreview}
        >
          <div
            className="relative bg-[#111420] border border-border/30 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-white text-sm font-medium">Tinjau Dokumen Psikotes</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${BACKEND_URL}${previewUrl}`}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh
                </a>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-2 min-h-0">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
              ) : previewBlobUrl ? (
                /\.(jpg|jpeg|png|gif|webp)$/i.test(previewUrl) ? (
                  <div className="flex items-center justify-center h-full min-h-100">
                    <img src={previewBlobUrl} alt="Dokumen Psikotes" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
                  </div>
                ) : /\.pdf$/i.test(previewUrl) ? (
                  <iframe src={previewBlobUrl} className="w-full rounded-lg" style={{ height: "75vh" }} title="Dokumen PDF" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
                    <FileText className="h-16 w-16 text-primary/50" />
                    <p className="text-sm">Format ini tidak dapat dipratinjau. Silakan unduh.</p>
                    <a href={previewBlobUrl} download className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                      <Download className="h-4 w-4" /> Unduh Dokumen
                    </a>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 text-sm">Gagal memuat dokumen</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
