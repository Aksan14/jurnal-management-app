"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  FileSpreadsheet, Download, Upload, CheckCircle, XCircle,
  AlertTriangle, Info, Loader2, RefreshCw, FileUp, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ─── Types ─────────────────────────────────────────────────────────────────
interface ImportResult {
  row: number;
  data: string;
  status: "success" | "error" | "skip";
  message: string;
}

interface MasterData {
  guruList: any[];
  kelasList: any[];
  jurusanList: any[];
  mapelList: any[];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const TEMPLATES = {
  guru: {
    label: "Guru",
    filename: "template_guru.xlsx",
    headers: ["nip", "nama", "gelar", "phone", "gender", "alamat", "status", "username", "email"],
    example: ["19800101200001001", "Budi Santoso", "S.Pd", "08123456789", "L", "Jl. Merdeka No. 1", "Aktif", "budi.santoso", "budi@sekolah.sch.id"],
    notes: [
      "nip: NIP guru, wajib dan unik",
      "nama: nama lengkap guru",
      "gelar: gelar akademik (boleh kosong)",
      "phone: nomor HP",
      "gender: L (Laki-laki) atau P (Perempuan)",
      "alamat: alamat tempat tinggal",
      "status: Aktif atau Non-Aktif",
      "username: min 4 karakter, tanpa spasi",
      "email: format email valid — password auto-dikirim ke email ini",
    ],
  },
  siswa: {
    label: "Siswa",
    filename: "template_siswa.xlsx",
    headers: [
      "nama", "nisn", "nis", "username", "email",
      "kelas_nama", "jurusan_kode",
      "gender", "phone", "alamat", "tahun_masuk", "status",
      "nama_ayah", "nama_ibu", "pekerjaan_ortu", "wa_ortu",
    ],
    example: [
      "Andi Pratama", "0012345678", "23001", "andi.pratama", "andi@siswa.sch.id",
      "XI TKJ 1", "TKJ",
      "L", "08234567890", "Jl. Pahlawan No. 5", "2023", "Aktif",
      "Bapak Samsul", "Ibu Siti", "PNS", "08129876543",
    ],
    notes: [
      "nama: wajib diisi",
      "nisn/nis: boleh kosong (auto-generate)",
      "username: boleh kosong (fallback ke NIS)",
      "email: format valid — password auto-dikirim ke email ini",
      "kelas_nama: PERSIS sama dengan nama kelas di sistem (lihat referensi)",
      "jurusan_kode: PERSIS sama dengan kode jurusan di sistem (lihat referensi)",
      "gender: L atau P",
      "tahun_masuk: angka tahun (contoh: 2023)",
      "status: Aktif / Non-Aktif / Alumni (default: Aktif)",
      "nama_ayah, nama_ibu, pekerjaan_ortu, wa_ortu: boleh kosong",
    ],
  },
  kelas: {
    label: "Kelas",
    filename: "template_kelas.xlsx",
    headers: ["nama_kelas", "jurusan_kode", "wali_kelas_nip", "tahun_ajaran"],
    example: ["XI TKJ 1", "TKJ", "19800101200001001", "2025/2026"],
    notes: [
      "nama_kelas: nama lengkap kelas (contoh: XI TKJ 1)",
      "jurusan_kode: kode jurusan yang sudah ada di sistem (lihat referensi)",
      "wali_kelas_nip: NIP guru yang sudah ada di sistem",
      "tahun_ajaran: format YYYY/YYYY (contoh: 2025/2026)",
    ],
  },
  mapel: {
    label: "Mata Pelajaran",
    filename: "template_mapel.xlsx",
    headers: ["nama_mapel", "kode_mapel", "kelompok"],
    example: ["Matematika", "MTK", "Umum"],
    notes: [
      "nama_mapel: nama lengkap mata pelajaran",
      "kode_mapel: kode unik mata pelajaran",
      "kelompok: Umum / Kejuruan / Adaptif / dll",
    ],
  },
  mengajar: {
    label: "Jadwal Mengajar",
    filename: "template_jadwal_mengajar.xlsx",
    headers: ["guru_nip", "mapel_kode", "kelas_nama", "tahun_ajaran", "semester", "jam_ke", "hari"],
    example: ["19800101200001001", "MTK", "XI TKJ 1", "2025/2026", "Ganjil", "1-2", "Senin"],
    notes: [
      "guru_nip: NIP guru yang sudah ada di sistem (lihat referensi)",
      "mapel_kode: kode mapel yang sudah ada (lihat referensi)",
      "kelas_nama: nama kelas yang sudah ada (lihat referensi)",
      "tahun_ajaran: format YYYY/YYYY",
      "semester: Ganjil atau Genap",
      "jam_ke: misal 1, 3-4, 1-2",
      "hari: Senin / Selasa / Rabu / Kamis / Jumat / Sabtu",
    ],
  },
};

type TabKey = keyof typeof TEMPLATES;

async function downloadTemplate(key: TabKey, masterData: MasterData) {
  const XLSX = await import("xlsx");
  const tmpl = TEMPLATES[key];
  const wb = XLSX.utils.book_new();

  // ── Sheet Data (input) ────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet([tmpl.headers, tmpl.example]);
  // Style header row bold (comment row styling — basic col widths)
  ws["!cols"] = tmpl.headers.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  // ── Sheet Petunjuk ────────────────────────────────────────────────────────
  const petunjukRows: string[][] = [
    ["PETUNJUK PENGISIAN — " + tmpl.label.toUpperCase()],
    [],
    ["PENTING: Isi data di sheet 'Data'. Baris ke-1 adalah HEADER (jangan diubah). Hapus baris contoh sebelum menyimpan."],
    [],
    ["KETENTUAN KOLOM:"],
    ...tmpl.notes.map((n, i) => [`  ${i + 1}. ${n}`]),
    [],
    ["KOLOM WAJIB vs OPSIONAL:"],
    ...tmpl.headers.map((h, i) => [`  Kolom ${i + 1}: ${h}`]),
    [],
    ["NILAI YANG DITERIMA:"],
    ["  gender      → L  atau  P"],
    ["  status guru → Aktif  atau  Non-Aktif"],
    ["  status siswa→ Aktif / Non-Aktif / Alumni"],
    ["  semester    → Ganjil  atau  Genap"],
    ["  hari        → Senin / Selasa / Rabu / Kamis / Jumat / Sabtu"],
  ];
  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukRows);
  wsPetunjuk["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk");

