package dto

import "time"

// Base Response Structure
type WebResponse[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data,omitempty"`
	Meta    any    `json:"meta,omitempty"`
}

// ----------------------------------------------------
// AUTH DTOS
// ----------------------------------------------------
type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         UserResponse `json:"user"`
}

type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required,min=6"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ----------------------------------------------------
// MASTER DATA DTOS
// ----------------------------------------------------
type UserCreateRequest struct {
	Username string `json:"username" validate:"required,min=4"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required"`
}

type UserUpdateRequest struct {
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role" validate:"required"`
}

type GuruCreateRequest struct {
	Username string `json:"username" validate:"required,min=4"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password"` // optional — auto-generated if empty, sent via email
	Role     string `json:"role"`     // guru, guru_bk, wali_kelas — default: guru
	NIP      string `json:"nip" validate:"required"`
	Nama     string `json:"nama" validate:"required"`
	Gelar    string `json:"gelar"`
	Phone    string `json:"phone"`
	Gender   string `json:"gender" validate:"required,oneof=L P"`
	Alamat   string `json:"alamat"`
	Status   string `json:"status" validate:"required,oneof=Aktif Non-Aktif"`
}

type GuruUpdateRequest struct {
	Email  string `json:"email" validate:"required,email"`
	Role   string `json:"role"` // guru, guru_bk, wali_kelas
	NIP    string `json:"nip" validate:"required"`
	Nama   string `json:"nama" validate:"required"`
	Gelar  string `json:"gelar"`
	Phone  string `json:"phone"`
	Gender string `json:"gender" validate:"required,oneof=L P"`
	Alamat string `json:"alamat"`
	Status string `json:"status" validate:"required,oneof=Aktif Non-Aktif"`
}

type SiswaCreateRequest struct {
	Username       string `json:"username"` // optional — fallback ke NIS
	Email          string `json:"email" validate:"omitempty,email"`
	Password       string `json:"password"` // optional, auto-generated if empty
	NISN           string `json:"nisn"`     // optional, auto-generated
	NIS            string `json:"nis"`
	Nama           string `json:"nama" validate:"required"`
	KelasID        uint   `json:"kelas_id" validate:"required"`
	JurusanID      uint   `json:"jurusan_id" validate:"required"`
	Phone          string `json:"phone"`
	Gender         string `json:"gender" validate:"required,oneof=L P"`
	Alamat         string `json:"alamat"`
	Status         string `json:"status"`
	TahunMasuk     int    `json:"tahun_masuk"`
	FotoURL        string `json:"foto_url"`
	Instagram      string `json:"instagram"`
	Youtube        string `json:"youtube"`
	NamaAyah       string `json:"nama_ayah"`
	NamaIbu        string `json:"nama_ibu"`
	PekerjaanOrtu  string `json:"pekerjaan_ortu"`
	WAOrtu         string `json:"wa_ortu"`
	PendapatanOrtu int64  `json:"pendapatan_ortu"`
}

type SiswaUpdateRequest struct {
	Email          string `json:"email" validate:"required,email"`
	NISN           string `json:"nisn" validate:"required"`
	NIS            string `json:"nis"`
	Nama           string `json:"nama" validate:"required"`
	KelasID        uint   `json:"kelas_id" validate:"required"`
	JurusanID      uint   `json:"jurusan_id" validate:"required"`
	Phone          string `json:"phone"`
	Gender         string `json:"gender" validate:"required,oneof=L P"`
	Alamat         string `json:"alamat"`
	Status         string `json:"status"`
	TahunMasuk     int    `json:"tahun_masuk"`
	FotoURL        string `json:"foto_url"`
	Instagram      string `json:"instagram"`
	Youtube        string `json:"youtube"`
	NamaAyah       string `json:"nama_ayah"`
	NamaIbu        string `json:"nama_ibu"`
	PekerjaanOrtu  string `json:"pekerjaan_ortu"`
	WAOrtu         string `json:"wa_ortu"`
	PendapatanOrtu int64  `json:"pendapatan_ortu"`
}

