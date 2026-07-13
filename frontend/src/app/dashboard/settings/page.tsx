'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';
import SchoolCalendar from '@/components/SchoolCalendar';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Sistem</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola konfigurasi sekolah — hari libur, jam khusus, dan kalender akademik.</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hari Libur */}
        <Card className="bg-card border-border p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <Calendar className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Hari Libur</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Kelola hari libur, hari khusus, dan tanggal penting di kalender sekolah
          </p>
          <Link href="/dashboard/settings/holidays">
            <Button className="w-full">Kelola Hari Libur</Button>
          </Link>
        </Card>

        {/* Jam Khusus */}
        <Card className="bg-card border-border p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Jam Khusus</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Atur jam khusus untuk mata pelajaran kosong dan jadwal istimewa
          </p>
          <Link href="/dashboard/settings/special-hours">
            <Button className="w-full">Kelola Jam Khusus</Button>
          </Link>
        </Card>
      </div>

      {/* Kalender Akademik */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Kalender Akademik</h2>
          <span className="text-xs text-muted-foreground">— tampilan hari libur &amp; jam khusus yang sudah diinput</span>
        </div>
        <SchoolCalendar />
      </div>
    </div>
  );
}
