import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  preload: true,
});

export const metadata: Metadata = {
  title: "JAMS | Sistem Informasi Manajemen Sekolah",
  description: "Portal Jurnal Mengajar, Absensi QR, BK Konseling, Perizinan, dan Pelaporan Sekolah Terintegrasi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <body
        className={`${inter.variable} h-full antialiased`}
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
