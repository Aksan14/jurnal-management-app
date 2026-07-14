'use client';

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { getBackendUrl } from "@/lib/utils";

const BACKEND_URL = getBackendUrl();
import { toast } from "sonner";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Upload, 
  Mail, 
  Users, 
  User, 
  BookOpen, 
  KeyRound, 
  Phone, 
  MapPin, 
  DollarSign, 
  GraduationCap,
  UserPlus,
  Copy,
  MessageCircle,
  CheckCircle
} from "lucide-react";
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
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface SiswaSectionProps {
  search: string;
  isKepsek: boolean;
}

export default function SiswaSection({ search, isKepsek }: SiswaSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [kelases, setKelases] = useState<any[]>([]);
  const [jurusans, setJurusans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    nama: "",
    nisn: "",
    nis: "",
    gender: "L",
    kelas_id: "",
    jurusan_id: "",
    tahun_masuk: "",
    status: "Aktif",
    phone: "",
    instagram: "",
    youtube: "",
    foto_url: "",
    alamat: "",
    nama_ayah: "",
    nama_ibu: "",
    pekerjaan_ortu: "",
    wa_ortu: "",
    pendapatan_ortu: "0",
    username: "",
    email: "",
    password: ""
  });

  const [fotoPreview, setFotoPreview] = useState<string>("");
  const [fotoUploading, setFotoUploading] = useState(false);
  const fotoFileRef = useRef<HTMLInputElement>(null);
  
  // Detail Siswa Dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSiswa, setDetailSiswa] = useState<any>(null);

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Buat Akun Ortu
  const [buatOrtuDialog, setBuatOrtuDialog] = useState(false);
  const [buatOrtuSiswa, setBuatOrtuSiswa] = useState<any>(null);
  const [buatOrtuHubungan, setBuatOrtuHubungan] = useState("Ayah");
  const [buatOrtuLoading, setBuatOrtuLoading] = useState(false);
  const [hasilOrtu, setHasilOrtu] = useState<any>(null);
  const [hasilDialog, setHasilDialog] = useState(false);

  const handleBuatAkunOrtu = async () => {
    if (!buatOrtuSiswa) return;
    setBuatOrtuLoading(true);
    try {
      const res = await api.post(`/master/siswa/${buatOrtuSiswa.id || buatOrtuSiswa.ID}/buat-akun-ortu`, { hubungan: buatOrtuHubungan });
      setHasilOrtu({ ...res.data.data, hubungan: buatOrtuHubungan });
      setBuatOrtuDialog(false);
      setHasilDialog(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal membuat akun");
    } finally {
      setBuatOrtuLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/master/siswa");
      setData(res.data.data || []);
      
      const kRes = await api.get("/master/kelas");
      setKelases(kRes.data.data || []);

      const jRes = await api.get("/master/jurusan");
      setJurusans(jRes.data.data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data siswa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getKelasName = (id: string) => kelases.find(k => String(k.id || k.ID) === id)?.nama_kelas || "";
  const getJurusanName = (id: string) => jurusans.find(j => String(j.id || j.ID) === id)?.nama_jurusan || "";

  const validateSiswaForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nama?.trim()) errors.nama = "Nama wajib diisi";
    if (!formData.kelas_id) errors.kelas_id = "Kelas wajib dipilih";
    if (!formData.jurusan_id) errors.jurusan_id = "Jurusan wajib dipilih";
    if (!formData.username?.trim()) errors.username = "Username wajib diisi";
    else if (formData.username.length < 4) errors.username = "Username minimal 4 karakter";
    else if (!/^[a-zA-Z0-9._]+$/.test(formData.username)) errors.username = "Username hanya boleh huruf, angka, titik, dan underscore";
    if (!formData.email?.trim()) errors.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Format email tidak valid";
    if (formData.phone && !/^[0-9+\-\s]{8,15}$/.test(formData.phone)) errors.phone = "Format nomor tidak valid (8-15 digit)";
    if (formData.wa_ortu && !/^[0-9+\-\s]{8,15}$/.test(formData.wa_ortu)) errors.wa_ortu = "Format nomor tidak valid";
    const pendapatan = Number(formData.pendapatan_ortu);
    if (isNaN(pendapatan) || pendapatan < 0) errors.pendapatan_ortu = "Penghasilan tidak boleh negatif";
    if (formData.tahun_masuk) {
      const th = Number(formData.tahun_masuk);
      if (th < 2000 || th > new Date().getFullYear() + 1) errors.tahun_masuk = `Tahun masuk tidak valid (2000–${new Date().getFullYear() + 1})`;
    }
    return errors;
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedItem(null);
    setFotoPreview("");
    setFormErrors({});
    setFormData({
      nama: "",
      nisn: "",
      nis: "",
      gender: "L",
      kelas_id: "",
      jurusan_id: "",
      tahun_masuk: String(new Date().getFullYear()),
      status: "Aktif",
      phone: "",
      instagram: "",
      youtube: "",
      foto_url: "",
      alamat: "",
      nama_ayah: "",
      nama_ibu: "",
      pekerjaan_ortu: "",
      wa_ortu: "",
      pendapatan_ortu: "0",
      username: "",
      email: "",
      password: ""
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditMode(true);
    setSelectedItem(item);
    setFormErrors({});
    setFotoPreview(item.foto_url ? `${BACKEND_URL}${item.foto_url}` : "");
    setFormData({
      nama: item.nama || "",
      nisn: item.nisn || "",
      nis: item.nis || "",
      gender: item.gender || "L",
      kelas_id: item.kelas_id ? String(item.kelas_id) : "",
      jurusan_id: item.jurusan_id ? String(item.jurusan_id) : "",
      tahun_masuk: item.tahun_masuk ? String(item.tahun_masuk) : "",
      status: item.status || "Aktif",
      phone: item.phone || "",
      instagram: item.instagram || "",
      youtube: item.youtube || "",
      foto_url: item.foto_url || "",
      alamat: item.alamat || "",
      nama_ayah: item.nama_ayah || "",
      nama_ibu: item.nama_ibu || "",
      pekerjaan_ortu: item.pekerjaan_ortu || "",
      wa_ortu: item.wa_ortu || "",
      pendapatan_ortu: item.pendapatan_ortu ? String(item.pendapatan_ortu) : "0",
      username: item.user?.username || "",
      email: item.user?.email || "",
      password: ""
    });
    setDialogOpen(true);
  };

  const handleOpenDetail = (item: any) => {
    setDetailSiswa(item);
    setDetailOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await api.delete(`/master/siswa/${id}`);
      toast.success("Data berhasil dihapus");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal menghapus data";
      if (err.response?.status === 409) {
        toast.warning(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
      loadData(); // selalu refresh agar perubahan status Non-Aktif terlihat
    }
  };

  const handleResetPassword = async (id: number, nama: string) => {
    if (!confirm(`Reset password untuk ${nama}? Password baru akan dikirim ke email terkait.`)) return;
    try {
      const res = await api.post(`/master/siswa/${id}/reset-password`);
      const newPass = res.data?.data?.password_baru || "";
      toast.success(`Password ${nama} berhasil direset${newPass ? `: ${newPass}` : ". Dikirim ke email"}`, { duration: 8000 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal reset password");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateSiswaForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Silakan periksa kembali form isian Anda");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      kelas_id: parseInt(formData.kelas_id),
      jurusan_id: parseInt(formData.jurusan_id),
      tahun_masuk: parseInt(formData.tahun_masuk),
      pendapatan_ortu: parseFloat(formData.pendapatan_ortu || "0")
    };
    if (editMode) {
      if (!payload.password) delete payload.password;
    }

    try {
      if (editMode && selectedItem) {
        await api.put(`/master/siswa/${selectedItem.id || selectedItem.ID}`, payload);
        toast.success("Data berhasil diperbarui");
      } else {
        await api.post("/master/siswa", payload);
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
      item.nama?.toLowerCase().includes(q) ||
      item.nisn?.toLowerCase().includes(q) ||
      item.nis?.toLowerCase().includes(q) ||
      item.kelas?.nama_kelas?.toLowerCase().includes(q) ||
      String(item.id || item.ID).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {!isKepsek && (
        <div className="flex justify-end">
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/95 gap-2">
            <Plus className="h-4 w-4" /> Tambah Siswa
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
              <TableHead className="text-gray-400 w-12">Foto</TableHead>
              <TableHead className="text-gray-400">Nama Lengkap</TableHead>
              <TableHead className="text-gray-400">NISN</TableHead>
              <TableHead className="text-gray-400">Kelas</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Detail</TableHead>
              {!isKepsek && <TableHead className="text-right text-gray-400 w-28">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id || item.ID} className="hover:bg-white/5 border-border/20">
                <TableCell>
                  {item.foto_url ? (
                    <img
                      src={`${BACKEND_URL}${item.foto_url}`}
                      alt={item.nama}
                      className="w-9 h-9 rounded-full object-cover border-2 border-primary/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold border border-primary/20">
                      {item.nama?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-white font-semibold">{item.nama}</TableCell>
                <TableCell className="text-gray-400 font-mono text-xs">{item.nisn || "-"}</TableCell>
                <TableCell className="text-gray-300">{item.kelas?.nama_kelas || getKelasName(String(item.kelas_id)) || "-"}</TableCell>
                <TableCell className="text-gray-300">
                  <Badge variant="outline" className={item.status === "Aktif" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                    {item.status || "Aktif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(item)} className="h-7 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 gap-1 px-2">
                    <Eye className="h-3 w-3" /> Selengkapnya
                  </Button>
                </TableCell>
                {!isKepsek && (
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title="Buat Akun Orang Tua" onClick={() => { setBuatOrtuSiswa(item); setBuatOrtuHubungan("Ayah"); setBuatOrtuDialog(true); }} className="h-8 w-8 text-purple-400 hover:bg-purple-500/10">
                      <UserPlus className="h-4 w-4" />
                    </Button>
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

      {/* Dialog Detail Siswa */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-2xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Profil Lengkap Siswa
            </DialogTitle>
          </DialogHeader>
          {detailSiswa && (
            <div className="space-y-6 py-2">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#161a2b] border border-border/20">
                {detailSiswa.foto_url ? (
                  <img src={`${BACKEND_URL}${detailSiswa.foto_url}`} alt={detailSiswa.nama} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border border-primary/20">
                    {detailSiswa.nama?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{detailSiswa.nama}</h3>
                  <p className="text-sm text-gray-400">NISN: {detailSiswa.nisn || "-"} | NIS: {detailSiswa.nis || "-"}</p>
                  <p className="text-xs text-primary font-semibold mt-1">Kelas: {detailSiswa.kelas?.nama_kelas || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-400 border-b border-border/20 pb-1 flex items-center gap-1"><User className="w-4 h-4" /> Personal</h4>
                  <p className="text-gray-300"><strong>Jenis Kelamin:</strong> {detailSiswa.gender === "L" ? "Laki-laki" : "Perempuan"}</p>
                  <p className="text-gray-300"><strong>Jurusan:</strong> {detailSiswa.jurusan?.nama_jurusan || "-"}</p>
                  <p className="text-gray-300"><strong>Tahun Masuk:</strong> {detailSiswa.tahun_masuk || "-"}</p>
                  <p className="text-gray-300 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span><strong>Alamat:</strong> {detailSiswa.alamat || "-"}</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-400 border-b border-border/20 pb-1 flex items-center gap-1"><Users className="w-4 h-4" /> Orang Tua / Wali</h4>
                  <p className="text-gray-300"><strong>Nama Ayah:</strong> {detailSiswa.nama_ayah || "-"}</p>
                  <p className="text-gray-300"><strong>Nama Ibu:</strong> {detailSiswa.nama_ibu || "-"}</p>
                  <p className="text-gray-300"><strong>Pekerjaan:</strong> {detailSiswa.pekerjaan_ortu || "-"}</p>
                  <p className="text-gray-300 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span><strong>WhatsApp:</strong> {detailSiswa.wa_ortu || "-"}</span>
                  </p>
                  <p className="text-gray-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span><strong>Penghasilan:</strong> Rp {detailSiswa.pendapatan_ortu?.toLocaleString() || "0"}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailOpen(false)} className="bg-primary text-white">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-2xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <DialogHeader>
            <DialogTitle className="text-white">{editMode ? "Ubah Siswa" : "Tambah Siswa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            {!editMode && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                <Mail className="w-4 h-4 shrink-0" />
                Password akan di-generate otomatis dan dikirim ke email siswa
              </div>
            )}

            {/* Data Pribadi */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><User className="w-3 h-3 text-primary" /> Data Pribadi</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300">Nama Lengkap <span className="text-red-400">*</span></Label>
                  <Input value={formData.nama} onChange={(e) => { setFormData({ ...formData, nama: e.target.value }); setFormErrors(p => ({...p, nama: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.nama ? "border-red-500" : ""}`} placeholder="Nama Lengkap" />
                  {formErrors.nama && <p className="text-red-400 text-xs mt-0.5">{formErrors.nama}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">NISN</Label>
                  <Input value={formData.nisn} onChange={(e) => setFormData({ ...formData, nisn: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="Auto-generate jika kosong" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">NIS</Label>
                  <Input value={formData.nis} onChange={(e) => setFormData({ ...formData, nis: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" placeholder="Auto-generate jika kosong" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Jenis Kelamin <span className="text-red-400">*</span></Label>
                  <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                    <SelectTrigger className="bg-[#161a2b] border-border/30 text-white"><SelectValue>{formData.gender === "L" ? "Laki-laki" : formData.gender === "P" ? "Perempuan" : "Pilih Jenis Kelamin"}</SelectValue></SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Data Akademik */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><BookOpen className="w-3 h-3 text-primary" /> Data Akademik</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300">Kelas <span className="text-red-400">*</span></Label>
                  <Select value={formData.kelas_id} onValueChange={(val) => { if (val) { setFormData({ ...formData, kelas_id: val }); setFormErrors(p => ({...p, kelas_id: ""})); } }}>
                    <SelectTrigger className={`bg-[#161a2b] border-border/30 text-white ${formErrors.kelas_id ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Pilih Kelas">{formData.kelas_id ? (kelases.find(k => String(k.id || k.ID) === formData.kelas_id)?.nama_kelas || formData.kelas_id) : "Pilih Kelas"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      {kelases.map((k) => (<SelectItem key={k.id || k.ID} value={String(k.id || k.ID)}>{k.nama_kelas}</SelectItem>))}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                  {formErrors.kelas_id && <p className="text-red-400 text-xs mt-0.5">{formErrors.kelas_id}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Jurusan <span className="text-red-400">*</span></Label>
                  <Select value={formData.jurusan_id} onValueChange={(val) => { if (val) { setFormData({ ...formData, jurusan_id: val }); setFormErrors(p => ({...p, jurusan_id: ""})); } }}>
                    <SelectTrigger className={`bg-[#161a2b] border-border/30 text-white ${formErrors.jurusan_id ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Pilih Jurusan">{formData.jurusan_id ? (jurusans.find(j => String(j.id || j.ID) === formData.jurusan_id)?.nama_jurusan || formData.jurusan_id) : "Pilih Jurusan"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      {jurusans.map((j) => (<SelectItem key={j.id || j.ID} value={String(j.id || j.ID)}>{j.nama_jurusan}</SelectItem>))}
                              </SelectGroup>
        </SelectContent>
                  </Select>
                  {formErrors.jurusan_id && <p className="text-red-400 text-xs mt-0.5">{formErrors.jurusan_id}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Tahun Masuk</Label>
                  <Input type="number" value={formData.tahun_masuk} onChange={(e) => { setFormData({ ...formData, tahun_masuk: e.target.value }); setFormErrors(p => ({...p, tahun_masuk: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.tahun_masuk ? "border-red-500" : ""}`} />
                  {formErrors.tahun_masuk && <p className="text-red-400 text-xs mt-0.5">{formErrors.tahun_masuk}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Status</Label>
                  <Select value={formData.status} onValueChange={(val) => { if (val) setFormData({ ...formData, status: val }); }}>
                    <SelectTrigger className="bg-[#161a2b] border-border/30 text-white"><SelectValue>{formData.status || "Pilih Status"}</SelectValue></SelectTrigger>
                    <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                      <SelectItem value="Alumni">Alumni</SelectItem>
                              </SelectGroup>
        </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Kontak & Foto */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kontak &amp; Media</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300">WhatsApp</Label>
                  <Input value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setFormErrors(p => ({...p, phone: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.phone ? "border-red-500" : ""}`} />
                  {formErrors.phone && <p className="text-red-400 text-xs mt-0.5">{formErrors.phone}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Instagram</Label>
                  <Input value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Foto Profil</Label>
                  <div className="flex items-center gap-2">
                    {fotoPreview && (
                      <img src={fotoPreview} alt="preview" className="w-10 h-10 rounded-full object-cover border border-border/30" onError={() => setFotoPreview("")} />
                    )}
                    <Button type="button" variant="outline" size="sm" className="border-border/30 text-gray-300 hover:text-white" onClick={() => fotoFileRef.current?.click()}>
                      <Upload className="w-3 h-3 mr-1" /> {fotoUploading ? "Mengupload..." : "Pilih Foto"}
                    </Button>
                    <input ref={fotoFileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const previewUrl = URL.createObjectURL(file);
                      setFotoPreview(previewUrl);
                      setFotoUploading(true);
                      try {
                        const form = new FormData();
                        form.append("file", file);
                        form.append("prefix", "siswa");
                        const res = await api.post("/upload/foto", form, { headers: { "Content-Type": "multipart/form-data" } });
                        const uploadedUrl = res.data?.data?.url || "";
                        setFormData((prev: any) => ({ ...prev, foto_url: uploadedUrl }));
                        toast.success("Foto berhasil diupload!");
                      } catch (err: any) {
                        toast.error("Gagal upload foto");
                        setFotoPreview("");
                      } finally {
                        setFotoUploading(false);
                      }
                    }} />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-gray-300">Alamat Lengkap</Label>
                  <Textarea value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" rows={2} />
                </div>
              </div>
            </div>

            {/* Orang Tua */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Users className="w-3 h-3 text-primary" /> Orang Tua</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300">Nama Ayah</Label>
                  <Input value={formData.nama_ayah} onChange={(e) => setFormData({ ...formData, nama_ayah: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Nama Ibu</Label>
                  <Input value={formData.nama_ibu} onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })} className="bg-[#161a2b] border-border/30 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">WhatsApp Orang Tua</Label>
                  <Input value={formData.wa_ortu} onChange={(e) => { setFormData({ ...formData, wa_ortu: e.target.value }); setFormErrors(p => ({...p, wa_ortu: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.wa_ortu ? "border-red-500" : ""}`} />
                  {formErrors.wa_ortu && <p className="text-red-400 text-xs mt-0.5">{formErrors.wa_ortu}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Penghasilan Orang Tua</Label>
                  <Input type="number" value={formData.pendapatan_ortu} onChange={(e) => { setFormData({ ...formData, pendapatan_ortu: e.target.value }); setFormErrors(p => ({...p, pendapatan_ortu: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.pendapatan_ortu ? "border-red-500" : ""}`} />
                  {formErrors.pendapatan_ortu && <p className="text-red-400 text-xs mt-0.5">{formErrors.pendapatan_ortu}</p>}
                </div>
              </div>
            </div>

            {/* Akun Login */}
            <div className="border border-border/20 rounded-lg p-3 bg-[#0d1017] space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Mail className="w-3 h-3 text-blue-400" /> Akun Login</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300">Username <span className="text-red-400">*</span></Label>
                  <Input value={formData.username} onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setFormErrors(p => ({...p, username: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.username ? "border-red-500" : ""}`} />
                  {formErrors.username && <p className="text-red-400 text-xs mt-0.5">{formErrors.username}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300">Email <span className="text-red-400">*</span></Label>
                  <Input type="email" value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFormErrors(p => ({...p, email: ""})); }} className={`bg-[#161a2b] border-border/30 text-white ${formErrors.email ? "border-red-500" : ""}`} />
                  {formErrors.email && <p className="text-red-400 text-xs mt-0.5">{formErrors.email}</p>}
                </div>
              </div>
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

      {/* Dialog Buat Akun Ortu */}
      <Dialog open={buatOrtuDialog} onOpenChange={setBuatOrtuDialog}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-purple-400" /> Buat Akun Orang Tua
            </DialogTitle>
          </DialogHeader>
          {buatOrtuSiswa && (
            <div className="space-y-4">
              {/* Info siswa */}
              <div className="rounded-lg bg-[#161a2b] border border-border/20 p-3 space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Data Siswa</p>
                <p className="font-bold text-white">{buatOrtuSiswa.nama}</p>
                <p className="text-sm text-gray-400">{buatOrtuSiswa.kelas?.nama_kelas || "-"} · NIS: {buatOrtuSiswa.nis || "-"}</p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div><span className="text-gray-500">Ayah:</span> <span className="text-gray-300">{buatOrtuSiswa.nama_ayah || "-"}</span></div>
                  <div><span className="text-gray-500">Ibu:</span> <span className="text-gray-300">{buatOrtuSiswa.nama_ibu || "-"}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">WA Ortu:</span> <span className="text-emerald-400 font-medium">{buatOrtuSiswa.wa_ortu || "Belum diisi"}</span></div>
                </div>
              </div>
              {/* Pilih hubungan */}
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Buat akun sebagai <span className="text-red-400">*</span></Label>
                <Select value={buatOrtuHubungan} onValueChange={v => setBuatOrtuHubungan(v ?? "Ayah")}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f35] border-border/30 z-[200]">
                    <SelectGroup>
                      {["Ayah", "Ibu", "Wali"].map(h => (
                        <SelectItem key={h} value={h} className="text-white focus:bg-primary/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Username otomatis: <span className="font-mono text-primary">ortu_{buatOrtuSiswa.nis}_{buatOrtuHubungan.toLowerCase()}</span>
                </p>
              </div>
              {!buatOrtuSiswa.wa_ortu && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  ⚠ Nomor WA orang tua belum diisi di data siswa. Kredensial tidak bisa dikirim via WA.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBuatOrtuDialog(false)} className="text-gray-400">Batal</Button>
            <Button onClick={handleBuatAkunOrtu} disabled={buatOrtuLoading} className="bg-purple-600 hover:bg-purple-500 gap-2">
              <UserPlus className="h-4 w-4" />{buatOrtuLoading ? "Membuat..." : "Buat Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hasil Akun Ortu */}
      <Dialog open={hasilDialog} onOpenChange={setHasilDialog}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              {hasilOrtu?.already_exists ? "Akun Sudah Ada" : "Akun Berhasil Dibuat"}
            </DialogTitle>
          </DialogHeader>
          {hasilOrtu && (
            <div className="space-y-4">
              <div className="rounded-lg bg-[#161a2b] border border-border/20 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Nama Ortu</span>
                  <span className="font-semibold text-white">{hasilOrtu.nama_ortu}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Hubungan</span>
                  <span className="text-purple-400 font-medium">{hasilOrtu.hubungan}</span>
                </div>
                <div className="border-t border-border/20 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Username</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-primary text-sm">{hasilOrtu.username}</span>
                      <button onClick={() => { navigator.clipboard.writeText(hasilOrtu.username); toast.success("Disalin!"); }} className="text-gray-500 hover:text-gray-300">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Password</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-emerald-400 text-sm font-bold">{hasilOrtu.password}</span>
                      <button onClick={() => { navigator.clipboard.writeText(hasilOrtu.password); toast.success("Disalin!"); }} className="text-gray-500 hover:text-gray-300">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {hasilOrtu.wa_ortu ? (
                <a
                  href={`https://wa.me/${hasilOrtu.wa_ortu.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${hasilOrtu.nama_ortu}, akun portal orang tua siswa *${hasilOrtu.nama_siswa}* telah dibuat.\n\nUsername: *${hasilOrtu.username}*\nPassword: *${hasilOrtu.password}*\n\nSilakan login di: http://localhost:3000/login`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> Kirim via WhatsApp
                </a>
              ) : (
                <p className="text-xs text-amber-400 text-center bg-amber-500/10 border border-amber-500/20 rounded-lg py-2">
                  Nomor WA tidak tersedia. Sampaikan kredensial secara langsung.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setHasilDialog(false)} className="w-full">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
