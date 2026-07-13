'use client';

import React, { useState, useEffect, Suspense } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth";

import JurusanSection from "./components/JurusanSection";
import KelasSection from "./components/KelasSection";
import MapelSection from "./components/MapelSection";
import GuruSection from "./components/GuruSection";
import SiswaSection from "./components/SiswaSection";
import MengajarSection from "./components/MengajarSection";

const TAB_LABELS: Record<string, string> = {
  jurusan: "Jurusan",
  kelas: "Kelas",
  mapel: "Mata Pelajaran",
  guru: "Guru",
  siswa: "Siswa",
  mengajar: "Jadwal Mengajar",
};

function MasterDataContent() {
  const { user } = useAuthStore();
  const isKepsek = user?.role === "kepsek";
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "jurusan";
  const [search, setSearch] = useState("");

  useEffect(() => { setSearch(""); }, [activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Manajemen Data Master</h1>
        <p className="text-gray-400 text-sm">Kelola seluruh data inti administrasi sekolah.</p>
      </div>

      <Card className="bg-[#111420] border-border/30 text-white">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Daftar Data Master</CardTitle>
            <CardDescription className="text-gray-400">
              Kelola data master untuk kategori {TAB_LABELS[activeTab] || activeTab}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#161a2b] border-border/30 text-white placeholder-gray-500 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "jurusan" && <JurusanSection search={search} isKepsek={isKepsek} />}
          {activeTab === "kelas" && <KelasSection search={search} isKepsek={isKepsek} />}
          {activeTab === "mapel" && <MapelSection search={search} isKepsek={isKepsek} />}
          {activeTab === "guru" && <GuruSection search={search} isKepsek={isKepsek} />}
          {activeTab === "siswa" && <SiswaSection search={search} isKepsek={isKepsek} />}
          {activeTab === "mengajar" && <MengajarSection search={search} isKepsek={isKepsek} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <MasterDataContent />
    </Suspense>
  );
}
