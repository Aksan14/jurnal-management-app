"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { Calendar, Search, Shield, Filter, FileDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableRow,
  TableHead
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/audit-logs");
      setLogs(res.data.data || []);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) {
        toast.error("Anda tidak memiliki akses ke log audit");
      } else {
        toast.error("Gagal memuat log audit aktivitas");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (["super_admin", "admin", "kepsek"].includes(user.role)) {
      loadAuditLogs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    const sLower = search.toLowerCase();
    const matchesSearch =
      (log.aktivitas && log.aktivitas.toLowerCase().includes(sLower)) ||
      (log.user?.username && log.user.username.toLowerCase().includes(sLower)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(sLower));

    const matchesAction = filterAction === "" || (log.aktivitas || "").includes(filterAction);
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (aktivitas: string) => {
    if (!aktivitas) return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    const a = aktivitas.toLowerCase();
    if (a.includes("tambah") || a.includes("create") || a.includes("berhasil login")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (a.includes("ubah") || a.includes("update") || a.includes("perbarui")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (a.includes("hapus") || a.includes("delete")) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (a.includes("logout") || a.includes("gagal")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Laporan & Audit Log</h1>
          <p className="text-muted-foreground text-sm">Jejak aktivitas keamanan, operasi database, dan riwayat audit sistem.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" /> Ekspor Log (.CSV)
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Operasi Tercatat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Seluruh riwayat sistem</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operasi Mutasi Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {logs.filter(l => (l.aktivitas || "").toLowerCase().includes("tambah") || (l.aktivitas || "").toLowerCase().includes("hapus")).length}
            </div>
            <p className="text-xs text-muted-foreground">Tambah / hapus data</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IP Unik Terdeteksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {new Set(logs.map(l => l.ip_address)).size} IP
            </div>
            <p className="text-xs text-muted-foreground">Akses jaringan terdeteksi</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-base text-foreground">Jejak Audit Keamanan</CardTitle>
            <CardDescription className="text-muted-foreground">Daftar operasi modifikasi data yang direkam.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari aktivitas, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada jejak audit tercatat</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Waktu</TableHead>
                  <TableHead className="text-muted-foreground">Operator</TableHead>
                  <TableHead className="text-muted-foreground">Aktivitas</TableHead>
                  <TableHead className="text-muted-foreground">IP Address</TableHead>
                  <TableHead className="text-muted-foreground text-right">User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id || log.ID} className="border-border hover:bg-muted/40">
                    <TableCell className="text-foreground font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {log.created_at ? new Date(log.created_at).toLocaleString("id-ID") : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground font-medium text-sm">{log.user?.username || `User ID: ${log.user_id}`}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{log.user?.role || ""}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <Badge variant="outline" className={`${getActionBadgeColor(log.aktivitas)} text-xs whitespace-normal text-left`}>
                        {log.aktivitas || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {log.ip_address || "127.0.0.1"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs text-right max-w-50 truncate" title={log.user_agent}>
                      {log.user_agent ? log.user_agent.substring(0, 40) + (log.user_agent.length > 40 ? "..." : "") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