  // ── Reference Sheets (embedded lookup data) ───────────────────────────────
  const { guruList, kelasList, jurusanList, mapelList } = masterData;

  if (key === "siswa" || key === "kelas" || key === "mengajar") {
    // Jurusan reference
    if (jurusanList.length > 0) {
      const jurusanRows: string[][] = [
        ["⚠ JANGAN UBAH SHEET INI — Hanya sebagai referensi"],
        [],
        ["KODE_JURUSAN (salin persis ke kolom jurusan_kode)", "NAMA JURUSAN"],
        ...jurusanList.map((j: any) => [j.kode_jurusan, j.nama_jurusan]),
      ];
      const wsJurusan = XLSX.utils.aoa_to_sheet(jurusanRows);
      wsJurusan["!cols"] = [{ wch: 30 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsJurusan, "Ref_Jurusan");
    }
  }

  if (key === "siswa" || key === "mengajar") {
    // Kelas reference
    if (kelasList.length > 0) {
      const kelasRows: string[][] = [
        ["⚠ JANGAN UBAH SHEET INI — Hanya sebagai referensi"],
        [],
        ["NAMA_KELAS (salin persis ke kolom kelas_nama)", "JURUSAN", "TAHUN AJARAN"],
        ...kelasList.map((k: any) => [
          k.nama_kelas,
          k.jurusan?.kode_jurusan || "",
          k.tahun_ajaran || "",
        ]),
      ];
      const wsKelas = XLSX.utils.aoa_to_sheet(kelasRows);
      wsKelas["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsKelas, "Ref_Kelas");
    }
  }

  if (key === "kelas" || key === "mengajar") {
    // Guru reference
    if (guruList.length > 0) {
      const guruRows: string[][] = [
        ["⚠ JANGAN UBAH SHEET INI — Hanya sebagai referensi"],
        [],
        ["NIP (salin persis ke kolom guru_nip / wali_kelas_nip)", "NAMA GURU", "STATUS"],
        ...guruList.map((g: any) => [g.nip, g.nama, g.status || "Aktif"]),
      ];
      const wsGuru = XLSX.utils.aoa_to_sheet(guruRows);
      wsGuru["!cols"] = [{ wch: 24 }, { wch: 36 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsGuru, "Ref_Guru");
    }
  }

  if (key === "mengajar") {
    // Mapel reference
    if (mapelList.length > 0) {
      const mapelRows: string[][] = [
        ["⚠ JANGAN UBAH SHEET INI — Hanya sebagai referensi"],
        [],
        ["KODE_MAPEL (salin persis ke kolom mapel_kode)", "NAMA MAPEL", "KELOMPOK"],
        ...mapelList.map((m: any) => [m.kode_mapel, m.nama_mapel, m.kelompok || ""]),
      ];
      const wsMapel = XLSX.utils.aoa_to_sheet(mapelRows);
      wsMapel["!cols"] = [{ wch: 20 }, { wch: 36 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsMapel, "Ref_Mapel");
    }
  }

  XLSX.writeFile(wb, tmpl.filename);
  const refCount = wb.SheetNames.length - 2; // minus Data + Petunjuk
  toast.success(`Template ${tmpl.label} diunduh${refCount > 0 ? ` (${refCount} sheet referensi disertakan)` : ""}`);
}

function ReferencePanel({ tabKey, masterData }: { tabKey: TabKey; masterData: MasterData }) {
  const { kelasList, jurusanList, guruList, mapelList } = masterData;

  if (tabKey === "siswa" || tabKey === "kelas") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-amber-200 dark:border-amber-800/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Daftar Jurusan (isi di kolom jurusan_kode)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {jurusanList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Belum ada data jurusan</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {jurusanList.map((j: any) => (
                  <Badge key={j.id} variant="outline" className="text-[11px] border-amber-300 text-amber-800 dark:text-amber-300 font-mono">
                    {j.kode_jurusan} — {j.nama_jurusan}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              Daftar Kelas (isi di kolom kelas_nama)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {kelasList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Belum ada data kelas</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {kelasList.map((k: any) => (
                  <Badge key={k.id} variant="outline" className="text-[11px] border-blue-300 text-blue-800 dark:text-blue-300 font-mono">
                    {k.nama_kelas}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tabKey === "mengajar") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-green-200 dark:border-green-800/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              Guru (guru_nip)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {guruList.length === 0
                ? <p className="text-xs italic text-muted-foreground">Belum ada data</p>
                : guruList.map((g: any) => (
                  <p key={g.id} className="text-[11px] font-mono text-muted-foreground">
                    <span className="text-foreground font-medium">{g.nip}</span> — {g.nama}
                  </p>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
              📖 Mapel (mapel_kode)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {mapelList.length === 0
                ? <p className="text-xs italic text-muted-foreground">Belum ada data</p>
                : mapelList.map((m: any) => (
                  <Badge key={m.id} variant="outline" className="text-[11px] border-purple-300 text-purple-800 dark:text-purple-300 font-mono">
                    {m.kode_mapel}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800/40">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              Kelas (kelas_nama)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {kelasList.length === 0
                ? <p className="text-xs italic text-muted-foreground">Belum ada data</p>
                : kelasList.map((k: any) => (
                  <Badge key={k.id} variant="outline" className="text-[11px] border-blue-300 text-blue-800 dark:text-blue-300 font-mono">
                    {k.nama_kelas}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("guru");
  const [masterData, setMasterData] = useState<MasterData>({ guruList: [], kelasList: [], jurusanList: [], mapelList: [] });
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const fetchMasterData = async () => {
    const [g, k, j, m] = await Promise.all([
      api.get("/master/guru?limit=1000").catch(() => ({ data: { data: [] } })),
      api.get("/master/kelas?limit=1000").catch(() => ({ data: { data: [] } })),
      api.get("/master/jurusan?limit=200").catch(() => ({ data: { data: [] } })),
      api.get("/master/mapel?limit=500").catch(() => ({ data: { data: [] } })),
    ]);
    setMasterData({
      guruList: g.data.data || [],
      kelasList: k.data.data || [],
      jurusanList: j.data.data || [],
      mapelList: m.data.data || [],
    });
  };

  useEffect(() => { fetchMasterData(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); setFileName(f.name); }
    else { setSelectedFile(null); setFileName(""); }
    setResults([]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx?$/i)) {
      toast.error("Format file tidak didukung. Gunakan .xlsx atau .xls");
      return;
    }
    setSelectedFile(f);
    setFileName(f.name);
    setResults([]);
  };

  const processImport = useCallback(async () => {
    const file = selectedFile;
    if (!file) { toast.error("Pilih file Excel terlebih dahulu"); return; }
    setImporting(true);
    setResults([]);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (rawRows.length < 2) { toast.error("File kosong atau tidak ada data"); setImporting(false); return; }

      const headers: string[] = (rawRows[0] as string[]).map((h) => String(h).trim().toLowerCase());
      const dataRows = rawRows.slice(1).filter((r) => r.some((v) => String(v).trim() !== ""));
      const getVal = (row: any[], key: string) => {
        const idx = headers.indexOf(key);
        return idx >= 0 ? String(row[idx] ?? "").trim() : "";
      };

      const { guruList, kelasList, jurusanList, mapelList } = masterData;
      const findGuru = (nip: string) => guruList.find((g) => String(g.nip) === nip);
      const findKelas = (nama: string) => kelasList.find((k) => k.nama_kelas?.toLowerCase() === nama.toLowerCase());
      const findJurusan = (kode: string) => jurusanList.find((j) => j.kode_jurusan?.toLowerCase() === kode.toLowerCase());
      const findMapel = (kode: string) => mapelList.find((m) => m.kode_mapel?.toLowerCase() === kode.toLowerCase());

      const newResults: ImportResult[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;
        try {
          if (activeTab === "guru") {
            const nip = getVal(row, "nip");
            const nama = getVal(row, "nama");
            const username = getVal(row, "username");
            const email = getVal(row, "email");
            if (!nip || !nama || !username || !email) {
              newResults.push({ row: rowNum, data: nama || `Baris ${rowNum}`, status: "error", message: "nip, nama, username, email wajib diisi" });
              continue;
            }
            if (!isValidEmail(email)) {
              newResults.push({ row: rowNum, data: nama, status: "error", message: `Email "${email}" tidak valid` });
              continue;
            }
            await api.post("/master/guru", {
              nip, nama,
              gelar: getVal(row, "gelar"),
              phone: getVal(row, "phone"),
              gender: getVal(row, "gender") || "L",
              alamat: getVal(row, "alamat"),
              status: getVal(row, "status") || "Aktif",
              username, email,
            });
            newResults.push({ row: rowNum, data: nama, status: "success", message: `Berhasil ditambahkan — kredensial dikirim ke ${email}` });

          } else if (activeTab === "siswa") {
            const nama = getVal(row, "nama");
            const email = getVal(row, "email");
            const kelasNama = getVal(row, "kelas_nama");
            const jurusanKode = getVal(row, "jurusan_kode");
            if (!nama) { newResults.push({ row: rowNum, data: `Baris ${rowNum}`, status: "error", message: "nama wajib diisi" }); continue; }
            if (email && !isValidEmail(email)) { newResults.push({ row: rowNum, data: nama, status: "error", message: `Email "${email}" tidak valid` }); continue; }
            const kelas = findKelas(kelasNama);
            if (!kelas) { newResults.push({ row: rowNum, data: nama, status: "error", message: `Kelas "${kelasNama}" tidak ditemukan` }); continue; }
            const jurusan = findJurusan(jurusanKode);
            if (!jurusan) { newResults.push({ row: rowNum, data: nama, status: "error", message: `Jurusan "${jurusanKode}" tidak ditemukan` }); continue; }
            await api.post("/master/siswa", {
              nama, email,
              nisn: getVal(row, "nisn"),
              nis: getVal(row, "nis"),
              username: getVal(row, "username"),
              kelas_id: kelas.id ?? kelas.ID,
              jurusan_id: jurusan.id ?? jurusan.ID,
              gender: getVal(row, "gender") || "L",
              phone: getVal(row, "phone"),
              alamat: getVal(row, "alamat"),
              tahun_masuk: parseInt(getVal(row, "tahun_masuk")) || new Date().getFullYear(),
              status: getVal(row, "status") || "Aktif",
              nama_ayah: getVal(row, "nama_ayah"),
              nama_ibu: getVal(row, "nama_ibu"),
              pekerjaan_ortu: getVal(row, "pekerjaan_ortu"),
              wa_ortu: getVal(row, "wa_ortu"),
            });
            newResults.push({
              row: rowNum, data: nama, status: "success",
              message: email ? `Berhasil — kredensial dikirim ke ${email}` : "Berhasil (email tidak ada, password tidak dikirim)",
            });

          } else if (activeTab === "kelas") {
            const namaKelas = getVal(row, "nama_kelas");
            if (!namaKelas) { newResults.push({ row: rowNum, data: `Baris ${rowNum}`, status: "error", message: "nama_kelas wajib diisi" }); continue; }
            const jurusan = findJurusan(getVal(row, "jurusan_kode"));
            if (!jurusan) { newResults.push({ row: rowNum, data: namaKelas, status: "error", message: `Jurusan "${getVal(row, "jurusan_kode")}" tidak ditemukan` }); continue; }
            const wali = findGuru(getVal(row, "wali_kelas_nip"));
            if (!wali) { newResults.push({ row: rowNum, data: namaKelas, status: "error", message: `Wali kelas NIP "${getVal(row, "wali_kelas_nip")}" tidak ditemukan` }); continue; }
            await api.post("/master/kelas", {
              nama_kelas: namaKelas,
              jurusan_id: jurusan.id ?? jurusan.ID,
              wali_kelas_id: wali.id ?? wali.ID,
              tahun_ajaran: getVal(row, "tahun_ajaran"),
            });
            newResults.push({ row: rowNum, data: namaKelas, status: "success", message: "Berhasil ditambahkan" });

          } else if (activeTab === "mapel") {
            const nama = getVal(row, "nama_mapel");
            const kode = getVal(row, "kode_mapel");
            const kelompok = getVal(row, "kelompok");
            if (!nama || !kode || !kelompok) { newResults.push({ row: rowNum, data: nama || `Baris ${rowNum}`, status: "error", message: "nama_mapel, kode_mapel, kelompok wajib diisi" }); continue; }
            await api.post("/master/mapel", { nama_mapel: nama, kode_mapel: kode, kelompok });
            newResults.push({ row: rowNum, data: nama, status: "success", message: "Berhasil ditambahkan" });

          } else if (activeTab === "mengajar") {
            const guruNip = getVal(row, "guru_nip");
            const mapelKode = getVal(row, "mapel_kode");
            const kelasNama = getVal(row, "kelas_nama");
            const label = `${guruNip}/${kelasNama}`;
            const guru = findGuru(guruNip);
            if (!guru) { newResults.push({ row: rowNum, data: label, status: "error", message: `Guru NIP "${guruNip}" tidak ditemukan` }); continue; }
            const mapel = findMapel(mapelKode);
            if (!mapel) { newResults.push({ row: rowNum, data: label, status: "error", message: `Mapel "${mapelKode}" tidak ditemukan` }); continue; }
            const kelas = findKelas(kelasNama);
            if (!kelas) { newResults.push({ row: rowNum, data: label, status: "error", message: `Kelas "${kelasNama}" tidak ditemukan` }); continue; }
            await api.post("/master/mengajar", {
              guru_id: guru.id ?? guru.ID,
              mapel_id: mapel.id ?? mapel.ID,
              kelas_id: kelas.id ?? kelas.ID,
              tahun_ajaran: getVal(row, "tahun_ajaran"),
              semester: getVal(row, "semester"),
              jam_ke: getVal(row, "jam_ke"),
              hari: getVal(row, "hari"),
            });
            newResults.push({ row: rowNum, data: `${guru.nama} / ${kelas.nama_kelas}`, status: "success", message: "Berhasil ditambahkan" });
          }
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Gagal";
          newResults.push({ row: rowNum, data: `Baris ${rowNum}`, status: "error", message: msg });
        }
      }

      setResults(newResults);
      const success = newResults.filter((r) => r.status === "success").length;
      const errors = newResults.filter((r) => r.status === "error").length;
      if (success > 0) { toast.success(`${success} data berhasil diimport${errors > 0 ? `, ${errors} gagal` : ""}`); await fetchMasterData(); }
      else toast.error(`Semua ${errors} data gagal diimport`);
    } catch { toast.error("Gagal membaca file Excel"); }
    finally { setImporting(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, masterData, selectedFile]);

  const resetFile = () => {
    setSelectedFile(null);
    setFileName("");
    setResults([]);
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const hasEmailNotif = activeTab === "guru" || activeTab === "siswa";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileUp className="h-6 w-6 text-primary" />
          Import Data dari Excel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Import data massal: Guru, Siswa, Kelas, Mata Pelajaran, dan Jadwal Mengajar</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Cara Import Data:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
            <li>Pilih jenis data di tab bawah, klik <strong>Unduh Template</strong></li>
            <li>Isi template sesuai petunjuk (sheet &ldquo;Petunjuk&rdquo; dalam file Excel)</li>
            <li>Upload file lalu klik <strong>Mulai Import</strong></li>
          </ol>
        </div>
      </div>

      {hasEmailNotif && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 flex gap-2 items-start">
          <Mail className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Notifikasi Email Otomatis:</strong> Saat import {activeTab === "guru" ? "guru" : "siswa"}, sistem otomatis membuat akun login dan mengirim <strong>username &amp; password</strong> ke email masing-masing. Pastikan kolom <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">email</code> diisi dengan alamat email yang valid.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabKey); resetFile(); }}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="guru">Guru</TabsTrigger>
          <TabsTrigger value="siswa">Siswa</TabsTrigger>
          <TabsTrigger value="kelas">Kelas</TabsTrigger>
          <TabsTrigger value="mapel">Mata Pelajaran</TabsTrigger>
          <TabsTrigger value="mengajar">Jadwal Mengajar</TabsTrigger>
        </TabsList>

        {(Object.keys(TEMPLATES) as TabKey[]).map((key) => {
          const tmpl = TEMPLATES[key];
          return (
            <TabsContent key={key} value={key} className="space-y-4 mt-4">
              <ReferencePanel tabKey={key} masterData={masterData} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                      Unduh Template Excel
                    </CardTitle>
                    <CardDescription>Download, isi sesuai petunjuk, lalu upload di langkah 2</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full gap-2 h-11 border-primary/40 text-primary hover:bg-primary/5" onClick={() => downloadTemplate(key, masterData)}>
                      <Download className="h-4 w-4" />Unduh Template {tmpl.label}
                    </Button>
                    <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kolom template:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tmpl.headers.map((h) => <Badge key={h} variant="secondary" className="text-[10px] font-mono">{h}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ketentuan:</p>
                      <ul className="space-y-0.5">
                        {tmpl.notes.map((note, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-primary shrink-0">·</span>{note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                      Upload &amp; Import
                    </CardTitle>
                    <CardDescription>Upload file Excel yang sudah diisi, lalu mulai import</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer select-none ${
                        isDragging
                          ? "border-primary bg-primary/10 scale-[1.01]"
                          : fileName
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                    >
                      <input
                        key={key}
                        ref={(el) => { if (key === activeTab && el) (fileRef as React.MutableRefObject<HTMLInputElement>).current = el; }}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      {isDragging ? (
                        <div className="space-y-1 pointer-events-none">
                          <Upload className="h-10 w-10 text-primary mx-auto animate-bounce" />
                          <p className="text-sm font-semibold text-primary">Lepaskan untuk upload file</p>
                        </div>
                      ) : fileName ? (
                        <div className="space-y-1">
                          <FileSpreadsheet className="h-8 w-8 text-primary mx-auto" />
                          <p className="text-sm font-medium text-primary">{fileName}</p>
                          <p className="text-xs text-muted-foreground">Klik untuk ganti file</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm font-medium">Drag &amp; drop atau klik pilih file</p>
                          <p className="text-xs text-muted-foreground">Format: .xlsx atau .xls</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2 h-11" disabled={!fileName || importing} onClick={processImport}>
                        {importing ? <><Loader2 className="h-4 w-4 animate-spin" />Mengimport...</> : <><FileUp className="h-4 w-4" />Mulai Import</>}
                      </Button>
                      {fileName && (
                        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={resetFile} title="Reset">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {results.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">Hasil Import</CardTitle>
                      <div className="flex gap-2">
                        {successCount > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle className="h-3 w-3 mr-1" />{successCount} Berhasil
                          </Badge>
                        )}
                        {errorCount > 0 && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300">
                            <XCircle className="h-3 w-3 mr-1" />{errorCount} Gagal
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {results.map((r, i) => (
                        <div key={i} className={`flex items-start gap-3 px-3 py-2 rounded-lg text-sm ${r.status === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40" : r.status === "error" ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40" : "bg-muted/40 border border-border"}`}>
                          {r.status === "success" ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : r.status === "error" ? <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <span className="text-muted-foreground text-xs">Baris {r.row}:</span>
                            <span className="font-medium ml-1.5">{r.data}</span>
                            <p className={`text-xs mt-0.5 ${r.status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{r.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
