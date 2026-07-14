"use client";

import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Camera, Save, Lock, Phone, Mail, BookOpen, GraduationCap, Users, ShieldCheck, X, ZoomIn } from "lucide-react";
import { getBackendUrl } from "@/lib/utils";

const BACKEND_URL = getBackendUrl();

interface ProfileData {
  id: number; username: string; email: string; role: string;
  nama_lengkap: string; phone: string; foto_url: string;
  nip?: string; gelar?: string; gender?: string; alamat?: string; guru_id?: number;
  siswa_id?: number; nisn?: string; nis?: string; kelas_id?: number; nama_kelas?: string;
  jurusan_id?: number; nama_jurusan?: string; instagram?: string; youtube?: string;
  nama_ayah?: string; nama_ibu?: string; wa_ortu?: string;
  ortu_id?: number; nama_ortu?: string; pekerjaan?: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin", admin: "Administrator", guru: "Guru",
  guru_bk: "Guru BK", counselor: "Konselor", wali_kelas: "Wali Kelas",
  kepsek: "Kepala Sekolah", siswa: "Siswa", orang_tua: "Orang Tua",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-400 border-red-500/30",
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  guru: "bg-green-500/20 text-green-400 border-green-500/30",
  guru_bk: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  counselor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  wali_kelas: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  kepsek: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  siswa: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  orang_tua: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const isGuruRole = (r: string) => ["guru", "wali_kelas", "guru_bk", "counselor", "kepsek"].includes(r);

function FieldReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-400 text-sm">{label}</Label>
      <Input value={value || "-"} disabled className="bg-[#0d1017] border-border/20 text-gray-400 cursor-not-allowed" />
    </div>
  );
}

