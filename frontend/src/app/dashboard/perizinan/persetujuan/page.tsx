"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_BADGE: Record<string, string> = {
  Pending:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function PersetujuanPage() {
  const { user } = useAuthStore();
  const [siswaData, setSiswaData] = useState<any[]>([]);
  const [guruData, setGuruData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("siswa");

  const isAdmin   = ["super_admin","admin"].includes(user?.role || "");
  const isKepsek  = user?.role === "kepsek";
  const isWali    = user?.role === "wali_kelas";
  const isGuru    = user?.role === "guru";
  const canApproveGuru = isAdmin || isKepsek;
  const canApproveSiswa = isAdmin || isWali || isGuru;

  const loadAll = async () => {
    setLoading(true);
    try {
      // /perizinan/siswa sudah difilter otomatis oleh backend berdasarkan JWT role:
      // - guru/wali_kelas: hanya perizinan yang ditujukan ke mereka
      // - admin/kepsek: semua
      const [rs, rg] = await Promise.all([
        api.get("/perizinan/siswa"),
        canApproveGuru ? api.get("/perizinan/guru") : Promise.resolve({ data: { data: [] } }),
      ]);
      setSiswaData(rs.data.data || []);
      setGuruData(rg.data.data || []);
    } catch { toast.error("Gagal memuat data persetujuan"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleApproveSiswa = async (id: number, status: "Approved"|"Rejected") => {
    try {
      await api.post(`/perizinan/siswa/${id}/approve`, { status });
      toast.success(status === "Approved" ? "Izin siswa disetujui" : "Izin siswa ditolak");
      loadAll();
    } catch (err: any) { toast.error(err.response?.data?.message || "Gagal"); }
  };

  const handleApproveGuru = async (id: number, status: "Approved"|"Rejected") => {
    try {
      await api.post(`/perizinan/guru/${id}/approve`, { status });
      toast.success(status === "Approved" ? "Izin guru disetujui — terlacak di jurnal" : "Izin guru ditolak");
      loadAll();
    } catch (err: any) { toast.error(err.response?.data?.message || "Gagal"); }
  };

  const applyFilter = (items: any[], nameKey: (i:any)=>string) =>
    items.filter(d => {
      const matchSearch = nameKey(d).toLowerCase().includes(search.toLowerCase()) || (d.keterangan||"").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || d.status === filterStatus;
      return matchSearch && matchStatus;
    });

  const filteredSiswa = applyFilter(siswaData, d => d.siswa?.nama || "");
  const filteredGuru  = applyFilter(guruData,  d => d.guru?.nama || "");

  const pendingSiswaCount = siswaData.filter(d => d.status === "Pending").length;
  const pendingGuruCount  = guruData.filter(d => d.status === "Pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Persetujuan Perizinan</h1>
        <p className="text-gray-400 text-sm">Kelola semua pengajuan izin siswa dan guru dari satu tempat.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#111420] border-amber-500/30 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-400 text-xs font-medium uppercase tracking-wide">Izin Siswa Pending</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-400">{pendingSiswaCount}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-gray-500 text-xs">dari {siswaData.length} total pengajuan</p></CardContent>
        </Card>
        <Card className="bg-[#111420] border-amber-500/30 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-400 text-xs font-medium uppercase tracking-wide">Izin Guru Pending</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-400">{pendingGuruCount}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-gray-500 text-xs">dari {guruData.length} total pengajuan</p></CardContent>
        </Card>
      </div>

      <Card className="bg-[#111420] border-border/30 text-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input placeholder="Cari nama..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-[#161a2b] border-border/30 text-white placeholder-gray-500" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 w-36 text-gray-300 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Disetujui</SelectItem>
                    <SelectItem value="Rejected">Ditolak</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#161a2b] border-border/20 mb-4">
              <TabsTrigger value="siswa" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-400">
                Izin Siswa
                {pendingSiswaCount > 0 && <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">{pendingSiswaCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="guru" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-400">
                Izin Guru
                {pendingGuruCount > 0 && <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">{pendingGuruCount}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="siswa">
              {loading ? (
                <div className="flex justify-center h-40 items-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
              ) : filteredSiswa.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Tidak ada pengajuan izin siswa</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-white/5 border-border/30">
                      <TableHead className="text-gray-400">Nama Siswa</TableHead>
                      <TableHead className="text-gray-400">Kelas</TableHead>
                      <TableHead className="text-gray-400">Tipe Izin</TableHead>
                      <TableHead className="text-gray-400">Tanggal</TableHead>
                      <TableHead className="text-gray-400">Keterangan</TableHead>
                      <TableHead className="text-gray-400">Tujuan</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      {canApproveSiswa && <TableHead className="text-gray-400 text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSiswa.map(item => (
                      <TableRow key={item.id} className="hover:bg-white/5 border-border/20">
                        <TableCell className="text-white font-semibold">{item.siswa?.nama || "-"}</TableCell>
                        <TableCell className="text-gray-400 text-xs">{item.siswa?.kelas?.nama_kelas || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                            {item.tipe_izin === "harian" ? "Izin Harian" : item.tipe_izin === "mapel" ? "Izin Mapel" : item.tipe_izin}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs">
                          {new Date(item.tanggal_mulai).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
                          {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai && <> – {new Date(item.tanggal_selesai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</>}
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs max-w-48 truncate">{item.keterangan}</TableCell>
                        <TableCell className="text-gray-400 text-xs">
                          {item.tipe_izin === "harian" ? item.wali_kelas?.nama || "Wali Kelas" : item.mapel?.nama_mapel || "Guru Mapel"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[item.status] || STATUS_BADGE.Pending}>{item.status}</Badge>
                        </TableCell>
                        {canApproveSiswa && (
                          <TableCell className="text-right space-x-1">
                            {item.status === "Pending" && (<>
                              <Button size="sm" variant="ghost" onClick={() => handleApproveSiswa(item.id, "Approved")} className="h-7 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1"><CheckCircle className="h-3 w-3" />Setujui</Button>
                              <Button size="sm" variant="ghost" onClick={() => handleApproveSiswa(item.id, "Rejected")} className="h-7 text-red-400 hover:bg-red-500/10 text-xs gap-1"><XCircle className="h-3 w-3" />Tolak</Button>
                            </>)}
                            {item.status !== "Pending" && <span className="text-xs text-gray-500">Selesai</span>}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="guru">
              {loading ? (
                <div className="flex justify-center h-40 items-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
              ) : filteredGuru.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Tidak ada pengajuan izin guru</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-white/5 border-border/30">
                      <TableHead className="text-gray-400">Nama Guru</TableHead>
                      <TableHead className="text-gray-400">Jenis Izin</TableHead>
                      <TableHead className="text-gray-400">Tanggal</TableHead>
                      <TableHead className="text-gray-400">Keterangan</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Disetujui Oleh</TableHead>
                      {canApproveGuru && <TableHead className="text-gray-400 text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuru.map(item => (
                      <TableRow key={item.id} className="hover:bg-white/5 border-border/20">
                        <TableCell className="text-white font-semibold">{item.guru?.nama || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">{item.jenis_izin || "Izin"}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs">
                          {new Date(item.tanggal_mulai).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
                          {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai && <> – {new Date(item.tanggal_selesai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</>}
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs max-w-48 truncate">{item.keterangan}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[item.status] || STATUS_BADGE.Pending}>{item.status}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs">{item.approver?.username || "-"}</TableCell>
                        {canApproveGuru && (
                          <TableCell className="text-right space-x-1">
                            {item.status === "Pending" && (<>
                              <Button size="sm" variant="ghost" onClick={() => handleApproveGuru(item.id, "Approved")} className="h-7 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1"><CheckCircle className="h-3 w-3" />Setujui</Button>
                              <Button size="sm" variant="ghost" onClick={() => handleApproveGuru(item.id, "Rejected")} className="h-7 text-red-400 hover:bg-red-500/10 text-xs gap-1"><XCircle className="h-3 w-3" />Tolak</Button>
                            </>)}
                            {item.status !== "Pending" && <span className="text-xs text-gray-500">Selesai</span>}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
