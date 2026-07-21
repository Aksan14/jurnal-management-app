'use client';

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Clock, Coffee, GraduationCap, User as UserIcon, School, LayoutGrid, List, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface MengajarSectionProps {
  search: string;
  isKepsek: boolean;
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const STANDARD_SLOTS = ["1-2", "3-4", "5-6", "7-8", "9-10"];

const JAM_TIME: Record<string, string> = {
  "1": "07:00", "2": "07:45", "3": "08:30", "4": "09:15",
  "5": "10:15", "6": "11:00", "7": "11:45", "8": "12:30",
  "9": "13:15", "10": "14:00",
};

const SINGLE_JAMS = ["1","2","3","4","5","6","7","8","9","10"];
const RANGE_JAMS = ["1-2","2-3","3-4","4-5","5-6","6-7","7-8","8-9","9-10"];

function getSubjectColor(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("web") || lower.includes("program") || lower.includes("komputer") || lower.includes("tik")) {
    return { border: "border-l-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20", text: "text-indigo-400", badge: "bg-indigo-500/20 text-indigo-300" };
  }
  if (lower.includes("matematik") || lower.includes("fisika") || lower.includes("ipa") || lower.includes("kimia")) {
    return { border: "border-l-pink-500", bg: "bg-pink-500/10 border-pink-500/20", text: "text-pink-400", badge: "bg-pink-500/20 text-pink-300" };
  }
  if (lower.includes("inggris") || lower.includes("indonesia") || lower.includes("bahasa")) {
    return { border: "border-l-sky-500", bg: "bg-sky-500/10 border-sky-500/20", text: "text-sky-400", badge: "bg-sky-500/20 text-sky-300" };
  }
  if (lower.includes("sejarah") || lower.includes("pkn") || lower.includes("sosial") || lower.includes("geografi")) {
    return { border: "border-l-amber-500", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" };
  }
  return { border: "border-l-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" };
}

export default function MengajarSection({ search, isKepsek }: MengajarSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [kelases, setKelases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"matrix" | "timeline">("matrix");

  const [filterType, setFilterType] = useState<"kelas" | "guru">("kelas");
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [selectedGuruId, setSelectedGuruId] = useState("");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterTahun, setFilterTahun] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [formData, setFormData] = useState<any>({
    guru_id: "", mapel_id: "", kelas_id: "",
    hari: "Senin", jamMulai: "1", jamSelesai: "2", semester: "Ganjil", tahun_ajaran: "2025/2026"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, gRes, mRes, kRes] = await Promise.all([
        api.get("/master/mengajar?limit=10000"),
        api.get("/master/guru"),
        api.get("/master/mapel"),
        api.get("/master/kelas"),
      ]);
      setData(res.data.data || []);
      const guruList = gRes.data.data || [];
      setGurus(guruList);
      setMapels(mRes.data.data || []);
      const kelasList = kRes.data.data || [];
      setKelases(kelasList);
      if (kelasList.length > 0) {
        setSelectedKelasId(prev => prev && prev !== "all" ? prev : String(kelasList[0].id || kelasList[0].ID));
      }
      if (guruList.length > 0) {
        setSelectedGuruId(prev => prev && prev !== "all" ? prev : String(guruList[0].id || guruList[0].ID));
      }
    } catch {
      toast.error("Gagal memuat data jadwal mengajar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedItem(null);
    setFormData({
      guru_id: filterType === "guru" && selectedGuruId && selectedGuruId !== "all" ? selectedGuruId : "",
      mapel_id: "",
      kelas_id: filterType === "kelas" && selectedKelasId && selectedKelasId !== "all" ? selectedKelasId : "",
      hari: "Senin", jamMulai: "1", jamSelesai: "2",
      semester: filterSemester !== "all" ? filterSemester : "Ganjil",
      tahun_ajaran: filterTahun !== "all" ? filterTahun : "2025/2026"
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditMode(true);
    setSelectedItem(item);
    const jamKe = item.jam_ke || "1";
    const parts = jamKe.split("-");
    const jamMulai = parts[0] || "1";
    const jamSelesai = parts[1] || parts[0] || "1";
    setFormData({
      guru_id: item.guru_id ? String(item.guru_id) : "",
      mapel_id: item.mapel_id ? String(item.mapel_id) : "",
      kelas_id: item.kelas_id ? String(item.kelas_id) : "",
      hari: item.hari || "Senin",
      jamMulai,
      jamSelesai,
      semester: item.semester || "Ganjil",
      tahun_ajaran: item.tahun_ajaran || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      await api.delete(`/master/mengajar/${id}`);
      toast.success("Jadwal berhasil dihapus");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menghapus");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi semua field wajib
    if (!formData.guru_id || !formData.mapel_id || !formData.kelas_id) {
      toast.error("Guru, Mata Pelajaran, dan Kelas wajib dipilih");
      return;
    }
    if (!formData.tahun_ajaran.trim()) {
      toast.error("Tahun Ajaran wajib diisi");
      return;
    }

    const guruId = parseInt(formData.guru_id, 10);
    const mapelId = parseInt(formData.mapel_id, 10);
    const kelasId = parseInt(formData.kelas_id, 10);

    if (isNaN(guruId) || isNaN(mapelId) || isNaN(kelasId) || guruId <= 0 || mapelId <= 0 || kelasId <= 0) {
      toast.error("Data tidak valid, silakan pilih ulang");
      return;
    }

    // Build jam_ke lebih awal untuk keperluan validasi konflik
    const mulai = parseInt(formData.jamMulai, 10);
    const selesai = parseInt(formData.jamSelesai, 10);
    const jam_ke = mulai === selesai ? String(mulai) : `${mulai}-${selesai}`;

    // Helper: parse jam_ke jadi range [start, end]
    const parseRange = (jk: string) => {
      const p = jk.split("-");
      const s = parseInt(p[0], 10);
      const e = parseInt(p[1] ?? p[0], 10);
      return { s, e };
    };
    // Cek tumpang tindih antara dua range jam
    const isOverlap = (jk1: string, jk2: string) => {
      const a = parseRange(jk1);
      const b = parseRange(jk2);
      return a.s <= b.e && b.s <= a.e;
    };

    // Saring data yang relevan: semester + tahun ajaran + hari sama, bukan item yang sedang diedit
    const editingId = editMode && selectedItem ? (selectedItem.id || selectedItem.ID) : null;
    const sameSlotData = data.filter(d => {
      if (editingId && (d.id || d.ID) === editingId) return false; // skip item yg diedit
      return d.hari === formData.hari &&
        d.semester === formData.semester &&
        d.tahun_ajaran === formData.tahun_ajaran.trim() &&
        isOverlap(d.jam_ke, jam_ke);
    });

    // Konflik: kelas yang sama sudah ada di jam tersebut
    const konflikKelas = sameSlotData.find(d => String(d.kelas_id) === String(kelasId));
    if (konflikKelas) {
      const namaMapel = mapels.find(m => String(m.id || m.ID) === String(konflikKelas.mapel_id))?.nama_mapel || "mata pelajaran lain";
      const namaGuru = gurus.find(g => String(g.id || g.ID) === String(konflikKelas.guru_id))?.nama || "";
      toast.error(
        `Konflik jadwal: Kelas ini sudah ada "${namaMapel}"${namaGuru ? ` (${namaGuru})` : ""} di ${formData.hari} jam ${konflikKelas.jam_ke}`,
        { duration: 5000 }
      );
      return;
    }

    // Konflik: guru yang sama sudah mengajar di jam tersebut
    const konflikGuru = sameSlotData.find(d => String(d.guru_id) === String(guruId));
    if (konflikGuru) {
      const namaMapelGuru = mapels.find(m => String(m.id || m.ID) === String(konflikGuru.mapel_id))?.nama_mapel || "mata pelajaran lain";
      const namaKelas = kelases.find(k => String(k.id || k.ID) === String(konflikGuru.kelas_id))?.nama_kelas || "";
      toast.error(
        `Konflik jadwal: Guru ini sudah mengajar "${namaMapelGuru}"${namaKelas ? ` di ${namaKelas}` : ""} pada ${formData.hari} jam ${konflikGuru.jam_ke}`,
        { duration: 5000 }
      );
      return;
    }

    setSubmitting(true);
    setDialogOpen(false);

    const payload = {
      guru_id: guruId,
      mapel_id: mapelId,
      kelas_id: kelasId,
      hari: formData.hari,
      jam_ke,
      semester: formData.semester,
      tahun_ajaran: formData.tahun_ajaran.trim()
    };

    try {
      if (editMode && selectedItem) {
        await api.put(`/master/mengajar/${selectedItem.id || selectedItem.ID}`, payload);
        toast.success("Jadwal berhasil diperbarui");
      } else {
        await api.post("/master/mengajar", payload);
        toast.success("Jadwal berhasil ditambahkan");
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan jadwal");
      setDialogOpen(true); // buka kembali agar user bisa perbaiki
    } finally {
      setSubmitting(false);
    }
  };

  const tahunOptions = useMemo(() => {
    const set = new Set(data.map((d) => d.tahun_ajaran).filter(Boolean));
    return Array.from(set) as string[];
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    if (filterSemester !== "all") result = result.filter(d => d.semester === filterSemester);
    if (filterTahun !== "all") result = result.filter(d => d.tahun_ajaran === filterTahun);
    if (filterType === "kelas" && selectedKelasId && selectedKelasId !== "all") {
      result = result.filter(d => String(d.kelas_id) === selectedKelasId);
    } else if (filterType === "guru" && selectedGuruId && selectedGuruId !== "all") {
      result = result.filter(d => String(d.guru_id) === selectedGuruId);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.guru?.nama?.toLowerCase().includes(q) ||
        d.mapel?.nama_mapel?.toLowerCase().includes(q) ||
        d.kelas?.nama_kelas?.toLowerCase().includes(q) ||
        d.hari?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, filterType, selectedKelasId, selectedGuruId, filterSemester, filterTahun, search]);

  const timeSlots = useMemo(() => {
    const slots = Array.from(new Set(data.map(d => d.jam_ke))).sort((a, b) => {
      return (parseInt(a.split("-")[0]) || 0) - (parseInt(b.split("-")[0]) || 0);
    });
    return slots.length > 0 ? slots : STANDARD_SLOTS;
  }, [data]);

  const stats = useMemo(() => ({
    total: filteredData.length,
    guruAktif: new Set(filteredData.map((d) => d.guru_id)).size,
    mapelAktif: new Set(filteredData.map((d) => d.mapel_id)).size,
    kelasAktif: new Set(filteredData.map((d) => d.kelas_id)).size,
  }), [filteredData]);

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="bg-[#161a2b] border border-border/30 p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setViewMode("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "matrix" ? "bg-primary text-white shadow-md" : "text-gray-400 hover:text-white"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grid Mingguan
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "timeline" ? "bg-primary text-white shadow-md" : "text-gray-400 hover:text-white"}`}
          >
            <List className="h-3.5 w-3.5" /> Timeline Harian
          </button>
        </div>
        {!isKepsek && (
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/95 gap-2">
            <Plus className="h-4 w-4" /> Tambah Jadwal
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[#111420] border border-border/20 rounded-xl p-4 space-y-3">
        {/* Toggle Kelas / Guru */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">Tampilkan jadwal:</span>
          <div className="flex bg-[#161a2b] border border-border/30 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => {
                setFilterType("kelas");
                setSelectedKelasId(prev => (prev && prev !== "all") ? prev : (kelases.length > 0 ? String(kelases[0].id || kelases[0].ID) : ""));
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterType === "kelas" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              <School className="h-3 w-3" /> Per Kelas
            </button>
            <button
              onClick={() => {
                setFilterType("guru");
                setSelectedGuruId(prev => (prev && prev !== "all") ? prev : (gurus.length > 0 ? String(gurus[0].id || gurus[0].ID) : ""));
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterType === "guru" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              <UserIcon className="h-3 w-3" /> Per Guru
            </button>
          </div>

          {/* Kelas atau Guru dropdown langsung */}
          {filterType === "kelas" ? (
            <Select value={selectedKelasId} onValueChange={(v) => { if (v) setSelectedKelasId(v); }}>
              <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-8 text-xs w-48">
                <SelectValue>
                  {selectedKelasId === "all" || !selectedKelasId
                    ? "Semua Kelas"
                    : kelases.find(k => String(k.id || k.ID) === selectedKelasId)?.nama_kelas || "Pilih Kelas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelases.map(k => <SelectItem key={k.id || k.ID} value={String(k.id || k.ID)} label={k.nama_kelas}>{k.nama_kelas}</SelectItem>)}
                        </SelectGroup>
        </SelectContent>
            </Select>
          ) : (
            <Select value={selectedGuruId} onValueChange={(v) => { if (v) setSelectedGuruId(v); }}>
              <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-8 text-xs w-48">
                <SelectValue>
                  {selectedGuruId === "all" || !selectedGuruId
                    ? "Semua Guru"
                    : gurus.find(g => String(g.id || g.ID) === selectedGuruId)?.nama || "Pilih Guru"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                <SelectItem value="all">Semua Guru</SelectItem>
                {gurus.map(g => <SelectItem key={g.id || g.ID} value={String(g.id || g.ID)} label={g.nama}>{g.nama}</SelectItem>)}
                        </SelectGroup>
        </SelectContent>
            </Select>
          )}

          {/* Semester */}
          <Select value={filterSemester} onValueChange={(v) => { if (v) setFilterSemester(v); }}>
            <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-8 text-xs w-36">
              <SelectValue>
                {filterSemester === "all" ? "Semua Semester" : filterSemester}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
              <SelectItem value="all">Semua Semester</SelectItem>
              <SelectItem value="Ganjil">Ganjil</SelectItem>
              <SelectItem value="Genap">Genap</SelectItem>
                      </SelectGroup>
        </SelectContent>
          </Select>

          {/* Tahun Ajaran */}
          {tahunOptions.length > 0 && (
            <Select value={filterTahun} onValueChange={(v) => { if (v) setFilterTahun(v); }}>
              <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-8 text-xs w-36">
                <SelectValue>
                  {filterTahun === "all" ? "Semua Tahun" : filterTahun}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {tahunOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectGroup>
        </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Jadwal", value: stats.total, icon: LayoutGrid, color: "text-primary" },
          { label: "Guru Aktif", value: stats.guruAktif, icon: Users, color: "text-emerald-400" },
          { label: "Mata Pelajaran", value: stats.mapelAktif, icon: BookOpen, color: "text-violet-400" },
          { label: "Kelas Terlibat", value: stats.kelasAktif, icon: School, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111420] border border-border/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : viewMode === "matrix" ? (
        /* ── MATRIX TIMETABLE ── */
        <div className="bg-[#111420]/80 border border-border/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/20 bg-[#161a2b]/60">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-[120px] text-center border-r border-border/20">
                    Jam Ke
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="p-4 text-xs font-bold text-gray-200 uppercase tracking-wider min-w-[160px] text-center">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {timeSlots.map((slot) => (
                  <tr key={slot} className="hover:bg-white/[0.01] transition-all">
                    {/* Slot label */}
                    <td className="p-4 text-center font-bold text-gray-300 text-xs border-r border-border/20 bg-[#161a2b]/20">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>Sesi {slot}</span>
                        {slot.includes("-") && (() => {
                          const [s, e] = slot.split("-");
                          return <span className="text-[9px] text-gray-600">{JAM_TIME[s]}–{JAM_TIME[e]}</span>;
                        })()}
                      </div>
                    </td>
                    {/* Day columns */}
                    {DAYS.map((day) => {
                      const cellSchedules = filteredData.filter(s => s.hari === day && s.jam_ke === slot);
                      return (
                        <td key={day} className="p-2 align-top border-r border-border/10 last:border-r-0">
                          {cellSchedules.length === 0 ? (
                            <div
                              className={`h-full min-h-[90px] border border-dashed border-border/20 rounded-xl bg-white/[0.01] flex flex-col items-center justify-center text-center p-3 transition-all group ${!isKepsek ? "hover:bg-emerald-500/[0.03] hover:border-emerald-500/20 cursor-pointer" : ""}`}
                              onClick={() => {
                                if (!isKepsek) {
                                  const parts = (slot||"").split("-");
                                  setFormData({
                                    guru_id: filterType === "guru" && selectedGuruId && selectedGuruId !== "all" ? selectedGuruId : "",
                                    mapel_id: "",
                                    kelas_id: filterType === "kelas" && selectedKelasId && selectedKelasId !== "all" ? selectedKelasId : "",
                                    hari: day,
                                    jamMulai: parts[0] || "1",
                                    jamSelesai: parts[1] || parts[0] || "1",
                                    semester: filterSemester !== "all" ? filterSemester : "Ganjil",
                                    tahun_ajaran: filterTahun !== "all" ? filterTahun : "2025/2026"
                                  });
                                  setEditMode(false);
                                  setSelectedItem(null);
                                  setDialogOpen(true);
                                }
                              }}
                            >
                              <Coffee className="h-4 w-4 text-gray-600 group-hover:text-emerald-500/50 transition-colors mb-1" />
                              <span className="text-[10px] font-medium text-gray-500 group-hover:text-emerald-400/70 transition-colors">
                                Kosong
                              </span>
                              {!isKepsek && (
                                <span className="text-[9px] text-gray-600 group-hover:text-emerald-500/50 transition-colors mt-0.5 opacity-0 group-hover:opacity-100">
                                  + Tambah
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {cellSchedules.map((item: any) => {
                                const style = getSubjectColor(item.mapel?.nama_mapel || "");
                                const id = item.id || item.ID;
                                return (
                                  <div
                                    key={id}
                                    className={`p-2.5 rounded-xl border border-l-4 ${style.border} ${style.bg} hover:scale-[1.02] transition-all duration-200 shadow-md relative group cursor-pointer`}
                                    onClick={() => { setDetailItem(item); setDetailOpen(true); }}
                                  >
                                    <div className="space-y-1">
                                      <h4 className="font-bold text-white text-[11px] leading-snug line-clamp-2">
                                        {item.mapel?.nama_mapel}
                                      </h4>
                                      {filterType === "kelas" ? (
                                        <p className="text-[10px] text-gray-300 flex items-center gap-1">
                                          <UserIcon className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                                          <span className="truncate">{item.guru?.nama || "—"}</span>
                                        </p>
                                      ) : (
                                        <p className="text-[10px] text-gray-300 flex items-center gap-1">
                                          <School className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                                          <span className="truncate">{item.kelas?.nama_kelas || "—"}</span>
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/5 mt-1.5 pt-1 text-[9px] text-gray-400">
                                      <span className="flex items-center gap-0.5">
                                        <GraduationCap className="h-2.5 w-2.5 text-purple-400" />
                                        {item.semester}
                                      </span>
                                      {!isKepsek && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                                            className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                                          >
                                            <Edit2 className="h-2.5 w-2.5" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(id); }}
                                            className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-destructive transition-colors"
                                          >
                                            <Trash2 className="h-2.5 w-2.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── TIMELINE VIEW ── */
        <div className="space-y-4">
          {DAYS.map((day) => {
            const dayItems = filteredData
              .filter(d => d.hari === day)
              .sort((a, b) => (parseInt(a.jam_ke.split("-")[0]) || 0) - (parseInt(b.jam_ke.split("-")[0]) || 0));
            return (
              <div key={day} className="bg-[#111420]/80 border border-border/30 rounded-2xl overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#161a2b]/60 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-sm font-bold text-white">{day}</h3>
                  </div>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
                    {dayItems.length} sesi terjadwal
                  </Badge>
                </div>
                <div className="p-5">
                  {dayItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-500">
                      <Coffee className="h-7 w-7 opacity-30" />
                      <span className="text-xs">Tidak ada jadwal pada hari {day}</span>
                    </div>
                  ) : (
                    <div className="relative border-l border-border/20 pl-6 ml-2 space-y-4">
                      {dayItems.map((item) => {
                        const style = getSubjectColor(item.mapel?.nama_mapel || "");
                        const id = item.id || item.ID;
                        return (
                          <div key={id} className="relative">
                            <div className="absolute -left-[27px] top-3 w-3 h-3 rounded-full border-2 border-border/40 bg-[#090b11] flex items-center justify-center">
                              <div className="w-1 h-1 rounded-full bg-primary" />
                            </div>
                            <div className="p-4 rounded-xl bg-[#161a2b] border border-border/20 hover:border-primary/30 transition-all group flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`${style.badge} border-none text-[10px]`}>Jam ke {item.jam_ke}</Badge>
                                  <span className="text-gray-400 text-xs">{item.tahun_ajaran} · Sem {item.semester}</span>
                                </div>
                                <h4 className="text-base font-bold text-white">{item.mapel?.nama_mapel}</h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                  <span className="flex items-center gap-1.5">
                                    <School className="h-3.5 w-3.5 text-blue-400" />
                                    Kelas: <strong className="text-gray-200">{item.kelas?.nama_kelas || "—"}</strong>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <UserIcon className="h-3.5 w-3.5 text-emerald-400" />
                                    Guru: <strong className="text-gray-200">{item.guru?.nama || "—"}</strong>
                                  </span>
                                </div>
                              </div>
                              {!isKepsek && (
                                <div className="flex gap-2 shrink-0">
                                  <Button variant="ghost" size="sm" className="h-8 text-primary hover:bg-primary/10 gap-1.5 text-xs" onClick={() => handleOpenEdit(item)}>
                                    <Edit2 className="h-3 w-3" /> Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10 gap-1.5 text-xs" onClick={() => handleDelete(id)}>
                                    <Trash2 className="h-3 w-3" /> Hapus
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Detail Jadwal
            </DialogTitle>
          </DialogHeader>
          {detailItem && (() => {
            const style = getSubjectColor(detailItem.mapel?.nama_mapel || "");
            return (
              <div className="space-y-3 py-2">
                <div className={`rounded-xl border p-4 ${style.bg}`}>
                  <p className={`text-lg font-bold ${style.text}`}>{detailItem.mapel?.nama_mapel || "—"}</p>
                  <p className="text-sm text-gray-300 mt-1">{detailItem.hari} · Jam ke-{detailItem.jam_ke}</p>
                </div>
                {[
                  { label: "Guru Pengampu", value: detailItem.guru?.nama },
                  { label: "Kelas", value: detailItem.kelas?.nama_kelas },
                  { label: "Semester", value: detailItem.semester },
                  { label: "Tahun Ajaran", value: detailItem.tahun_ajaran },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-border/10">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-sm text-white font-medium">{row.value || "—"}</span>
                  </div>
                ))}
                {!isKepsek && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => { setDetailOpen(false); handleOpenEdit(detailItem); }}>
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => { setDetailOpen(false); handleDelete(detailItem.id || detailItem.ID); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111420] border-border/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editMode ? "Ubah Jadwal Mengajar" : "Tambah Jadwal Mengajar"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-gray-300 text-xs">Guru</Label>
                <Select value={formData.guru_id} onValueChange={(val) => { if (val) setFormData({ ...formData, guru_id: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                    <SelectValue placeholder="Pilih Guru">{gurus.find(g => String(g.id || g.ID) === formData.guru_id)?.nama || "Pilih Guru"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    {gurus.map(g => <SelectItem key={g.id || g.ID} value={String(g.id || g.ID)} label={g.nama}>{g.nama}</SelectItem>)}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Mata Pelajaran</Label>
                <Select value={formData.mapel_id} onValueChange={(val) => { if (val) setFormData({ ...formData, mapel_id: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                    <SelectValue placeholder="Pilih Mapel">{mapels.find(m => String(m.id || m.ID) === formData.mapel_id)?.nama_mapel || "Pilih Mapel"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    {mapels.map(m => <SelectItem key={m.id || m.ID} value={String(m.id || m.ID)} label={m.nama_mapel}>{m.nama_mapel}</SelectItem>)}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Kelas</Label>
                <Select value={formData.kelas_id} onValueChange={(val) => { if (val) setFormData({ ...formData, kelas_id: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                    <SelectValue placeholder="Pilih Kelas">{kelases.find(k => String(k.id || k.ID) === formData.kelas_id)?.nama_kelas || "Pilih Kelas"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    {kelases.map(k => <SelectItem key={k.id || k.ID} value={String(k.id || k.ID)} label={k.nama_kelas}>{k.nama_kelas}</SelectItem>)}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Hari</Label>
                <Select value={formData.hari} onValueChange={(val) => { if (val) setFormData({ ...formData, hari: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-gray-300 text-xs">Jam Pelajaran</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Mulai (jam ke-)</p>
                    <Select
                      value={formData.jamMulai}
                      onValueChange={(val) => {
                        if (!val) return;
                        const mulai = parseInt(val);
                        const selesai = parseInt(formData.jamSelesai);
                        setFormData({ ...formData, jamMulai: val, jamSelesai: selesai < mulai ? val : formData.jamSelesai });
                      }}
                    >
                      <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                        {SINGLE_JAMS.map(j => (
                          <SelectItem key={j} value={j}>
                            Jam {j} &nbsp;<span className="text-gray-500 text-[10px]">({JAM_TIME[j]})</span>
                          </SelectItem>
                        ))}
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Selesai (jam ke-)</p>
                    <Select
                      value={formData.jamSelesai}
                      onValueChange={(val) => { if (val) setFormData({ ...formData, jamSelesai: val }); }}
                    >
                      <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                        {SINGLE_JAMS.filter(j => parseInt(j) >= parseInt(formData.jamMulai)).map(j => (
                          <SelectItem key={j} value={j}>
                            Jam {j} &nbsp;<span className="text-gray-500 text-[10px]">({JAM_TIME[j]})</span>
                          </SelectItem>
                        ))}
                                </SelectGroup>
        </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Preview hasil */}
                <div className="mt-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-primary font-medium">
                    {formData.jamMulai === formData.jamSelesai
                      ? `Jam ke-${formData.jamMulai} (${JAM_TIME[formData.jamMulai]} – ${(() => { const t = JAM_TIME[formData.jamMulai]; if (!t) return ''; const [h, m] = t.split(':').map(Number); const end = new Date(0, 0, 0, h, m + 45); return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`; })()})`
                      : `Jam ke-${formData.jamMulai} s/d ${formData.jamSelesai} · ${JAM_TIME[formData.jamMulai]} – ${(() => { const t = JAM_TIME[formData.jamSelesai]; if (!t) return ''; const [h, m] = t.split(':').map(Number); const end = new Date(0, 0, 0, h, m + 45); return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`; })()} · ${parseInt(formData.jamSelesai) - parseInt(formData.jamMulai) + 1} JP`
                    }
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Semester</Label>
                <Select value={formData.semester} onValueChange={(val) => { if (val) setFormData({ ...formData, semester: val }); }}>
                  <SelectTrigger className="bg-[#161a2b] border-border/30 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111420] border-border/30 text-white">
          <SelectGroup>
                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                    <SelectItem value="Genap">Genap</SelectItem>
                            </SelectGroup>
        </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Tahun Ajaran</Label>
                <Input value={formData.tahun_ajaran} onChange={e => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                  className="bg-[#161a2b] border-border/30 text-white h-9" placeholder="2025/2026" required />
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
    </div>
  );
}
