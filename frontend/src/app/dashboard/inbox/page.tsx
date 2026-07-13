"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Send,
  Inbox,
  Trash2,
  Eye,
  RefreshCw,
  PenSquare,
} from "lucide-react";

interface Pesan {
  id: number;
  dari_user_id: number;
  ke_user_id: number;
  judul: string;
  isi: string;
  is_read: boolean;
  created_at: string;
  dari_user?: { username: string; nama_lengkap: string };
  ke_user?: { username: string; nama_lengkap: string };
}

interface UserOption {
  id: number;
  username: string;
  nama_lengkap: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  guru: "Guru",
  guru_bk: "Guru BK",
  counselor: "Konselor",
  wali_kelas: "Wali Kelas",
  kepsek: "Kepsek",
  siswa: "Siswa",
  orang_tua: "Ortu",
};

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<"masuk" | "terkirim">("masuk");
  const [inbox, setInbox] = useState<Pesan[]>([]);
  const [terkirim, setTerkirim] = useState<Pesan[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedPesan, setSelectedPesan] = useState<Pesan | null>(null);
  const [viewDialog, setViewDialog] = useState(false);

  const [kirimDialog, setKirimDialog] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [keUserID, setKeUserID] = useState("");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadAll();
    loadUsers();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get("/pesan/inbox"),
        api.get("/pesan/terkirim"),
      ]);
      setInbox(r1.data.data || []);
      setTerkirim(r2.data.data || []);
    } catch {
      toast.error("Gagal memuat pesan");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await api.get("/pesan/users");
      setUsers(res.data.data || []);
    } catch {}
  }

  async function handleView(p: Pesan) {
    setSelectedPesan(p);
    setViewDialog(true);
    if (!p.is_read && activeTab === "masuk") {
      try {
        await api.put(`/pesan/${p.id}/baca`);
        setInbox((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, is_read: true } : x))
        );
      } catch {}
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus pesan ini?")) return;
    try {
      await api.delete(`/pesan/${id}`);
      toast.success("Pesan dihapus");
      loadAll();
      if (viewDialog && selectedPesan?.id === id) setViewDialog(false);
    } catch {
      toast.error("Gagal menghapus pesan");
    }
  }

  async function handleKirim() {
    if (!keUserID || !judul || !isi) {
      toast.error("Lengkapi semua field");
      return;
    }
    setSending(true);
    try {
      await api.post("/pesan", {
        ke_user_id: Number(keUserID),
        judul,
        isi,
      });
      toast.success("Pesan terkirim");
      setKirimDialog(false);
      setKeUserID("");
      setJudul("");
      setIsi("");
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  }

  const unreadCount = inbox.filter((p) => !p.is_read).length;
  const currentList = activeTab === "masuk" ? inbox : terkirim;

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Pesan
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} pesan belum dibaca`
              : "Semua pesan telah dibaca"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="border-border/30 text-white hover:bg-[#161a2b] gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setKirimDialog(true)}
            size="sm"
            className="gap-2"
          >
            <PenSquare className="h-4 w-4" />
            Tulis Pesan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111420] p-1 rounded-xl border border-border/30 w-fit">
        <button
          onClick={() => setActiveTab("masuk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "masuk"
              ? "bg-primary text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Masuk
          {unreadCount > 0 && (
            <span className="bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5 min-w-4.5 text-center">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("terkirim")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "terkirim"
              ? "bg-primary text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Send className="h-4 w-4" />
          Terkirim
          <span className="text-xs text-gray-400">({terkirim.length})</span>
        </button>
      </div>

      {/* Pesan List */}
      <Card className="bg-[#111420] border-border/30">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada pesan</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {currentList.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-[#161a2b] transition-colors ${
                    activeTab === "masuk" && !p.is_read
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {activeTab === "masuk" ? (
                        <span className="text-xs text-gray-400">
                          Dari:{" "}
                          <span className="text-white font-medium">
                            {p.dari_user?.nama_lengkap || p.dari_user?.username || `User #${p.dari_user_id}`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Ke:{" "}
                          <span className="text-white font-medium">
                            {p.ke_user?.nama_lengkap || p.ke_user?.username || `User #${p.ke_user_id}`}
                          </span>
                        </span>
                      )}
                      {activeTab === "masuk" && !p.is_read && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5">
                          Baru
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm truncate ${activeTab === "masuk" && !p.is_read ? "font-semibold text-white" : "text-gray-200"}`}>
                      {p.judul}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{p.isi}</p>
                    <p className="text-[11px] text-gray-600 mt-1">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-white"
                      onClick={() => handleView(p)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-destructive"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              {selectedPesan?.judul}
            </DialogTitle>
          </DialogHeader>
          {selectedPesan && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>
                  Dari:{" "}
                  <span className="text-white">
                    {selectedPesan.dari_user?.nama_lengkap ||
                      selectedPesan.dari_user?.username ||
                      `User #${selectedPesan.dari_user_id}`}
                  </span>
                </span>
                <span>{formatDate(selectedPesan.created_at)}</span>
              </div>
              <div className="bg-[#161a2b] rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap min-h-25">
                {selectedPesan.isi}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setViewDialog(false)} className="text-gray-400">
              Tutup
            </Button>
            {selectedPesan && (
              <Button
                variant="outline"
                onClick={() => {
                  setViewDialog(false);
                  const u = users.find((x) => x.id === selectedPesan.dari_user_id);
                  if (u) {
                    setKeUserID(String(u.id));
                    setJudul(`Re: ${selectedPesan.judul}`);
                    setIsi("");
                    setKirimDialog(true);
                  }
                }}
                className="border-border/30 text-white hover:bg-[#161a2b] gap-2"
              >
                <Send className="h-4 w-4" />
                Balas
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kirim Pesan Dialog */}
      <Dialog open={kirimDialog} onOpenChange={setKirimDialog}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-4 w-4 text-primary" />
              Tulis Pesan Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Penerima</Label>
              <Select value={keUserID} onValueChange={(v) => setKeUserID(v ?? "")}>  
                <SelectTrigger className="bg-[#161a2b] border-border/30 text-white">
                  <SelectValue placeholder="Pilih penerima..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)} className="focus:bg-[#161a2b]">
                      <span className="font-medium">{u.nama_lengkap || u.username}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        ({roleLabels[u.role] || u.role})
                      </span>
                    </SelectItem>
                  ))}
                          </SelectGroup>
        </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Judul</Label>
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Judul pesan"
                className="bg-[#161a2b] border-border/30 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Isi Pesan</Label>
              <Textarea
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Tulis pesan Anda di sini..."
                rows={5}
                className="bg-[#161a2b] border-border/30 text-white resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setKirimDialog(false)} className="text-gray-400">
              Batal
            </Button>
            <Button onClick={handleKirim} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Mengirim..." : "Kirim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
