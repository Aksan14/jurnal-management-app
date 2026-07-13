'use client';

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface KelasSectionProps {
  search: string;
  isKepsek: boolean;
}

export default function KelasSection({ search, isKepsek }: KelasSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [jurusans, setJurusans] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail siswa per kelas
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKelas, setDetailKelas] = useState<any>(null);
  const [siswas, setSiswas] = useState<any[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  const [formData, setFormData] = useState<any>({
    nama_kelas: "",
    jurusan_id: "",
    wali_kelas_id: "",
    tahun_ajaran: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, jRes, gRes] = await Promise.all([
        api.get("/master/kelas"),
        api.get("/master/jurusan"),
        api.get("/master/guru"),
      ]);
      setData(res.data.data || []);
      setJurusans(jRes.data.data || []);
      setGurus(gRes.data.data || []);
    } catch {
      toast.error("Gagal memuat data kelas");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (item: any) => {
    setDetailKelas(item);
    setDetailOpen(true);
    setLoadingSiswa(true);
    try {
      const res = await api.get(`/master/siswa?kelas_id=${item.id || item.ID}&limit=200`);
      setSiswas(res.data.data || []);
    } catch {
      toast.error("Gagal memuat data siswa");
    } finally {
      setLoadingSiswa(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedItem(null);
    setFormData({
      nama_kelas: "",
      jurusan_id: "",
      wali_kelas_id: "",
      tahun_ajaran: "2025/2026"
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditMode(true);
    setSelectedItem(item);
    setFormData({
      nama_kelas: item.nama_kelas || "",
      jurusan_id: item.jurusan_id ? String(item.jurusan_id) : "",
      wali_kelas_id: item.wali_kelas_id ? String(item.wali_kelas_id) : "",
      tahun_ajaran: item.tahun_ajaran || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await api.delete(`/master/kelas/${id}`);
      toast.success("Data berhasil dihapus");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal menghapus data";
      if (err.response?.status === 409) {
        toast.warning(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jurusan_id) { toast.error("Jurusan wajib dipilih"); return; }
    if (!formData.wali_kelas_id) { toast.error("Wali Kelas wajib dipilih"); return; }
    setSubmitting(true);
    const payload = {
      nama_kelas: formData.nama_kelas,
      jurusan_id: parseInt(formData.jurusan_id, 10),
      wali_kelas_id: parseInt(formData.wali_kelas_id, 10),
      tahun_ajaran: formData.tahun_ajaran
    };
    try {
      if (editMode && selectedItem) {
        await api.put(`/master/kelas/${selectedItem.id || selectedItem.ID}`, payload);
        toast.success("Data berhasil diperbarui");
      } else {
        await api.post("/master/kelas", payload);
        toast.success("Data berhasil ditambahkan");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.nama_kelas?.toLowerCase().includes(q) ||
      item.tahun_ajaran?.toLowerCase().includes(q) ||
      item.wali_kelas?.nama?.toLowerCase().includes(q) ||
      String(item.id || item.ID).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {!isKepsek && (
        <div className="flex justify-end">
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/95 gap-2">
            <Plus className="h-4 w-4" /> Tambah Kelas
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Belum ada data tersedia</div>
      ) : (
        <Table>
          <TableHeader className="border-border/30">
            <TableRow className="hover:bg-white/5 border-border/30">
              <TableHead className="text-gray-400 w-16">ID</TableHead>
              <TableHead className="text-gray-400">Nama Kelas</TableHead>
              <TableHead className="text-gray-400">Jurusan</TableHead>
              <TableHead className="text-gray-400">Tahun Ajaran</TableHead>
              <TableHead className="text-gray-400">Wali Kelas</TableHead>
              <TableHead className="text-center text-gray-400 w-28">Siswa</TableHead>
              <TableHead className="text-right text-gray-400 w-36">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id || item.ID} className="hover:bg-white/5 border-border/20">
                <TableCell className="font-medium text-gray-400 text-sm">{item.id || item.ID}</TableCell>
                <TableCell className="text-white font-semibold">{item.nama_kelas}</TableCell>
                <TableCell className="text-gray-300">{item.jurusan?.nama_jurusan || "-"}</TableCell>
                <TableCell className="text-gray-300">{item.tahun_ajaran}</TableCell>
                <TableCell className="text-gray-300">{item.wali_kelas?.nama || "-"}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDetail(item)}
                    className="h-7 px-2 text-xs gap-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Lihat Siswa
                  </Button>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {!isKepsek && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-primary hover:bg-[#161a2b]">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id || item.ID)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editMode ? "Ubah Kelas" : "Tambah Kelas"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="nama_kelas" className="text-gray-300">Nama Kelas</Label>
              <Input
                id="nama_kelas"
                value={formData.nama_kelas}
                onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                className="bg-[#161a2b] border-border/30 text-white"
                placeholder="e.g. XII RPL 1"
                required
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-gray-300">Jurusan</Label>
              <Select
                value={formData.jurusan_id}
                onValueChange={(val) => { if (val) setFormData({ ...formData, jurusan_id: val }); }}
              >
                <SelectTrigger className="bg-[#161a2b] border-border/30 text-white">
                  <SelectValue placeholder="Pilih Jurusan">
                    {jurusans.find(j => String(j.id || j.ID) === formData.jurusan_id)?.nama_jurusan || "Pilih Jurusan"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                  {jurusans.map((j) => (
                    <SelectItem key={j.id || j.ID} value={String(j.id || j.ID)}>
                      {j.nama_jurusan}
                    </SelectItem>
                  ))}
                          </SelectGroup>
        </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Wali Kelas</Label>
              <Select
                value={formData.wali_kelas_id}
                onValueChange={(val) => { if (val) setFormData({ ...formData, wali_kelas_id: val }); }}
              >
                <SelectTrigger className="bg-[#161a2b] border-border/30 text-white">
                  <SelectValue placeholder="Pilih Guru Wali Kelas">
                    {gurus.find(g => String(g.id || g.ID) === formData.wali_kelas_id)?.nama || "Pilih Guru Wali Kelas"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                  {gurus.map((g) => (
                    <SelectItem key={g.id || g.ID} value={String(g.id || g.ID)}>
                      {g.nama}
                    </SelectItem>
                  ))}
                          </SelectGroup>
        </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tahun_ajaran" className="text-gray-300">Tahun Ajaran</Label>
              <Input
                id="tahun_ajaran"
                value={formData.tahun_ajaran}
                onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                className="bg-[#161a2b] border-border/30 text-white"
                placeholder="e.g. 2025/2026"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-gray-400" disabled={submitting}>Batal</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/95 text-white" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Dialog Detail Siswa per Kelas */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Daftar Siswa — {detailKelas?.nama_kelas}
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {detailKelas?.jurusan?.nama_jurusan} · {detailKelas?.tahun_ajaran} · Wali: {detailKelas?.wali_kelas?.nama || "-"}
                </p>
              </div>
              {!loadingSiswa && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs shrink-0">
                  {siswas.length} Siswa
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 mt-2">
            {loadingSiswa ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            ) : siswas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm">Belum ada siswa di kelas ini</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-white/5 border-border/30">
                    <TableHead className="text-gray-400 w-10 text-center">No</TableHead>
                    <TableHead className="text-gray-400">Nama</TableHead>
                    <TableHead className="text-gray-400">NIS</TableHead>
                    <TableHead className="text-gray-400">NISN</TableHead>
                    <TableHead className="text-gray-400 text-center">Gender</TableHead>
                    <TableHead className="text-gray-400 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siswas.map((s, idx) => (
                    <TableRow key={s.id || s.ID} className="hover:bg-white/5 border-border/20">
                      <TableCell className="text-center text-gray-500 text-sm">{idx + 1}</TableCell>
                      <TableCell className="text-white font-medium">{s.nama}</TableCell>
                      <TableCell className="text-gray-300 text-sm font-mono">{s.nis || "-"}</TableCell>
                      <TableCell className="text-gray-300 text-sm font-mono">{s.nisn || "-"}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.gender === "L" ? "bg-sky-500/15 text-sky-400" : "bg-pink-500/15 text-pink-400"}`}>
                          {s.gender === "L" ? "Laki-laki" : "Perempuan"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "Aktif" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
                          {s.status || "Aktif"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border/20">
            <Button variant="ghost" onClick={() => setDetailOpen(false)} className="text-gray-400">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
