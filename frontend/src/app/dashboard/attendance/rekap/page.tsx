'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { api } from '@/lib/api';

export default function RekapPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState({ hadir: 0, sakit: 0, izin: 0, alpa: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'siswa' && user.role !== 'guru' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    fetchAttendance();
  }, [user, router, month]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const endpoint = user?.role === 'guru' 
        ? `/reports/teacher-attendance?guru_id=${user?.id}&start_date=${month}-01&end_date=${month}-31`
        : `/reports/attendance?siswa_id=${user?.id}&start_date=${month}-01&end_date=${month}-31`;

      const res = await api.get(endpoint);
      const data = res.data?.data || [];
      setAttendance(data);

      // Calculate summary
      const counts = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
      data.forEach((item: any) => {
        const status = item.status?.toLowerCase() || '';
        if (status === 'hadir' || status === 'terlambat') counts.hadir++;
        else if (status === 'sakit') counts.sakit++;
        else if (status === 'izin') counts.izin++;
        else if (status === 'alpa') counts.alpa++;
      });
      setSummary(counts);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'hadir' || s === 'terlambat') return 'bg-green-100 text-green-800';
    if (s === 'sakit') return 'bg-blue-100 text-blue-800';
    if (s === 'izin') return 'bg-purple-100 text-purple-800';
    if (s === 'alpa') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold">Rekapitulasi Kehadiran</h1>
        <p className="text-gray-500 mt-2">Ringkasan absensi bulanan</p>
      </div>

      {/* Month Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pilih Bulan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.hadir}</div>
            <p className="text-xs text-gray-500 mt-1">Hari</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sakit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.sakit}</div>
            <p className="text-xs text-gray-500 mt-1">Hari</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Izin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summary.izin}</div>
            <p className="text-xs text-gray-500 mt-1">Hari</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alpa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.alpa}</div>
            <p className="text-xs text-gray-500 mt-1">Hari</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Kehadiran - {month}</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tidak ada data kehadiran</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {new Date(item.tanggal || item.waktu_scan).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        {item.jam_masuk
                          ? new Date(item.jam_masuk).toLocaleTimeString('id-ID')
                          : item.waktu_scan
                          ? new Date(item.waktu_scan).toLocaleTimeString('id-ID')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.keterangan || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Persentase Kehadiran:</span>
              <span className="font-semibold">
                {attendance.length > 0
                  ? ((summary.hadir / attendance.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Hari Kerja:</span>
              <span className="font-semibold">{attendance.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: attendance.length > 0 
                    ? `${(summary.hadir / attendance.length) * 100}%`
                    : '0%',
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