function FieldEdit({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-300 text-sm">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="bg-[#161a2b] border-border/30 text-white" />
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold pt-2 pb-1 border-t border-border/20">{text}</p>;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoUploading, setFotoUploading] = useState(false);

  const [gelar, setGelar] = useState("");
  const [gender, setGender] = useState("");
  const [alamat, setAlamat] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [namaAyah, setNamaAyah] = useState("");
  const [namaIbu, setNamaIbu] = useState("");
  const [waOrtu, setWaOrtu] = useState("");
  const [namaOrtu, setNamaOrtu] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [zoomFoto, setZoomFoto] = useState(false);

  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const res = await api.get("/profile");
      const d: ProfileData = res.data.data;
      setProfile(d);
      setNamaLengkap(d.nama_lengkap || ""); setEmail(d.email || "");
      setPhone(d.phone || ""); setFotoUrl(d.foto_url || "");
      setGelar(d.gelar || ""); setGender(d.gender || ""); setAlamat(d.alamat || "");
      setInstagram(d.instagram || ""); setYoutube(d.youtube || "");
      setNamaAyah(d.nama_ayah || ""); setNamaIbu(d.nama_ibu || ""); setWaOrtu(d.wa_ortu || "");
      setNamaOrtu(d.nama_ortu || ""); setPekerjaan(d.pekerjaan || "");
    } catch { toast.error("Gagal memuat profil"); }
    finally { setLoading(false); }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return; }
    setFotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      const res = await api.post("/upload/foto", fd, { headers: { "Content-Type": "multipart/form-data" } });
      // Response dibungkus: { success, message, data: { url, foto_url } }
      const uploadedUrl: string = res.data.data?.url || res.data.data?.foto_url || res.data.url || res.data.foto_url || "";
      if (!uploadedUrl) { toast.error("Gagal mendapat URL foto"); return; }
      setFotoUrl(uploadedUrl);
      // Auto-save foto_url ke profil langsung
      await api.put("/profile", { foto_url: uploadedUrl });
      toast.success("Foto berhasil diperbarui");
      loadProfile();
    } catch { toast.error("Gagal upload foto"); }
    finally { setFotoUploading(false); }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api.put("/profile", {
        nama_lengkap: namaLengkap, email, phone, foto_url: fotoUrl,
        gelar, gender, alamat, instagram, youtube,
        nama_ayah: namaAyah, nama_ibu: namaIbu, wa_ortu: waOrtu,
        nama_ortu: namaOrtu, pekerjaan,
      });
      toast.success("Profil disimpan");
      loadProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { toast.error("Konfirmasi tidak cocok"); return; }
    if (newPassword.length < 6) { toast.error("Min 6 karakter"); return; }
    setChangingPassword(true);
    try {
      await api.post("/auth/change-password", { old_password: oldPassword, new_password: newPassword });
      toast.success("Password diubah");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal ubah password");
    } finally { setChangingPassword(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const fotoSrc = fotoUrl
    ? fotoUrl.startsWith("http")
      ? fotoUrl
      : `${BACKEND_URL}/${fotoUrl.replace(/^\/+/, "")}`
    : null;
  const initials = (namaLengkap || profile?.username || "U").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const role = profile?.role || user?.role || "";

  // ── Shared header fields (masuk ke tiap card)
  const sharedFields = (
    <>
      <FieldEdit label="Nama Lengkap" value={namaLengkap} onChange={setNamaLengkap} placeholder="Nama lengkap" />
      <FieldReadOnly label="Username" value={profile?.username} />
      <FieldEdit label="Email" value={email} onChange={setEmail} placeholder="email@sekolah.sch.id" type="email" />
      <FieldEdit label="No. HP / WA" value={phone} onChange={setPhone} placeholder="08xxxxxxxxxx" />
    </>
  );

  const genderSelect = (
    <div className="space-y-1.5">
      <Label className="text-gray-300 text-sm">Jenis Kelamin</Label>
      <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
        <SelectTrigger className="bg-[#161a2b] border-border/30 text-white">
          <SelectValue placeholder="Pilih jenis kelamin" />
        </SelectTrigger>
        <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
            <SelectItem value="L" className="focus:bg-[#161a2b]">Laki-laki</SelectItem>
            <SelectItem value="P" className="focus:bg-[#161a2b]">Perempuan</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );

  const alamatField = (
    <div className="space-y-1.5 sm:col-span-2">
      <Label className="text-gray-300 text-sm">Alamat</Label>
      <Textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat lengkap" rows={2}
        className="bg-[#161a2b] border-border/30 text-white resize-none" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Saya</h1>
        <p className="text-gray-400 text-sm mt-1">Kelola informasi akun Anda</p>
      </div>

      {/* Zoom Modal */}
      {zoomFoto && fotoSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setZoomFoto(false)}
        >
          <div className="relative max-w-lg w-full mx-4">
            <img src={fotoSrc} alt="Foto Profil" className="w-full rounded-2xl shadow-2xl" />
            <button
              onClick={() => setZoomFoto(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Avatar Card */}
      <Card className="bg-[#111420] border-border/30">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0 group">
              <div
                className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => fotoSrc && setZoomFoto(true)}
              >
                {fotoSrc ? <img src={fotoSrc} alt="Foto" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-primary">{initials}</span>}
                {fotoSrc && (
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <button onClick={() => fotoRef.current?.click()} disabled={fotoUploading}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center transition-colors z-10">
                {fotoUploading ? <div className="animate-spin rounded-full h-3 w-3 border-b border-white" /> : <Camera className="h-3.5 w-3.5 text-white" />}
              </button>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
            </div>
            <div className="text-center sm:text-left space-y-1.5">
              <h2 className="text-xl font-semibold text-white">{namaLengkap || profile?.username}</h2>
              <p className="text-gray-400 text-sm">@{profile?.username}</p>
              <Badge className={`border text-xs ${roleColors[role] || "bg-primary/20 text-primary border-primary/30"}`}>
                {roleLabels[role] || role}
              </Badge>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                {isGuruRole(role) && profile?.nip && <span>NIP: <span className="text-gray-300">{profile.nip}</span></span>}
                {role === "siswa" && profile?.nis && <span>NIS: <span className="text-gray-300">{profile.nis}</span></span>}
                {role === "siswa" && profile?.nisn && <span>NISN: <span className="text-gray-300">{profile.nisn}</span></span>}
                {role === "siswa" && profile?.nama_kelas && <span>{profile.nama_kelas}{profile.nama_jurusan ? ` | ${profile.nama_jurusan}` : ""}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ADMIN / SUPER ADMIN ── */}
      {(role === "admin" || role === "super_admin") && (
        <Card className="bg-[#111420] border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Data {roleLabels[role]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{sharedFields}</div>
          </CardContent>
        </Card>
      )}

      {/* ── GURU / WALI KELAS / GURU BK / COUNSELOR / KEPSEK ── */}
      {isGuruRole(role) && (
        <Card className="bg-[#111420] border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <BookOpen className="h-4 w-4 text-primary" /> Data {roleLabels[role]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sharedFields}
              <SectionTitle text="Data Kepegawaian" />
              <FieldReadOnly label="NIP" value={profile?.nip} />
              <FieldEdit label="Gelar" value={gelar} onChange={setGelar} placeholder="S.Pd., M.Pd., dll" />
              {genderSelect}
              {alamatField}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SISWA ── */}
      {role === "siswa" && (
        <Card className="bg-[#111420] border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <GraduationCap className="h-4 w-4 text-primary" /> Data Siswa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sharedFields}
              <SectionTitle text="Data Akademik" />
              <FieldReadOnly label="NIS" value={profile?.nis} />
              <FieldReadOnly label="NISN" value={profile?.nisn} />
              <FieldReadOnly label="Kelas" value={profile?.nama_kelas} />
              <FieldReadOnly label="Jurusan" value={profile?.nama_jurusan} />
              {genderSelect}
              {alamatField}
              <SectionTitle text="Media Sosial" />
              <FieldEdit label="Instagram" value={instagram} onChange={setInstagram} placeholder="@username_instagram" />
              <FieldEdit label="YouTube" value={youtube} onChange={setYoutube} placeholder="Link channel YouTube" />
              <SectionTitle text="Data Orang Tua" />
              <FieldEdit label="Nama Ayah" value={namaAyah} onChange={setNamaAyah} placeholder="Nama ayah" />
              <FieldEdit label="Nama Ibu" value={namaIbu} onChange={setNamaIbu} placeholder="Nama ibu" />
              <FieldEdit label="No. WA Orang Tua" value={waOrtu} onChange={setWaOrtu} placeholder="08xxxxxxxxxx" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ORANG TUA ── */}
      {role === "orang_tua" && (
        <Card className="bg-[#111420] border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <Users className="h-4 w-4 text-primary" /> Data Orang Tua / Wali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sharedFields}
              <SectionTitle text="Informasi Tambahan" />
              <FieldEdit label="Nama Orang Tua / Wali" value={namaOrtu} onChange={setNamaOrtu} placeholder="Nama lengkap orang tua" />
              <FieldEdit label="Pekerjaan" value={pekerjaan} onChange={setPekerjaan} placeholder="Wiraswasta, PNS, dll" />
              {alamatField}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tombol Simpan */}
      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={saving} size="lg" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Semua Perubahan"}
        </Button>
      </div>

      {/* Ubah Password */}
      <Card className="bg-[#111420] border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <Lock className="h-4 w-4 text-primary" /> Ubah Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Password Lama</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••" className="bg-[#161a2b] border-border/30 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Password Baru</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••" className="bg-[#161a2b] border-border/30 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm flex items-center justify-between">
                <span>Konfirmasi</span>
                {confirmPassword && newPassword && (
                  <span className={`text-[10px] font-medium ${confirmPassword === newPassword ? "text-green-400" : "text-red-400"}`}>
                    {confirmPassword === newPassword ? "✓ Cocok" : "✗ Tidak cocok"}
                  </span>
                )}
              </Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`bg-[#161a2b] border-border/30 text-white ${confirmPassword && newPassword
                  ? confirmPassword === newPassword ? "border-green-500/50" : "border-red-500/50" : ""}`} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleChangePassword}
              disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              variant="outline" className="gap-2 border-border/30 text-white hover:bg-[#161a2b] disabled:opacity-40">
              <Lock className="h-4 w-4" />
              {changingPassword ? "Mengubah..." : "Ubah Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