type KelasCreateRequest struct {
	NamaKelas   string `json:"nama_kelas" validate:"required"`
	JurusanID   uint   `json:"jurusan_id" validate:"required"`
	WaliKelasID uint   `json:"wali_kelas_id" validate:"required"`
	TahunAjaran string `json:"tahun_ajaran" validate:"required"`
}

type KelasUpdateRequest struct {
	NamaKelas   string `json:"nama_kelas" validate:"required"`
	JurusanID   uint   `json:"jurusan_id" validate:"required"`
	WaliKelasID uint   `json:"wali_kelas_id" validate:"required"`
	TahunAjaran string `json:"tahun_ajaran" validate:"required"`
}

type JurusanCreateRequest struct {
	NamaJurusan string `json:"nama_jurusan" validate:"required"`
	KodeJurusan string `json:"kode_jurusan" validate:"required"`
}

type JurusanUpdateRequest struct {
	NamaJurusan string `json:"nama_jurusan" validate:"required"`
	KodeJurusan string `json:"kode_jurusan" validate:"required"`
}

type MapelCreateRequest struct {
	NamaMapel string `json:"nama_mapel" validate:"required"`
	KodeMapel string `json:"kode_mapel" validate:"required"`
	Kelompok  string `json:"kelompok" validate:"required"`
}

type MapelUpdateRequest struct {
	NamaMapel string `json:"nama_mapel" validate:"required"`
	KodeMapel string `json:"kode_mapel" validate:"required"`
	Kelompok  string `json:"kelompok" validate:"required"`
}

type MengajarCreateRequest struct {
	GuruID      uint   `json:"guru_id" validate:"required"`
	MapelID     uint   `json:"mapel_id" validate:"required"`
	KelasID     uint   `json:"kelas_id" validate:"required"`
	TahunAjaran string `json:"tahun_ajaran" validate:"required"`
	Semester    string `json:"semester" validate:"required,oneof=Ganjil Genap"`
	JamKe       string `json:"jam_ke" validate:"required"`
	Hari        string `json:"hari" validate:"required"`
}

type MengajarUpdateRequest struct {
	GuruID      uint   `json:"guru_id" validate:"required"`
	MapelID     uint   `json:"mapel_id" validate:"required"`
	KelasID     uint   `json:"kelas_id" validate:"required"`
	TahunAjaran string `json:"tahun_ajaran" validate:"required"`
	Semester    string `json:"semester" validate:"required,oneof=Ganjil Genap"`
	JamKe       string `json:"jam_ke" validate:"required"`
	Hari        string `json:"hari" validate:"required"`
}

// ----------------------------------------------------
// JURNAL & ATTENDANCE DTOS
// ----------------------------------------------------
type JurnalCreateRequest struct {
	MengajarID  uint                `json:"mengajar_id" validate:"required"`
	Tanggal     string              `json:"tanggal" validate:"required"` // YYYY-MM-DD
	JamKe       string              `json:"jam_ke" validate:"required"`  // "1" or "1-3"
	TopikMateri string              `json:"topik_materi" validate:"required"`
	CatatanGuru string              `json:"catatan_guru"`
	Presensi    []PresensiSiswaItem `json:"presensi"`
}

type JurnalUpdateRequest struct {
	JamKe       string              `json:"jam_ke" validate:"required"`
	TopikMateri string              `json:"topik_materi" validate:"required"`
	CatatanGuru string              `json:"catatan_guru"`
	Presensi    []PresensiSiswaItem `json:"presensi"`
}

type PresensiSiswaItem struct {
	SiswaID         uint   `json:"siswa_id" validate:"required"`
	StatusKehadiran string `json:"status_kehadiran" validate:"required,oneof=H S I A"`
	Keterangan      string `json:"keterangan"`
}

