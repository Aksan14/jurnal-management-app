"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Sun, Calendar } from "lucide-react";

interface HariLibur {
  id: number;
  tanggal: string;
  nama_libur: string;
  keterangan: string;
}

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function SchoolCalendar() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [holidays, setHolidays] = useState<HariLibur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [holRes] = await Promise.all([
          api.get("/attendance/holidays"),
        ]);
        setHolidays(holRes.data.data || []);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Map holidays to date strings "YYYY-MM-DD"
  const holidayMap = new Map<string, string>();
  for (const h of holidays) {
    const d = new Date(h.tanggal);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    holidayMap.set(key, h.nama_libur || h.keterangan);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Holidays in current view
  const thisMonthHolidays = holidays.filter(h => {
    const d = new Date(h.tanggal);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  return (
    <div className="bg-[#111420] border border-border/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground text-xs">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
            className="px-2 py-1 text-xs rounded-lg hover:bg-primary/10 text-primary font-medium transition-colors"
          >
            Hari Ini
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        {/* Calendar Grid */}
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[10px] font-semibold py-0.5 ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-orange-400" : "text-muted-foreground"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;

              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              const holidayNote = holidayMap.get(dateKey);
              const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
              const isSunday = dayOfWeek === 0;
              const isSaturday = dayOfWeek === 6;
              const isWeekend = isSunday || isSaturday;

              return (
                <div
                  key={idx}
                  title={holidayNote || undefined}
                  className={`relative flex flex-col items-center justify-center rounded-md aspect-square text-[11px] font-medium transition-all cursor-default select-none
                    ${isToday
                      ? "bg-primary text-white shadow-md shadow-primary/30 font-bold"
                      : holidayNote
                      ? "bg-red-500/15 text-red-400 border border-red-500/25"
                      : isWeekend
                      ? "text-orange-400/70"
                      : "text-foreground hover:bg-white/5"
                    }
                  `}
                >
                  {day}
                  {holidayNote && !isToday && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                  )}
                  {isToday && holidayNote && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel: holidays + jam */}
        <div className="lg:w-44 space-y-2.5 lg:border-l lg:border-border/20 lg:pl-3">
          {/* Hari Libur bulan ini */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sun className="h-3 w-3 text-red-400" /> Hari Libur Bulan Ini
            </p>
            {loading ? (
              <div className="space-y-1.5">
                {[1, 2].map(i => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
              </div>
            ) : thisMonthHolidays.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Tidak ada hari libur</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {thisMonthHolidays.map(h => {
                  const d = new Date(h.tanggal);
                  return (
                    <div key={h.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="text-red-400 font-bold text-xs shrink-0 w-6 text-center">{d.getDate()}</span>
                      <span className="text-xs text-foreground leading-tight">{h.nama_libur || h.keterangan}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
