"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Clock, Calendar, QrCode, Scan, Shield, Save, CheckCircle, XCircle, AlertCircle, MapPin, RefreshCw, Users, UserCheck, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";

const STATUS_COLOR: Record<string, string> = {
  Hadir:"bg-emerald-500/20 text-emerald-400 border-emerald-500/30", Terlambat:"bg-amber-500/20 text-amber-400 border-amber-500/30",
  Alpa:"bg-red-500/20 text-red-400 border-red-500/30", H:"bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  S:"bg-blue-500/20 text-blue-400 border-blue-500/30", I:"bg-purple-500/20 text-purple-400 border-purple-500/30",
  A:"bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_LABEL: Record<string, string> = { H:"Hadir", S:"Sakit", I:"Izin", A:"Alpa" };

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [selfLoading, setSelfLoading] = useState(false);
  const [scannedQR, setScannedQR] = useState("");
  const [scanLat, setScanLat] = useState("-6.2088");
  const [scanLng, setScanLng] = useState("106.8456");
  const [scanLoading, setScanLoading] = useState(false);
  const [geoLat, setGeoLat] = useState<number|null>(null);
  const [geoLng, setGeoLng] = useState<number|null>(null);
  const [cfgGuru, setCfgGuru] = useState<any>({ jam_masuk_mulai:"06:30", jam_masuk_selesai:"07:30", jam_pulang_mulai:"15:00", jam_pulang_selesai:"17:00" });
  const [cfgSiswa, setCfgSiswa] = useState<any>({ jam_masuk_mulai:"06:45", jam_masuk_selesai:"07:15", jam_pulang_mulai:"14:30", jam_pulang_selesai:"16:00" });

  const isAdmin = ["super_admin","admin"].includes(user?.role||"");
  const isGuru  = ["guru","wali_kelas","guru_bk","counselor","kepsek"].includes(user?.role||"");
  const isSiswa = user?.role==="siswa";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await api.get("/profile");
      const p = profileRes.data.data;
      setProfile(p);
      if (isGuru) {
        const guruID = p?.guru_id;
        if (guruID) {
          const [logsRes, statusRes] = await Promise.all([
            api.get(`/attendance/guru?guru_id=${guruID}&limit=30`),
            api.get(`/attendance/guru/${guruID}/status`),
          ]);
          setLogs(logsRes.data.data||[]);
          setTodayStatus(statusRes.data.data);
        }
      } else if (isSiswa) {
        const r = await api.get("/attendance/siswa?limit=30");
        setLogs(r.data.data||[]);
      } else if (isAdmin) {
        const [g,s,c1,c2] = await Promise.all([
          api.get("/attendance/guru?limit=50"),
          api.get("/attendance/siswa?limit=50"),
          api.get("/attendance/config/Guru").catch(()=>({data:{data:null}})),
          api.get("/attendance/config/Siswa").catch(()=>({data:{data:null}})),
        ]);
        setLogs([
          ...(g.data.data||[]).map((l:any)=>({...l,_tipe:"guru"})),
          ...(s.data.data||[]).map((l:any)=>({...l,_tipe:"siswa"})),
        ]);
        if(c1.data.data) setCfgGuru(c1.data.data);
        if(c2.data.data) setCfgSiswa(c2.data.data);
      }
    } catch { toast.error("Gagal memuat data absensi"); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos)=>{ setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); }, ()=>{}
      );
    }
  }, []);

  const getQRValue = () => {
    if (!profile) return "";
    if (isSiswa) return profile.siswa_id ? `JURNAL_QR:siswa:${profile.siswa_id}` : "";
    return profile.guru_id ? `JURNAL_QR:guru:${profile.guru_id}` : "";
  };

  const handleSelfCheckIn = async () => {
    setSelfLoading(true);
    try {
      const res = await api.post("/attendance/self-checkin", { latitude:geoLat??0, longitude:geoLng??0 });
      toast.success(res.data.message||"Absensi berhasil dicatat!");
      load();
    } catch(e:any){ toast.error(e.response?.data?.message||"Gagal absen mandiri"); }
    finally { setSelfLoading(false); }
  };

  const handleGateScan = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!scannedQR.trim()) return toast.error("QR Code kosong");
    setScanLoading(true);
    try {
      const parts=scannedQR.split(":");
      const ep = parts[1]==="guru" ? "/attendance/scan/teacher" : "/attendance/scan/student";
      const res = await api.post(ep, { qr_code:scannedQR, latitude:Number(scanLat), longitude:Number(scanLng) });
      toast.success(res.data.message||"Absensi berhasil dicatat!");
      setScannedQR(""); load();
    } catch(e:any){ toast.error(e.response?.data?.message||"QR tidak valid / diluar jam absen"); }
    finally { setScanLoading(false); }
  };

  const handleSaveConfig = async (e:React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([api.put("/attendance/config/Guru",cfgGuru), api.put("/attendance/config/Siswa",cfgSiswa)]);
      toast.success("Pengaturan jam berhasil disimpan");
    } catch { toast.error("Gagal menyimpan pengaturan"); }
  };

  const renderTodayStatus = () => {
    if (!todayStatus) return null;
    if (!todayStatus.already_checked_in) return (
      <div className="flex items-center gap-2 text-amber-400"><AlertCircle className="h-4 w-4"/><span className="text-sm">Belum absen masuk hari ini</span></div>
    );
    const ci = todayStatus.check_in_time ? new Date(todayStatus.check_in_time).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "-";
    const co = todayStatus.check_out_time ? new Date(todayStatus.check_out_time).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : null;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-emerald-400"><CheckCircle className="h-4 w-4"/><span className="text-sm">Masuk: <strong>{ci}</strong> — {todayStatus.status}</span></div>
        {co ? <div className="flex items-center gap-2 text-blue-400"><CheckCircle className="h-4 w-4"/><span className="text-sm">Pulang: <strong>{co}</strong></span></div>
             : <div className="flex items-center gap-2 text-muted-foreground"><XCircle className="h-4 w-4"/><span className="text-sm">Belum absen pulang</span></div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Absensi Kehadiran & QR</h1>
        <p className="text-muted-foreground text-sm">Kelola kehadiran harian, scan QR gerbang sekolah, dan riwayat absen.</p>
      </div>

      <Tabs defaultValue={isSiswa||isGuru?"qr_saya":"scanner"} className="space-y-4">
        <TabsList className="bg-card border border-border/20 p-1 rounded-xl">
          {(isGuru||isSiswa) && <TabsTrigger value="qr_saya" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"><QrCode className="h-4 w-4 mr-1.5"/>QR Code Saya</TabsTrigger>}
          <TabsTrigger value="riwayat" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"><Calendar className="h-4 w-4 mr-1.5"/>Riwayat Kehadiran</TabsTrigger>
          {isAdmin && <TabsTrigger value="scanner" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"><Scan className="h-4 w-4 mr-1.5"/>Scanner Gerbang</TabsTrigger>}
          {isAdmin && <TabsTrigger value="pengaturan" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"><Shield className="h-4 w-4 mr-1.5"/>Jam Operasional</TabsTrigger>}
        </TabsList>

        {/* QR CODE SAYA */}
        {(isGuru||isSiswa) && (
          <TabsContent value="qr_saya">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card border-border/30 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><QrCode className="h-5 w-5 text-primary"/>Kartu Digital Absensi QR</CardTitle>
                  <CardDescription>Tunjukkan ke scanner gerbang sekolah atau kirimkan ke admin.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 py-6 bg-muted/20 border-y border-border/10">
                  {loading ? <div className="w-44 h-44 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>
                  : getQRValue() ? <div id="qr-code-svg" className="p-4 bg-white rounded-2xl shadow-xl"><QRCodeSVG value={getQRValue()} size={176} level="M"/></div>
                  : <div className="text-center text-muted-foreground p-8">Profil tidak terdeteksi</div>}
                  <div className="text-center">
                    <p className="font-bold text-sm tracking-widest uppercase text-primary">{profile?.nama_lengkap||user?.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isSiswa?`NIS: ${profile?.nis||profile?.nisn||"- "}`:`NIP: ${profile?.nip||"-"}`}</p>
                  </div>
                  {getQRValue() && (
                    <div className="w-full px-2">
                      <p className="text-xs text-muted-foreground text-center mb-1.5">Kode QR Anda (berikan ke admin/scanner):</p>
                      <div className="flex items-center gap-2 bg-muted/40 border border-border/30 rounded-lg px-3 py-2">
                        <code className="flex-1 text-xs font-mono text-primary break-all">{getQRValue()}</code>
                        <button
                          type="button"
                          onClick={()=>{ navigator.clipboard.writeText(getQRValue()); toast.success("Kode QR disalin!"); }}
                          className="shrink-0 text-xs text-muted-foreground hover:text-primary border border-border/30 rounded px-2 py-1 hover:border-primary/50 transition-colors"
                        >Salin</button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-between py-3 text-xs text-muted-foreground">
                  <span>Update otomatis setiap hari kerja</span>
                </CardFooter>
              </Card>

              {isGuru && (
                <Card className="bg-card border-border/30">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary"/>Cara Absen Guru</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Tunjukkan QR Code di atas ke scanner gerbang sekolah saat masuk atau keluar.",
                      "Petugas piket / admin akan melakukan scan QR di tab Scanner Gerbang.",
                      "Riwayat lengkap kehadiran dapat dilihat di tab Riwayat Kehadiran.",
                    ].map((t,i)=>(
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold">{i+1}</span>
                        <p>{t}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {isSiswa && (
                <Card className="bg-card border-border/30">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary"/>Cara Absen Siswa</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Tunjukkan QR Code di atas ke scanner gerbang sekolah saat masuk atau keluar.",
                      "Absensi per mata pelajaran dilakukan oleh guru melalui jurnal mengajar.",
                      "Riwayat lengkap dapat dilihat di tab Riwayat Kehadiran.",
                    ].map((t,i)=>(
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold">{i+1}</span>
                        <p>{t}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {/* RIWAYAT */}
        <TabsContent value="riwayat">
          <Card className="bg-card border-border/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Riwayat Kehadiran</CardTitle>
                <CardDescription>{isAdmin?"Semua data kehadiran guru dan siswa":"Riwayat kehadiran Anda"}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5"/>Refresh</Button>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex items-center justify-center h-48"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>
              : logs.length===0 ? <div className="text-center py-12 text-muted-foreground">Belum ada riwayat kehadiran</div>
              : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30">
                      <TableHead>Tanggal</TableHead>
                      {isAdmin&&<TableHead>Nama</TableHead>}
                      <TableHead>Jam Masuk</TableHead>
                      <TableHead>Jam Pulang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log,i)=>{
                      const tgl=log.tanggal||log.waktu_scan||log.created_at;
                      const isPulang = log.tipe_absen==="pulang";
                      const isMasuk = !log.tipe_absen || log.tipe_absen==="masuk";
                      const waktuScan = log.waktu_scan||log.created_at;
                      const masuk = isMasuk ? (log.jam_masuk||waktuScan) : (log.jam_masuk||null);
                      const pulang = isPulang ? (log.waktu_scan||log.jam_pulang) : (log.jam_pulang||null);
                      const status=log.status||log.status_kehadiran;
                      return (
                        <TableRow key={`${log.id}-${i}`} className="border-border/20">
                          <TableCell className="font-medium">{tgl?new Date(tgl).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"-"}</TableCell>
                          {isAdmin&&<TableCell><div className="font-medium">{log.guru?.nama||log.siswa?.nama||"-"}</div><div className="text-xs text-muted-foreground">{log._tipe==="guru"?"Guru":"Siswa"}</div></TableCell>}
                          <TableCell>
                            {masuk?<span className="font-medium">{new Date(masuk).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span>:"-"}
                          </TableCell>
                          <TableCell>
                            {pulang?<span className="font-medium">{new Date(pulang).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span>:"-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className={STATUS_COLOR[status]||"bg-gray-500/20 text-gray-400"}>{STATUS_LABEL[status]||status||"-"}</Badge>
                              {log.tipe_absen&&<Badge variant="outline" className={isPulang?"bg-orange-500/20 text-orange-400 border-orange-500/30":"bg-blue-500/20 text-blue-400 border-blue-500/30"}>{isPulang?"Pulang":"Masuk"}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{log.keterangan||"-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCANNER GERBANG */}
        {isAdmin && (
          <TabsContent value="scanner">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Scan className="h-5 w-5 text-primary"/>Terminal Scanner Gerbang</CardTitle>
                  <CardDescription>Masukkan isi QR Code siswa/guru untuk mencatat kehadiran.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGateScan} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Kode QR</Label>
                      <Input placeholder="JURNAL_QR:siswa:3  atau  JURNAL_QR:guru:1" value={scannedQR} onChange={(e)=>setScannedQR(e.target.value)} className="font-mono text-sm"/>
                      <p className="text-xs text-muted-foreground">Format: <code>JURNAL_QR:siswa:&#123;ID&#125;</code> atau <code>JURNAL_QR:guru:&#123;ID&#125;</code></p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Latitude</Label><Input value={scanLat} onChange={(e)=>setScanLat(e.target.value)}/></div>
                      <div className="space-y-1.5"><Label>Longitude</Label><Input value={scanLng} onChange={(e)=>setScanLng(e.target.value)}/></div>
                    </div>
                    <Button type="submit" disabled={scanLoading} className="w-full gap-2 py-5">
                      <Shield className="h-5 w-5"/>{scanLoading?"Memproses...":"Verifikasi & Catat Absen"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/30">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-amber-400"/>Mekanisme Absensi</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="space-y-1"><p className="font-semibold text-foreground">👤 Guru / Wali Kelas</p>
                    <ul className="space-y-1 pl-4 list-disc">
                      <li>Scan QR gerbang → <code>tbl_absensi_guru</code></li>
                      <li>Self check-in mandiri via GPS dari tab QR Code</li>
                      <li>Scan 1× = masuk, scan 2× = pulang</li>
                      <li>Status: <strong>Hadir</strong> / <strong>Terlambat</strong></li>
                    </ul>
                  </div>
                  <div className="space-y-1"><p className="font-semibold text-foreground">🎓 Siswa</p>
                    <ul className="space-y-1 pl-4 list-disc">
                      <li>Scan QR gerbang → <code>tbl_absensi</code></li>
                      <li>Absensi per mapel oleh guru via jurnal mengajar</li>
                      <li>Status: H Hadir / S Sakit / I Izin / A Alpa</li>
                    </ul>
                  </div>
                  <div className="space-y-1"><p className="font-semibold text-foreground">⏰ Jam Berlaku</p>
                    <ul className="space-y-1 pl-4 list-disc">
                      <li>Absen diluar jam yang dikonfigurasi akan ditolak</li>
                      <li>Admin dapat ubah jam di tab Jam Operasional</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* JAM OPERASIONAL */}
        {isAdmin && (
          <TabsContent value="pengaturan">
            <form onSubmit={handleSaveConfig} className="grid gap-6 md:grid-cols-2">
              {[["Jam Kehadiran Guru", cfgGuru, setCfgGuru],["Jam Kehadiran Siswa", cfgSiswa, setCfgSiswa]].map(([title,cfg,setCfg]:any)=>(
                <Card key={title} className="bg-card border-border/30">
                  <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {[["Jam Masuk Mulai","jam_masuk_mulai"],["Batas Akhir Masuk (Toleransi)","jam_masuk_selesai"],["Jam Pulang Mulai","jam_pulang_mulai"],["Batas Akhir Pulang","jam_pulang_selesai"]].map(([label,key])=>(
                      <div key={key} className="space-y-1.5">
                        <Label>{label}</Label>
                        <Input type="time" value={cfg[key]} onChange={(e)=>setCfg({...cfg,[key]:e.target.value})}/>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
              <div className="md:col-span-2">
                <Button type="submit" className="gap-2"><Save className="h-4 w-4"/>Simpan Pengaturan Jam</Button>
              </div>
            </form>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
