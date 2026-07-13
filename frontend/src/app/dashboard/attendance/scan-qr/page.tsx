'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function QRScanPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user || (user.role !== 'siswa' && user.role !== 'guru' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    loadAttendanceHistory();
  }, [user, router]);

  const loadAttendanceHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/attendance/history', {
        params: {
          siswa_id: user?.id,
          start_date: today,
          end_date: today,
          limit: 5,
        },
      });
      const history = res.data?.data || [];
      if (history.length > 0) {
        setScanHistory(history);
        setLastScan(history[0]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const getLocation = async () => {
    return new Promise<{ lat: number; long: number }>((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              long: position.coords.longitude,
            });
          },
          () => resolve({ lat: 0, long: 0 }),
          { timeout: 5000 }
        );
      } else {
        resolve({ lat: 0, long: 0 });
      }
    });
  };

  const handleScan = async () => {
    if (!qrInput.trim()) {
      toast.error('Silakan masukkan QR code');
      return;
    }

    setScanning(true);
    try {
      const location = await getLocation();
      const res = await api.post('/attendance/scan', {
        qr_code: qrInput,
        latitude: location.lat,
        longitude: location.long,
      });

      const scanResult = res.data?.data;
      setLastScan(scanResult);
      setScanHistory([scanResult, ...scanHistory.slice(0, 4)]);
      toast.success(`Scan berhasil - Status: ${scanResult.status}`);
      setQrInput('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Scan gagal');
      setQrInput('');
    } finally {
      setScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !scanning) {
      handleScan();
    }
  };

  if (!user || (user.role !== 'siswa' && user.role !== 'guru')) return null;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold">Scan QR Code</h1>
        <p className="text-gray-500 mt-2">Lakukan absensi dengan scan QR code</p>
      </div>

      {/* QR Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Input QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>QR Code</Label>
            <Input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Paste QR code content atau scan dengan camera"
              autoFocus
            />
          </div>
          <Button
            onClick={handleScan}
            disabled={scanning || !qrInput.trim()}
            className="w-full"
          >
            {scanning ? 'Memproses...' : 'Proses Scan'}
          </Button>
        </CardContent>
      </Card>

      {/* Last Scan Result */}
      {lastScan && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <CheckCircle className="w-5 h-5" />
              Hasil Scan Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Status:</span>
                <Badge className={lastScan.status === 'Hadir' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {lastScan.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Waktu:</span>
                <span className="font-mono text-sm">{new Date(lastScan.waktu_scan).toLocaleTimeString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Keterangan:</span>
                <span className="text-sm">{lastScan.keterangan}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Scan (5 Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanHistory.map((scan, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {new Date(scan.waktu_scan).toLocaleTimeString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-500">{scan.keterangan}</p>
                  </div>
                  <Badge
                    className={
                      scan.status === 'Hadir'
                        ? 'bg-green-100 text-green-800'
                        : scan.status === 'Terlambat'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {scan.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <AlertCircle className="w-5 h-5" />
            Informasi
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-900 space-y-2">
          <p>• Setiap scan akan mencatat waktu dan lokasi Anda</p>
          <p>• Status "Terlambat" muncul jika Anda scan setelah jam masuk selesai</p>
          <p>• Untuk guru: scan dilakukan di pintu masuk dan pulang</p>
          <p>• Untuk siswa: scan dilakukan saat gerbang sekolah dan di kelas</p>
        </CardContent>
      </Card>
    </div>
  );
}
