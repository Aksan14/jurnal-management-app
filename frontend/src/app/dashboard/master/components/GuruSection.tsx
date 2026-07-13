'use client';

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, KeyRound } from "lucide-react";
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

interface GuruSectionProps {
  search: string;
  isKepsek: boolean;
}

export default function GuruSection({ search, isKepsek }: GuruSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    username: "",
    email: "",
    role: "guru",
    nama: "",
    nip: "",
    gelar: "",
    gender: "L",
    phone: "",
    status: "Aktif",
    alamat: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/master/guru");
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data guru");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedItem(null);
    setFormData({
      username: "",
      email: "",
      role: "guru",
      nama: "",
      nip: "",
      gelar: "",
      gender: "L",
      phone: "",
      status: "Aktif",
      alamat: ""
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditMode(true);
    setSelectedItem(item);
    setFormData({
      username: item.user?.username || "",
      email: item.user?.email || "",
      role: item.user?.role || "guru",
      nama: item.nama || "",
      nip: item.nip || "",
      gelar: item.gelar || "",
      gender: item.gender || "L",
      phone: item.phone || "",
      status: item.status || "Aktif",
      alamat: item.alamat || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await api.delete(`/master/guru/${id}`);
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

  const handleResetPassword = async (id: number, nama: string) => {
    if (!confirm(`Reset password untuk ${nama}? Password baru akan dikirim ke email terkait.`)) return;
    try {
      const res = await api.post(`/master/guru/${id}/reset-password`);
      const newPass = res.data?.data?.password_baru || "";
      toast.success(`Password ${nama} berhasil direset${newPass ? `: ${newPass}` : ". Dikirim ke email"}`, { duration: 8000 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal reset password");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editMode && selectedItem) {
        await api.put(`/master/guru/${selectedItem.id || selectedItem.ID}`, formData);
        toast.success("Data berhasil diperbarui");
      } else {
        await api.post("/master/guru", formData);
        toast.success("Password otomatis dikirim ke email guru");
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
      item.nama?.toLowerCase().includes(q) ||
      item.nip?.toLowerCase().includes(q) ||
      item.user?.email?.toLowerCase().includes(q) ||
      String(item.id || item.ID).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {!isKepsek && (
        <div className="flex justify-end">
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/95 gap-2">
            <Plus className="h-4 w-4" /> Tambah Guru
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
              <TableHead className="text-gray-400">NIP</TableHead>
              <TableHead className="text-gray-400">Nama Lengkap</TableHead>
              <TableHead className="text-gray-400">Role</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">No. Telepon</TableHead>
              <TableHead className="text-gray-400">Gender</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              {!isKepsek && <TableHead className="text-right text-gray-400 w-36">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id || item.ID} className="hover:bg-white/5 border-border/20">
                <TableCell className="text-white font-mono">{item.nip}</TableCell>
                <TableCell className="text-white font-semibold">{item.nama}{item.gelar ? `, ${item.gelar}` : ""}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={item.user?.role === "guru_bk" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>
                    {item.user?.role === "guru_bk" ? "Guru BK" : "Guru"}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300">{item.user?.email || "-"}</TableCell>
                <TableCell className="text-gray-300">{item.phone || "-"}</TableCell>
                <TableCell className="text-gray-300">{item.gender === "L" ? "Laki-laki" : "Perempuan"}</TableCell>
                <TableCell className="text-gray-300">
                  <Badge variant="outline" className={item.status === "Aktif" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                    {item.status || "Aktif"}
                  </Badge>
                </TableCell>
                {!isKepsek && (
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title="Reset Password" onClick={() => handleResetPassword(item.id || item.ID, item.nama)} className="h-8 w-8 text-amber-400 hover:bg-amber-400/10">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-primary hover:bg-[#161a2b]">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id || item.ID)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editMode ? "Ubah Guru" : "Tambah Guru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-300">Username Akun</Label>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Email Akun</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Role / Jabatan</Label>
              <Select value={formData.role} onValueChange={(val) => { if (val) setFormData({ ...formData, role: val }); }}>
                <SelectTrigger className="bg-[#161a2b] border-border/30 text-white"><SelectValue>{formData.role === "guru" ? "Guru Mata Pelajaran" : formData.role === "guru_bk" ? "Guru BK / Konselor" : formData.role === "wali_kelas" ? "Wali Kelas" : "Pilih Role"}</SelectValue></SelectTrigger>
                <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                  <SelectItem value="guru">Guru Mata Pelajaran</SelectItem>
                  <SelectItem value="guru_bk">Guru BK / Konselor</SelectItem>
                          </SelectGroup>
        </SelectContent>
              </Select>
            </div>

            {!editMode && (
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                ⚠️ Password akan di-generate otomatis dan dikirim ke email guru.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-300">Nama Lengkap</Label>
                <Input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">NIP</Label>
                <Input value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Gelar</Label>
                <Input value={formData.gelar} onChange={(e) => setFormData({ ...formData, gelar: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="e.g. S.Kom" />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Jenis Kelamin</Label>
                <Select value={formData.gender} onValueChange={(val) => { if (val) setFormData({ ...formData, gender: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white"><SelectValue>{formData.gender === "L" ? "Laki-laki" : formData.gender === "P" ? "Perempuan" : "Pilih Jenis Kelamin"}</SelectValue></SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">No. Telepon</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(val) => { if (val) setFormData({ ...formData, status: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white"><SelectValue>{formData.status || "Pilih Status"}</SelectValue></SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Alamat</Label>
              <Input value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" />
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
    </div>
  );
}
