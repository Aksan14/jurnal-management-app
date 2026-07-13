'use client';

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface MapelSectionProps {
  search: string;
  isKepsek: boolean;
}

export default function MapelSection({ search, isKepsek }: MapelSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    kode_mapel: "",
    nama_mapel: "",
    kelompok: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/master/mapel");
      setData(res.data.data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data mata pelajaran");
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
      kode_mapel: "",
      nama_mapel: "",
      kelompok: ""
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditMode(true);
    setSelectedItem(item);
    setFormData({
      kode_mapel: item.kode_mapel || "",
      nama_mapel: item.nama_mapel || "",
      kelompok: item.kelompok || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await api.delete(`/master/mapel/${id}`);
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
    setSubmitting(true);
    try {
      if (editMode && selectedItem) {
        await api.put(`/master/mapel/${selectedItem.id || selectedItem.ID}`, formData);
        toast.success("Data berhasil diperbarui");
      } else {
        await api.post("/master/mapel", formData);
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
      item.kode_mapel?.toLowerCase().includes(q) ||
      item.nama_mapel?.toLowerCase().includes(q) ||
      item.kelompok?.toLowerCase().includes(q) ||
      String(item.id || item.ID).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {!isKepsek && (
        <div className="flex justify-end">
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/95 gap-2">
            <Plus className="h-4 w-4" /> Tambah Mapel
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
              <TableHead className="text-gray-400 w-24">ID</TableHead>
              <TableHead className="text-gray-400">Kode Mapel</TableHead>
              <TableHead className="text-gray-400">Nama Mata Pelajaran</TableHead>
              <TableHead className="text-gray-400">Kelompok</TableHead>
              {!isKepsek && <TableHead className="text-right text-gray-400 w-28">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id || item.ID} className="hover:bg-white/5 border-border/20">
                <TableCell className="font-medium text-gray-400 text-sm">{item.id || item.ID}</TableCell>
                <TableCell className="text-white font-semibold">{item.kode_mapel}</TableCell>
                <TableCell className="text-gray-300">{item.nama_mapel}</TableCell>
                <TableCell className="text-gray-300">{item.kelompok}</TableCell>
                {!isKepsek && (
                  <TableCell className="text-right space-x-1">
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
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editMode ? "Ubah Mapel" : "Tambah Mapel"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="kode_mapel" className="text-gray-300">Kode Mata Pelajaran</Label>
              <Input
                id="kode_mapel"
                value={formData.kode_mapel}
                onChange={(e) => setFormData({ ...formData, kode_mapel: e.target.value })}
                className="bg-[#161a2b] border-border/30 text-white"
                placeholder="e.g. MP-01"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nama_mapel" className="text-gray-300">Nama Mata Pelajaran</Label>
              <Input
                id="nama_mapel"
                value={formData.nama_mapel}
                onChange={(e) => setFormData({ ...formData, nama_mapel: e.target.value })}
                className="bg-[#161a2b] border-border/30 text-white"
                placeholder="e.g. Pemrograman Web"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kelompok" className="text-gray-300">Kelompok</Label>
              <Input
                id="kelompok"
                value={formData.kelompok}
                onChange={(e) => setFormData({ ...formData, kelompok: e.target.value })}
                className="bg-[#161a2b] border-border/30 text-white"
                placeholder="e.g. Kejuruan / Nasional"
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
    </div>
  );
}