type JurnalApprovalRequest struct {
	Status string `json:"status" validate:"required,oneof=approved rejected"`
}

type KehadiranGuruRequest struct {
	GuruID          uint   `json:"guru_id" validate:"required"`
	Tanggal         string `json:"tanggal" validate:"required"`
	StatusKehadiran string `json:"status_kehadiran" validate:"required,oneof=tidak_hadir sakit izin cuti"`
	Keterangan      string `json:"keterangan"`
}

type RequestJurnalMundurRequest struct {
	MengajarID    uint   `json:"mengajar_id" validate:"required"`
	TanggalJurnal string `json:"tanggal_jurnal" validate:"required"`
	Alasan        string `json:"alasan" validate:"required"`
}

type ReviewRequestJurnalMundurRequest struct {
	Status       string `json:"status" validate:"required,oneof=approved rejected"`
	AdminCatatan string `json:"admin_catatan"`
}

type ScanQRAttendanceRequest struct {
	QRCode    string  `json:"qr_code" validate:"required"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type AttendanceStatusResponse struct {
	AlreadyCheckedIn  bool       `json:"already_checked_in"`
	AlreadyCheckedOut bool       `json:"already_checked_out"`
	CheckInTime       *time.Time `json:"check_in_time,omitempty"`
	CheckOutTime      *time.Time `json:"check_out_time,omitempty"`
	Status            string     `json:"status"`
}

// ----------------------------------------------------
// SETTINGS DTOS
// ----------------------------------------------------
type HariLiburRequest struct {
	Tanggal    string `json:"tanggal" validate:"required"` // YYYY-MM-DD
	NamaLibur  string `json:"nama_libur" validate:"required"`
	Jenis      string `json:"jenis" validate:"required"` // libur_nasional, libur_sekolah, hari_khusus
	KelasID    *uint  `json:"kelas_id"`                  // null = semua kelas
	Keterangan string `json:"keterangan"`
}

type JamKhususRequest struct {
	Tanggal    string `json:"tanggal" validate:"required"` // YYYY-MM-DD
	MaxJam     int    `json:"max_jam" validate:"required"` // Batas jam mengajar
	Alasan     string `json:"alasan" validate:"required"`
	KelasID    *uint  `json:"kelas_id"` // null = semua kelas
	Keterangan string `json:"keterangan"`
}

type PengaturanJamRequest struct {
	JamMasukMulai    string `json:"jam_masuk_mulai" validate:"required"`
	JamMasukSelesai  string `json:"jam_masuk_selesai" validate:"required"`
	JamPulangMulai   string `json:"jam_pulang_mulai" validate:"required"`
	JamPulangSelesai string `json:"jam_pulang_selesai" validate:"required"`
}

// ----------------------------------------------------
// BK (BIMBINGAN KONSELING) DTOS
// ----------------------------------------------------
type BKKonselingRequest struct {
	SiswaID      uint   `json:"siswa_id" validate:"required"`
	Tanggal      string `json:"tanggal" validate:"required"` // YYYY-MM-DD
	Masalah      string `json:"masalah" validate:"required"`
	Solusi       string `json:"solusi"`
	TindakLanjut string `json:"tindak_lanjut"`
	Status       string `json:"status" validate:"required,oneof=Proses Selesai"`
	Tipe         string `json:"tipe" validate:"required,oneof=Pribadi Sosial Belajar Karir"`
}

type PelanggaranRequest struct {
	SiswaID         uint   `json:"siswa_id" validate:"required"`
	Tanggal         string `json:"tanggal" validate:"required"` // YYYY-MM-DD
	NamaPelanggaran string `json:"nama_pelanggaran" validate:"required"`
	Poin            int    `json:"poin" validate:"required,min=1"`
	Keterangan      string `json:"keterangan"`
}

type PrestasiRequest struct {
	SiswaID      uint   `json:"siswa_id" validate:"required"`
	Tanggal      string `json:"tanggal" validate:"required"` // YYYY-MM-DD
	NamaPrestasi string `json:"nama_prestasi" validate:"required"`
	Kategori     string `json:"kategori" validate:"required,oneof=Akademik Non-Akademik"`
	Tingkat      string `json:"tingkat" validate:"required"`
	Keterangan   string `json:"keterangan"`
}

type TesPsikologiRequest struct {
	SiswaID     uint   `json:"siswa_id" validate:"required"`
	Tanggal     string `json:"tanggal" validate:"required"` // YYYY-MM-DD
	JenisTes    string `json:"jenis_tes" validate:"required"`
	Hasil       string `json:"hasil" validate:"required"`
	Rekomendasi string `json:"rekomendasi"`
	FileUrl     string `json:"file_url"`
}

type ProyekRequest struct {
	NamaProyek     string `json:"nama_proyek" validate:"required"`
	Deskripsi      string `json:"deskripsi"`
	TanggalMulai   string `json:"tanggal_mulai" validate:"required"`   // YYYY-MM-DD
	TanggalSelesai string `json:"tanggal_selesai" validate:"required"` // YYYY-MM-DD
	KelasID        uint   `json:"kelas_id" validate:"required"`
	Status         string `json:"status" validate:"required,oneof=Aktif Selesai"`
}

// ----------------------------------------------------
// PERIZINAN & GRADING DTOS
// ----------------------------------------------------
type PerizinanRequest struct {
	SiswaID        uint   `json:"siswa_id"`
	TanggalMulai   string `json:"tanggal_mulai" validate:"required"`   // YYYY-MM-DD
	TanggalSelesai string `json:"tanggal_selesai" validate:"required"` // YYYY-MM-DD
	JenisIzin      string `json:"jenis_izin" validate:"required"`
	TipeIzin       string `json:"tipe_izin"` // harian, mapel
	WaliKelasID    *uint  `json:"wali_kelas_id"`
	MapelID        *uint  `json:"mapel_id"`
	Keterangan     string `json:"keterangan" validate:"required"`
	BuktiUrl       string `json:"bukti_url"`
}

type PerizinanApprovalRequest struct {
	Status string `json:"status" validate:"required,oneof=Approved Rejected"`
}

type IzinGuruRequest struct {
	TanggalMulai   string `json:"tanggal_mulai" validate:"required"`   // YYYY-MM-DD
	TanggalSelesai string `json:"tanggal_selesai" validate:"required"` // YYYY-MM-DD
	JenisIzin      string `json:"jenis_izin"`
	Keterangan     string `json:"keterangan" validate:"required"`
	BuktiUrl       string `json:"bukti_url"`
}

type IzinGuruApprovalRequest struct {
	Status string `json:"status" validate:"required,oneof=Approved Rejected"`
}

type NilaiRequest struct {
	SiswaID    uint    `json:"siswa_id" validate:"required"`
	MapelID    uint    `json:"mapel_id" validate:"required"`
	JenisNilai string  `json:"jenis_nilai" validate:"required,oneof=Tugas UH UTS UAS"`
	Nilai      float64 `json:"nilai" validate:"required,min=0,max=100"`
	Keterangan string  `json:"keterangan"`
}

// ----------------------------------------------------
// REKAP NILAI DTOs (structured grading)
// ----------------------------------------------------
type TugasItemRequest struct {
	Ke         int     `json:"ke" validate:"required,min=1"`
	Nilai      float64 `json:"nilai" validate:"required,min=0,max=100"`
	Keterangan string  `json:"keterangan"`
}

type UpsertRekapNilaiRequest struct {
	MengajarID  uint               `json:"mengajar_id" validate:"required"`
	SiswaID     uint               `json:"siswa_id" validate:"required"`
	Semester    string             `json:"semester" validate:"required,oneof=Ganjil Genap"`
	TahunAjaran string             `json:"tahun_ajaran" validate:"required"`
	NilaiMid    *float64           `json:"nilai_mid" validate:"omitempty,min=0,max=100"`
	NilaiUAS    *float64           `json:"nilai_uas" validate:"omitempty,min=0,max=100"`
	BobotTugas  *float64           `json:"bobot_tugas"`
	BobotMid    *float64           `json:"bobot_mid"`
	BobotUAS    *float64           `json:"bobot_uas"`
	Tugas       []TugasItemRequest `json:"tugas"`
}

// BatchKomponenRequest — input one grading component for multiple students at once
type BatchNilaiItem struct {
	SiswaID    uint    `json:"siswa_id"`
	Nilai      float64 `json:"nilai"`
	Keterangan string  `json:"keterangan"`
}

type BatchKomponenRequest struct {
	MengajarID  uint             `json:"mengajar_id" validate:"required"`
	Semester    string           `json:"semester" validate:"required,oneof=Ganjil Genap"`
	TahunAjaran string           `json:"tahun_ajaran" validate:"required"`
	Komponen    string           `json:"komponen" validate:"required,oneof=tugas mid uas"`
	KeTugas     int              `json:"ke_tugas"` // only used when komponen=tugas
	BobotTugas  float64          `json:"bobot_tugas"`
	BobotMid    float64          `json:"bobot_mid"`
	BobotUAS    float64          `json:"bobot_uas"`
	Data        []BatchNilaiItem `json:"data" validate:"required"`
}

// KelasNilaiView — class-level grade roster returned by GET /nilai/rekap/kelas
type StudentNilaiRow struct {
	SiswaID    uint       `json:"siswa_id"`
	NamaSiswa  string     `json:"nama_siswa"`
	NIS        string     `json:"nis"`
	RekapID    *uint      `json:"rekap_id"`
	Tugas      []*float64 `json:"tugas"` // index = ke-1, nil = not filled yet
	Mid        *float64   `json:"mid"`
	UAS        *float64   `json:"uas"`
	NilaiAkhir *float64   `json:"nilai_akhir"`
}

type KelasNilaiView struct {
	MengajarID  uint              `json:"mengajar_id"`
	NamaMapel   string            `json:"nama_mapel"`
	NamaKelas   string            `json:"nama_kelas"`
	Semester    string            `json:"semester"`
	TahunAjaran string            `json:"tahun_ajaran"`
	JumlahTugas int               `json:"jumlah_tugas"`
	BobotTugas  float64           `json:"bobot_tugas"`
	BobotMid    float64           `json:"bobot_mid"`
	BobotUAS    float64           `json:"bobot_uas"`
	Siswa       []StudentNilaiRow `json:"siswa"`
}

// ─── REKAP ABSENSI DTOs ───────────────────────────────────────────────────────

// RekapAbsensiSiswaItem — aggregated attendance per student
type RekapAbsensiSiswaItem struct {
	SiswaID    uint    `json:"siswa_id"`
	NamaSiswa  string  `json:"nama_siswa"`
	NIS        string  `json:"nis"`
	NamaKelas  string  `json:"nama_kelas"`
	TotalHadir int     `json:"total_hadir"`
	TotalSakit int     `json:"total_sakit"`
	TotalIzin  int     `json:"total_izin"`
	TotalAlpha int     `json:"total_alpha"`
	TotalHari  int     `json:"total_hari"`
	Persentase float64 `json:"persentase"`
}

// RekapAbsensiGuruItem — combined absensi + jurnal summary per teacher
type RekapAbsensiGuruItem struct {
	GuruID           uint    `json:"guru_id"`
	NamaGuru         string  `json:"nama_guru"`
	NIP              string  `json:"nip"`
	TotalHadir       int     `json:"total_hadir"`
	TotalTerlambat   int     `json:"total_terlambat"`
	TotalIzin        int     `json:"total_izin"`
	TotalSakit       int     `json:"total_sakit"`
	TotalAlpa        int     `json:"total_alpa"`
	TotalJurnal      int     `json:"total_jurnal"`
	Persentase       float64 `json:"persentase"`
	HadirTanpaJurnal int     `json:"hadir_tanpa_jurnal"` // days present but no jurnal
}

type ParentAnakRequest struct {
	OrangTuaID uint   `json:"orang_tua_id" validate:"required"`
	SiswaID    uint   `json:"siswa_id" validate:"required"`
	Hubungan   string `json:"hubungan" validate:"required"` // Ayah, Ibu, Wali
}

// ----------------------------------------------------
// ORANG TUA DTOS
// ----------------------------------------------------
type OrangTuaCreateRequest struct {
	Username  string `json:"username" validate:"required,min=4"`
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=6"`
	Nama      string `json:"nama" validate:"required"`
	Phone     string `json:"phone"`
	Pekerjaan string `json:"pekerjaan"`
	Alamat    string `json:"alamat"`
}

type OrangTuaUpdateRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Nama      string `json:"nama" validate:"required"`
	Phone     string `json:"phone"`
	Pekerjaan string `json:"pekerjaan"`
	Alamat    string `json:"alamat"`
}

// ----------------------------------------------------
// PROFILE & PESAN DTOS
// ----------------------------------------------------
type UpdateProfileRequest struct {
	NamaLengkap string `json:"nama_lengkap"`
	Email       string `json:"email" validate:"omitempty,email"`
	Phone       string `json:"phone"`
	FotoURL     string `json:"foto_url"`
	// Guru / Wali Kelas / Guru BK / Counselor fields
	Gelar  string `json:"gelar"`
	Gender string `json:"gender"`
	Alamat string `json:"alamat"`
	// Siswa fields
	Instagram string `json:"instagram"`
	Youtube   string `json:"youtube"`
	NamaAyah  string `json:"nama_ayah"`
	NamaIbu   string `json:"nama_ibu"`
	WAOrtu    string `json:"wa_ortu"`
	// OrangTua fields
	NamaOrtu  string `json:"nama_ortu"`
	Pekerjaan string `json:"pekerjaan"`
}

type FullProfileResponse struct {
	ID          uint   `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	NamaLengkap string `json:"nama_lengkap"`
	Phone       string `json:"phone"`
	FotoURL     string `json:"foto_url"`
	// Guru fields
	GuruID *uint  `json:"guru_id,omitempty"`
	NIP    string `json:"nip,omitempty"`
	Gelar  string `json:"gelar,omitempty"`
	Gender string `json:"gender,omitempty"`
	Alamat string `json:"alamat,omitempty"`
	// Siswa fields
	SiswaID     *uint  `json:"siswa_id,omitempty"`
	NISN        string `json:"nisn,omitempty"`
	NIS         string `json:"nis,omitempty"`
	KelasID     *uint  `json:"kelas_id,omitempty"`
	NamaKelas   string `json:"nama_kelas,omitempty"`
	JurusanID   *uint  `json:"jurusan_id,omitempty"`
	NamaJurusan string `json:"nama_jurusan,omitempty"`
	Instagram   string `json:"instagram,omitempty"`
	Youtube     string `json:"youtube,omitempty"`
	NamaAyah    string `json:"nama_ayah,omitempty"`
	NamaIbu     string `json:"nama_ibu,omitempty"`
	WAOrtu      string `json:"wa_ortu,omitempty"`
	// OrangTua fields
	OrtuID    *uint  `json:"ortu_id,omitempty"`
	NamaOrtu  string `json:"nama_ortu,omitempty"`
	Pekerjaan string `json:"pekerjaan,omitempty"`
}

type KirimPesanRequest struct {
	KeUserID uint   `json:"ke_user_id" validate:"required"`
	Judul    string `json:"judul" validate:"required"`
	Isi      string `json:"isi" validate:"required"`
}
