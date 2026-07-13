# 📚 Jurnal & Attendance Management System (JAMS)

[![Go Version](https://img.shields.io/badge/Go-1.21%2B-blue?style=for-the-badge&logo=go)](https://golang.org)
[![Next.js Version](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)](https://docker.com)

**Jurnal & Attendance Management System (JAMS)** adalah platform sistem informasi manajemen sekolah terintegrasi berbasis web. Aplikasi ini dirancang untuk mendigitalisasi pencatatan jurnal mengajar guru, absensi kehadiran siswa & guru berbasis QR Code/GPS, perizinan, bimbingan konseling (BK), hingga pengolahan laporan akademik secara real-time.

---

## 🏗️ Arsitektur Sistem & Aliran Data

Berikut adalah visualisasi bagaimana pengguna berinteraksi dengan frontend Next.js, berkomunikasi dengan Backend API Go Echo (terlindungi oleh JWT & RBAC), serta berinteraksi dengan database MySQL:

```mermaid
graph TD
    User([Pengguna: Admin/Guru/Siswa/Ortu]) -->|Akses UI via Browser| Frontend[Next.js 15 Client]
    Frontend -->|HTTP Requests / REST API| Backend[Go Echo REST API]
    Backend -->|JWT & Role Check| Middleware[JWT & RBAC Middleware]
    Middleware -->|Query / Mutate| DB[(MySQL Database)]
    Backend -->|SMTP/Email Service| Mailer[Brevo SMTP / Mailer]
    Backend -->|Simpan Berkas| Uploads[Local uploads/ directory]
```

---

## 🛠️ Teknologi & Stack Modern

| Layer | Teknologi / Library | Keterangan |
|---|---|---|
| **Backend** | Go (Golang) + Echo Framework | REST API berkinerja tinggi, bersih, dan modular |
| **Frontend** | Next.js 15 + TypeScript | Client-side dashboard interaktif & cepat |
| **Database** | MySQL 8.0 | Penyimpanan relasional terstruktur |
| **ORM** | GORM | Pemetaan database ke struct Go secara efisien |
| **Styling** | Tailwind CSS + Shadcn/UI | Antarmuka premium dengan desain modern & responsif |
| **Auth** | JWT (Access & Refresh Token) | Keamanan endpoint dan autentikasi stateless |
| **Notification**| Brevo SMTP | Pengiriman notifikasi / reset password melalui email |
| **State Management** | Zustand & React Query | Pengelolaan state client dan caching data server |

---

## 📁 Struktur Folder Proyek

```
manajemenjurnal-app/
├── backend/              # Go/Echo REST API (Port 8080)
│   ├── cmd/api/          # Entrypoint aplikasi (main.go)
│   ├── config/           # Konfigurasi aplikasi & database
│   ├── internal/
│   │   ├── domain/       # Struct Entity & Interface Repository
│   │   ├── dto/          # Data Transfer Object (Request/Response)
│   │   ├── handler/      # HTTP Router Controller / Handler
│   │   ├── middleware/   # JWT Authentication & RBAC Check
│   │   ├── repository/   # Query Database GORM
│   │   └── service/      # Business Logic aplikasi
│   ├── pkg/
│   │   └── database/     # Inisialisasi DB & Seeder
│   └── routes/           # Routing API Grouping
└── frontend/             # Next.js Application (Port 3000)
    ├── public/           # File statik & aset
    └── src/
        ├── app/          # App Router Next.js (Dashboard & Auth)
        ├── components/   # Komponen UI Reusable (Shadcn/UI)
        ├── lib/          # Konfigurasi Axios API Client & Helper
        ├── providers/    # Context & Query Providers
        └── stores/       # Global State Management (Zustand)
```

---

## ✨ Fitur Utama & Fungsionalitas

### 1. 📖 Jurnal Mengajar & Presensi
- **Pencatatan Pertemuan**: Guru mencatat jurnal mengajar harian lengkap dengan bahasan materi.
- **Presensi Kelas**: Input status kehadiran siswa (Hadir, Sakit, Izin, Alpa) per pertemuan mapel.
- **Request Mundur Jurnal**: Pengajuan izin pengisian jurnal yang terlewat pada hari sebelumnya dengan approval otomatis/manual oleh Admin.

### 2. 📷 Absensi QR & GPS (Siswa & Guru)
- **Kartu QR Dinamis**: QR Code unik untuk siswa dan guru (`JURNAL_QR:siswa:{id}` / `JURNAL_QR:guru:{id}`).
- **Scan Gerbang Sekolah**: Petugas/Admin memindai QR Code siswa di pintu gerbang untuk mencatat jam masuk/pulang.
- **Self Check-in Guru**: Guru dapat melakukan absensi mandiri melalui aplikasi dengan pembatasan berbasis lokasi GPS (Geofencing) dan deteksi jam terlambat.

### 3. 📋 Pengajuan Perizinan (Siswa & Guru)
- **Izin Siswa**: Orang tua atau siswa mengajukan izin tidak hadir disertai bukti dokumen/foto.
- **Izin Mengajar Guru**: Guru mengajukan perizinan tidak mengajar dengan disposisi otomatis ke wali kelas atau kepsek.
- **Status Notifikasi**: Notifikasi persetujuan izin secara real-time.

### 4. 🧠 Bimbingan Konseling (BK) & Dashboard Siswa
- **Sesi Konseling**: Guru BK dapat mengelola catatan rahasia sesi konseling siswa.
- **Poin Pelanggaran & Prestasi**: Input poin pelanggaran tata tertib dan riwayat prestasi akademik/non-akademik siswa.
- **Tes Psikologi**: Pengunggahan berkas/hasil tes psikologi siswa untuk referensi konseling.

### 5. 📊 Dashboard Analitik & Laporan
- **Visualisasi Grafik**: Statistik kehadiran, jumlah pelanggaran, dan jurnal terisi per kelas.
- **Ekspor Laporan**: Unduh ringkasan jurnal mengajar, absensi bulanan, dan log aktivitas sistem.

---

## 🚀 Panduan Instalasi & Cara Menjalankan

### Prasyarat System
Sebelum memulai, pastikan perangkat Anda telah terinstall:
- **Go** (versi 1.21 atau lebih tinggi)
- **Node.js** (versi 18 atau lebih tinggi)
- **MySQL** (versi 8.0 atau lebih tinggi)

---

### Langkah 1: Clone Repository
```bash
git clone https://github.com/Aksan14/jurnal-management-app.git
cd jurnal-management-app
```

### Langkah 2: Setup Database & Backend
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Buat file `.env` dari template:
   ```bash
   cp .env.example .env
   ```
3. Sesuaikan konfigurasi database MySQL & SMTP Brevo pada file `.env` yang baru dibuat:
   ```env
   PORT=8080
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=jurnal_db
   
   JWT_SECRET=gunakan_string_acak_panjang_disini
   JWT_REFRESH_SECRET=gunakan_string_acak_panjang_kedua_disini
   ```
4. Download dependencies dan jalankan backend:
   ```bash
   go mod tidy
   go run cmd/api/main.go
   ```
   > **Note**: Database `jurnal_db` akan dibuat secara otomatis dan di-seed dengan data awal (akun default) jika tabel kosong.

---

### Langkah 3: Setup Frontend
1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Salin template environment variable:
   ```bash
   cp .env.local.example .env.local  # atau edit langsung berkas .env.local yang ada
   ```
3. Pastikan `.env.local` merujuk pada port backend yang benar:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080/api
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
   ```
4. Install package dan jalankan development server:
   ```bash
   npm install
   npm run dev
   ```
5. Buka `http://localhost:3000` pada browser Anda.

---

### Langkah 4: Menjalankan Menggunakan Docker
Jika Anda ingin menjalankan aplikasi secara cepat dalam container:
```bash
# Jalankan backend Docker
cd backend
docker build -t jurnal-backend .
docker run -d -p 8080:8080 --env-file .env jurnal-backend
```

---

## 🔑 Akun Default (Seed Data)

Akun default berikut menggunakan password: **`Password123!`**

| Username | Role | Deskripsi Akses |
|---|---|---|
| `admin` | `admin` | Pengelolaan data master, jam kerja, absensi scan, reset pass. |

> [!WARNING]
> Sangat disarankan untuk segera mengubah password default akun `admin` di atas pada halaman profil setelah Anda pertama kali login demi alasan keamanan data.

---

## 🔒 Panduan Deploy & Keamanan Production

1. **Gunakan String JWT Unik**: Pastikan `JWT_SECRET` dan `JWT_REFRESH_SECRET` diubah dengan karakter acak yang panjang di environment server.
2. **Aktifkan HTTPS**: Gunakan SSL melalui Nginx/Caddy Reverse Proxy untuk enkripsi data token JWT selama transmisi.
3. **Database Security**: Selalu sembunyikan port database (`3306`) dari akses publik dan izinkan koneksi hanya dari host lokal backend.
4. **Valid SMTP**: Masukkan SMTP credentials valid untuk memastikan notifikasi email & reset sandi berjalan tanpa kendala.

---

## 📝 Lisensi
Proyek ini dilisensikan di bawah lisensi internal institusi sekolah. Seluruh hak cipta dilindungi undang-undang © 2026.
