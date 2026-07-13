'use client';

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, KeyRound, Link2, Users, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrangTuaSectionProps { search: string; isKepsek: boolean; }

const HUB_OPTIONS = ["Ayah", "Ibu", "Wali"];

export default function OrangTuaSection({ search, isKepsek }: OrangTuaSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [linkDialog, setLinkDialog] = useState(false);
  const [linkOrtuID, setLinkOrtuID] = useState<number | null>(null);
  const [linkOrtuNama, setLinkOrtuNama] = useState("");
  const [linkSiswaID, setLinkSiswaID] = useState("");
  const [linkHubungan, setLinkHubungan] = useState("Ayah");
  const [linking, setLinking] = useState(false);

  const [formData, setFormData] = useState({
    username: "", email: "", password: "", nama: "", phone: "", pekerjaan: "", alamat: "",
    siswaID: "", hubungan: "Ayah",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get("/master/orangtua?limit=200"),
        api.get("/master/siswa?limit=200&status=Aktif"),
      ]);
      setData(r1.data.data || []);
      setSiswaList(r2.data.data || []);
    } catch { toast.error("Gagal memuat data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = data.filter(d =>
    d.nama?.toLowerCase().includes(search.toLowerCase()) ||
    d.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
    d.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search)
  );

  const openCreate = () => {
    setEditMode(false);
    setSelectedItem(null);
    setFormData({ username: "", email: "", password: "", nama: "", phone: "", pekerjaan: "", alamat: "", siswaID: "", hubungan: "Ayah" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditMode(true);
    setSelectedItem(item);
    setFormData({ username: item.user?.username || "", email: item.user?.email || "", password: "", nama: item.nama, phone: item.phone || "", pekerjaan: item.pekerjaan || "", alamat: item.alamat || "", siswaID: "", hubungan: "Ayah" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMode && !formData.siswaID) {
      toast.error("Pilih siswa (anak) terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      if (editMode && selectedItem) {
        await api.put(`/master/orangtua/${selectedItem.id}`, { email: formData.email, nama: formData.nama, phone: formData.phone, pekerjaan: formData.pekerjaan, alamat: formData.alamat });
        toast.success("Data orang tua berhasil diperbarui");
      } else {
        const res = await api.post("/master/orangtua", {
          username: formData.username, email: formData.email, password: formData.password,
          nama: formData.nama, phone: formData.phone, pekerjaan: formData.pekerjaan, alamat: formData.alamat,
        });
        const ortuID = res.data.data?.id;
        // Langsung hubungkan ke siswa jika dipilih
        if (ortuID && formData.siswaID) {
          await api.post("/master/orangtua/link", {
            orang_tua_id: ortuID,
            siswa_id: Number(formData.siswaID),
            hubungan: formData.hubungan,
          });
          toast.success(`Akun orang tua dibuat & dihubungkan ke siswa sebagai ${formData.hubungan}`);
        } else {
          toast.success("Akun orang tua berhasil dibuat");
        }
      }
      setDialogOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal menyimpan data");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus akun orang tua "${nama}"?`)) return;
    try {
      await api.delete(`/master/orangtua/${id}`);
      toast.success("Akun berhasil dihapus");
      loadData();
    } catch (e: any) {
      if (e.response?.status === 409) toast.warning("Akun tidak dapat dihapus karena masih memiliki data terkait");
      else toast.error(e.response?.data?.message || "Gagal menghapus");
      loadData();
    }
  };

  const handleResetPassword = async (id: number, nama: string) => {
    if (!confirm(`Reset password akun orang tua "${nama}"?`)) return;
    try {
      const res = await api.post(`/master/orangtua/${id}/reset-password`);
      const pass = res.data.data?.password_baru;
      toast.success(`Password baru: ${pass}`, { duration: 10000, description: "Sampaikan password ini kepada orang tua murid." });
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal reset password");
    }
  };

  const openLinkDialog = (ortu: any) => {
    setLinkOrtuID(ortu.id);
    setLinkOrtuNama(ortu.nama);
    setLinkSiswaID("");
    setLinkHubungan("Ayah");
    setLinkDialog(true);
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSiswaID) return toast.error("Pilih siswa terlebih dahulu");
    setLinking(true);
    try {
      await api.post("/master/orangtua/link", { orang_tua_id: linkOrtuID, siswa_id: Number(linkSiswaID), hubungan: linkHubungan });
      toast.success("Siswa berhasil dihubungkan ke orang tua");
      setLinkDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal menghubungkan");
    } finally { setLinking(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{filtered.length} orang tua terdaftar</p>
        {!isKepsek && (
          <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="h-4 w-4" />Tambah Orang Tua</Button>
        )}
      </div>

      <div className="rounded-xl border border-border/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#161a2b] border-border/30 hover:bg-[#161a2b]">
              <TableHead className="text-gray-400">Nama</TableHead>
              <TableHead className="text-gray-400">Username / Email</TableHead>
              <TableHead className="text-gray-400">No. HP</TableHead>
              <TableHead className="text-gray-400">Pekerjaan</TableHead>
              <TableHead className="text-gray-400">Anak Terdaftar</TableHead>
              <TableHead className="text-gray-400 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Belum ada data orang tua</p>
                </TableCell>
              </TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id} className="border-border/20 hover:bg-[#161a2b]/50">
                <TableCell className="font-medium text-white">{item.nama}</TableCell>
                <TableCell>
                  <p className="text-sm text-white">{item.user?.username || "-"}</p>
                  <p className="text-xs text-gray-400">{item.user?.email || "-"}</p>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{item.phone || "-"}</TableCell>
                <TableCell className="text-gray-300 text-sm">{item.pekerjaan || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.anak && item.anak.length > 0
                      ? item.anak.map((a: any) => (
                          <Badge key={a.id} variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30">
                            {a.siswa?.nama || `Siswa #${a.siswa_id}`}
                            <span className="ml-1 text-gray-400">({a.hubungan})</span>
                          </Badge>
                        ))
                      : <span className="text-xs text-gray-500 italic">Belum ada</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!isKepsek && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="Hubungkan ke siswa" onClick={() => openLinkDialog(item)}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          title="Reset password" onClick={() => handleResetPassword(item.id, item.nama)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          title="Edit" onClick={() => openEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Hapus" onClick={() => handleDelete(item.id, item.nama)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Tambah/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Orang Tua" : "Tambah Orang Tua"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editMode && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Username *</Label>
                  <Input value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                    placeholder="ortuaksan" required className="bg-[#161a2b] border-border/30 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Password *</Label>
                  <Input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min 6 karakter" required className="bg-[#161a2b] border-border/30 text-white" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Email *</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="email@contoh.com" required className="bg-[#161a2b] border-border/30 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Nama Lengkap *</Label>
              <Input value={formData.nama} onChange={e => setFormData(p => ({ ...p, nama: e.target.value }))}
                placeholder="Nama orang tua/wali" required className="bg-[#161a2b] border-border/30 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">No. HP</Label>
                <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx" className="bg-[#161a2b] border-border/30 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Pekerjaan</Label>
                <Input value={formData.pekerjaan} onChange={e => setFormData(p => ({ ...p, pekerjaan: e.target.value }))}
                  placeholder="Wiraswasta, PNS, dll" className="bg-[#161a2b] border-border/30 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Alamat</Label>
              <Input value={formData.alamat} onChange={e => setFormData(p => ({ ...p, alamat: e.target.value }))}
                placeholder="Alamat lengkap" className="bg-[#161a2b] border-border/30 text-white" />
            </div>
            {!editMode && (
              <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Data Anak <span className="text-red-400">*</span></p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Anak / Siswa <span className="text-red-400">*</span></Label>
                    <Select value={formData.siswaID} onValueChange={v => setFormData(p => ({ ...p, siswaID: v ?? "" }))}>
                      <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-10 w-full">
                        <SelectValue placeholder="— Pilih siswa —" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f35] border-border/30 z-[200]">
                        <SelectGroup>
                          {siswaList.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-400 italic">Tidak ada siswa tersedia</div>
                          )}
                          {siswaList.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}
                              className="text-white focus:bg-primary/20 focus:text-white cursor-pointer">
                              <span className="font-medium">{s.nama}</span>
                              <span className="ml-2 text-xs text-gray-400 bg-[#111420] px-1.5 py-0.5 rounded">{s.kelas?.nama_kelas || "Tanpa Kelas"}</span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Hubungan <span className="text-red-400">*</span></Label>
                    <Select value={formData.hubungan} onValueChange={v => setFormData(p => ({ ...p, hubungan: v ?? "Ayah" }))}>
                      <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f35] border-border/30 z-[200]">
                        <SelectGroup>
                          {HUB_OPTIONS.map(h => (
                            <SelectItem key={h} value={h} className="text-white focus:bg-primary/20 focus:text-white cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)} className="text-gray-400">Batal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : editMode ? "Simpan" : "Buat Akun"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Hubungkan ke Siswa */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Hubungkan Orang Tua ke Siswa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLink} className="space-y-4">
            <p className="text-sm text-gray-400">
              Menambahkan siswa yang diasuh oleh <strong className="text-white">{linkOrtuNama}</strong>
            </p>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Pilih Siswa *</Label>
              <Select value={linkSiswaID} onValueChange={v => setLinkSiswaID(v ?? "")}>
                <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-10">
                  <SelectValue placeholder="— Pilih siswa —" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f35] border-border/30 z-[200]">
                  <SelectGroup>
                    {siswaList.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}
                        className="text-white focus:bg-primary/20 focus:text-white cursor-pointer">
                        <span className="font-medium">{s.nama}</span>
                        <span className="ml-2 text-xs text-gray-400 bg-[#111420] px-1.5 py-0.5 rounded">{s.kelas?.nama_kelas || "Tanpa Kelas"}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Hubungan *</Label>
              <Select value={linkHubungan} onValueChange={v => setLinkHubungan(v ?? "Ayah")}>
                <SelectTrigger className="bg-[#161a2b] border-border/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111420] border-border/30 text-white">
                  <SelectGroup>
                    {HUB_OPTIONS.map(h => <SelectItem key={h} value={h} className="focus:bg-[#161a2b]">{h}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setLinkDialog(false)} className="text-gray-400">Batal</Button>
              <Button type="submit" disabled={linking} className="gap-2">
                <Link2 className="h-4 w-4" />{linking ? "Menghubungkan..." : "Hubungkan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
