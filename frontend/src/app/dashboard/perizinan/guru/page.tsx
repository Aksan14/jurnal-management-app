"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getBackendUrl } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { Plus, Search, Calendar, CheckCircle, XCircle, Paperclip, Upload, Eye, X as XIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE: Record<string, string> = {
  Pending:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function PerizinanGuruPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guruSelf, setGuruSelf] = useState<any>(null);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<string>("");
  const buktiInputRef = React.useRef<HTMLInputElement>(null);
  const BACKEND_URL = getBackendUrl();
  const [formData, setFormData] = useState<any>({
    jenis_izin: "Sakit",
    tanggal_mulai: new Date().toISOString().substring(0, 10),
    tanggal_selesai: new Date().toISOString().substring(0, 10),
    keterangan: "",
  });

  const isKepsek  = user?.role === "kepsek";
  const isAdmin   = ["super_admin","admin"].includes(user?.role || "");
  const isGuru    = ["guru","wali_kelas","guru_bk","counselor"].includes(user?.role || "");
  const canApprove = isKepsek || isAdmin;
  const canCreate  = isGuru || isAdmin;

  const loadData = async () => {
    setLoading(true);
    try {
      let url = "/perizinan/guru";
      if (isGuru && guruSelf) url += `?guru_id=${guruSelf.id || guruSelf.ID}`;
      const res = await api.get(url);
      setData(res.data.data || []);
    } catch { toast.error("Gagal memuat data izin guru"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isGuru) {
      api.get("/master/guru").then(r => {
        const g = (r.data.data || []).find((x: any) => String(x.user_id) === String(user?.id) || String(x.user?.id) === String(user?.id));
        if (g) setGuruSelf(g);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => { if (!isGuru || guruSelf) loadData(); }, [guruSelf, user]);

  const handleApprove = async (id: number, status: "Approved" | "Rejected") => {
    try {
      await api.post(`/perizinan/guru/${id}/approve`, { status });
      toast.success(status === "Approved" ? "Izin disetujui — akan terlacak di jurnal hari itu" : "Izin ditolak");
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || "Gagal"); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let buktiUrl = "";
      if (buktiFile) {
        const fd = new FormData();
        fd.append("file", buktiFile);
        const upRes = await api.post("/upload/bukti", fd, { headers: { "Content-Type": "multipart/form-data" } });
        buktiUrl = upRes.data.data?.url || "";
      }
      const payload: any = { ...formData, bukti_url: buktiUrl };
      await api.post("/perizinan/guru", payload);
      toast.success("Izin berhasil diajukan, menunggu persetujuan Kepala Sekolah");
      setDialogOpen(false);
      setBuktiFile(null); setBuktiPreview("");
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || "Gagal mengajukan izin"); }
    finally { setSubmitting(false); }
  };

  const filtered = data.filter(d => {
    const q = search.toLowerCase();
    return (d.guru?.nama||"").toLowerCase().includes(q) || (d.keterangan||"").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Perizinan Guru</h1>
          <p className="text-gray-400 text-sm">Pengajuan izin guru — disetujui oleh Kepala Sekolah dan terlacak di jurnal mengajar.</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setFormData({ jenis_izin:"Sakit", tanggal_mulai: new Date().toISOString().substring(0,10), tanggal_selesai: new Date().toISOString().substring(0,10), keterangan:"" }); setBuktiFile(null); setBuktiPreview(""); setDialogOpen(true); }} className="bg-primary hover:bg-primary/95 gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Ajukan Izin
          </Button>
        )}
      </div>

      {isKepsek && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 text-sm text-blue-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Anda berwenang menyetujui atau menolak izin guru. Izin yang disetujui akan otomatis terlacak di jurnal mengajar hari tersebut.
        </div>
      )}

      <Card className="bg-[#111420] border-border/30 text-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg">Daftar Izin Guru</CardTitle>
            <CardDescription className="text-gray-400">Total: {filtered.length} pengajuan</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Cari nama guru..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-[#161a2b] border-border/30 text-white placeholder-gray-500" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center h-48 items-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Belum ada pengajuan izin guru</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-white/5 border-border/30">
                  <TableHead className="text-gray-400">Nama Guru</TableHead>
                  <TableHead className="text-gray-400">Jenis Izin</TableHead>
                  <TableHead className="text-gray-400">Tanggal</TableHead>
                  <TableHead className="text-gray-400">Keterangan</TableHead>
                  <TableHead className="text-gray-400">Bukti</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Disetujui Oleh</TableHead>
                  {canApprove && <TableHead className="text-gray-400 text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className="hover:bg-white/5 border-border/20">
                    <TableCell className="text-white font-semibold">{item.guru?.nama || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">{item.jenis_izin || "Izin"}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary" />
                        {new Date(item.tanggal_mulai).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
                        {item.tanggal_selesai !== item.tanggal_mulai && <> – {new Date(item.tanggal_selesai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</>}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs max-w-xs truncate">{item.keterangan}</TableCell>
                    <TableCell>
                      {item.bukti_url ? (
                        <a href={`${BACKEND_URL}${item.bukti_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-xs"><Paperclip className="h-3 w-3" />Lihat</a>
                      ) : <span className="text-gray-600 text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE[item.status] || STATUS_BADGE.Pending}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">{item.approver?.username || "-"}</TableCell>
                    {canApprove && (
                      <TableCell className="text-right space-x-1">
                        {item.status === "Pending" && (<>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(item.id, "Approved")} className="h-7 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1"><CheckCircle className="h-3 w-3" />Setujui</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(item.id, "Rejected")} className="h-7 text-red-400 hover:bg-red-500/10 text-xs gap-1"><XCircle className="h-3 w-3" />Tolak</Button>
                        </>)}
                        {item.status !== "Pending" && <span className="text-xs text-gray-500">Sudah diproses</span>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-2xl">
          <DialogHeader><DialogTitle className="text-white text-lg">Ajukan Izin Guru</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              ⚠️ Izin akan diteruskan ke Kepala Sekolah untuk disetujui. Setelah disetujui, hari izin terlacak di jurnal mengajar.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 col-span-1">
                <Label className="text-gray-300">Jenis Izin</Label>
                <Select value={formData.jenis_izin} onValueChange={v => setFormData({...formData, jenis_izin: v})}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="Sakit">Sakit</SelectItem>
                    <SelectItem value="Izin">Izin</SelectItem>
                    <SelectItem value="Keperluan Keluarga">Keperluan Keluarga</SelectItem>
                    <SelectItem value="Dinas Luar">Dinas Luar</SelectItem>
                    <SelectItem value="Cuti">Cuti</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Tanggal Mulai</Label>
                <Input type="date" value={formData.tanggal_mulai} onChange={e => setFormData({...formData, tanggal_mulai: e.target.value})} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Tanggal Selesai</Label>
                <Input type="date" value={formData.tanggal_selesai} onChange={e => setFormData({...formData, tanggal_selesai: e.target.value})} className="bg-[#161a2b] border-border/30 text-white" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Keterangan</Label>
              <Textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="bg-[#161a2b] border-border/30 text-white" placeholder="Alasan izin..." required />
            </div>

            {/* Upload Bukti */}
            <div className="space-y-2">
              <Label className="text-gray-300">Lampiran Bukti <span className="text-gray-500 text-xs font-normal">(opsional &mdash; foto/PDF/DOC, maks 10MB)</span></Label>
              <input ref={buktiInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setBuktiFile(f);
                  if (f && f.type.startsWith("image/")) setBuktiPreview(URL.createObjectURL(f));
                  else setBuktiPreview("");
                }} />
              {!buktiFile ? (
                <button type="button" onClick={() => buktiInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border/30 rounded-lg px-4 py-5 flex flex-col items-center gap-2 text-gray-500 hover:border-primary/40 hover:text-gray-300 transition-colors cursor-pointer">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Klik untuk upload foto / PDF / dokumen bukti</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-[#161a2b] border border-border/30 rounded-lg px-4 py-3">
                  {buktiPreview ? (
                    <img src={buktiPreview} className="h-12 w-12 object-cover rounded border border-border/20" />
                  ) : (
                    <div className="h-12 w-12 rounded border border-border/20 flex items-center justify-center bg-primary/10">
                      <Paperclip className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{buktiFile.name}</p>
                    <p className="text-xs text-gray-500">{(buktiFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={() => { setBuktiFile(null); setBuktiPreview(""); if (buktiInputRef.current) buktiInputRef.current.value = ""; }}
                    className="text-red-400 hover:text-red-300 p-1 rounded"><XIcon className="h-4 w-4" /></button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-gray-400" disabled={submitting}>Batal</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/95 text-white" disabled={submitting}>{submitting ? "Mengajukan..." : "Ajukan Izin"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
