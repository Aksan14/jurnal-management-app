'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onScan: (value: string) => void;
  active: boolean;
  onToggle: () => void;
}

export default function QrCameraScanner({ onScan, active, onToggle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const startScanner = async () => {
    if (!containerRef.current) return;
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-admin');
      scannerRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError('Kamera tidak ditemukan.');
        return;
      }

      // prefer back camera
      const cam = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];

      await scanner.start(
        cam.id,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          onScan(decodedText);
          // brief flash then continue scanning
        },
        () => {}
      );
    } catch (e: any) {
      setError(e?.message ?? 'Gagal mengakses kamera.');
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={active ? 'destructive' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="gap-2"
      >
        {active ? (
          <><CameraOff className="h-4 w-4" /> Matikan Kamera</>
        ) : (
          <><Camera className="h-4 w-4" /> Aktifkan Kamera Scan</>
        )}
      </Button>

      {active && (
        <div className="rounded-xl overflow-hidden border border-border/40 bg-black relative">
          <div id="qr-reader-admin" ref={containerRef} className="w-full" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 text-sm text-center p-4">
              {error}
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-primary rounded-xl opacity-60" />
          </div>
        </div>
      )}
    </div>
  );
}
