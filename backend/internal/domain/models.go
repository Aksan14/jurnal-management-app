package domain

import (
	"time"

	"gorm.io/gorm"
)

// User represents tbl_users
type User struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Username    string         `gorm:"size:100;unique;not null;index" json:"username"`
	Email       string         `gorm:"size:100;unique;not null;index" json:"email"`
	Password    string         `gorm:"size:255;not null" json:"-"`
	Role        string         `gorm:"size:50;not null;index" json:"role"` // super_admin, admin, guru, guru_bk, counselor, wali_kelas, kepsek, siswa, orang_tua
	NamaLengkap string         `gorm:"size:150" json:"nama_lengkap"`
	Phone       string         `gorm:"size:20" json:"phone"`
	FotoURL     string         `gorm:"size:255" json:"foto_url"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string { return "tbl_users" }

// Jurusan represents tbl_jurusan
type Jurusan struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	NamaJurusan string         `gorm:"size:100;not null" json:"nama_jurusan"`
	KodeJurusan string         `gorm:"size:20;unique;not null" json:"kode_jurusan"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Jurusan) TableName() string { return "tbl_jurusan" }

// Guru represents tbl_guru
type Guru struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"unique;not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"user,omitempty"`
	NIP       string         `gorm:"size:50;unique;not null;index" json:"nip"`
	Nama      string         `gorm:"size:100;not null" json:"nama"`
	Gelar     string         `gorm:"size:50" json:"gelar"`
	Phone     string         `gorm:"size:20" json:"phone"`
	Gender    string         `gorm:"size:10" json:"gender"` // L (Laki-laki), P (Perempuan)
	Alamat    string         `gorm:"type:text" json:"alamat"`
	Status    string         `gorm:"size:20;default:'Aktif'" json:"status"` // Aktif, Non-Aktif
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Guru) TableName() string { return "tbl_guru" }

// Siswa represents tbl_siswa
type Siswa struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"unique;not null;index" json:"user_id"`
	User           User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"user,omitempty"`
	NISN           string         `gorm:"size:20;unique;not null;index" json:"nisn"`
	NIS            string         `gorm:"size:20;unique;not null;index" json:"nis"`
	Nama           string         `gorm:"size:100;not null" json:"nama"`
	KelasID        uint           `gorm:"not null;index" json:"kelas_id"`
	Kelas          *Kelas         `gorm:"foreignKey:KelasID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"kelas,omitempty"`
	JurusanID      uint           `gorm:"not null;index" json:"jurusan_id"`
	Jurusan        Jurusan        `gorm:"foreignKey:JurusanID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"jurusan,omitempty"`
	Phone          string         `gorm:"size:20" json:"phone"`
	Gender         string         `gorm:"size:10" json:"gender"` // L, P
	Alamat         string         `gorm:"type:text" json:"alamat"`
	Status         string         `gorm:"size:20;default:'Aktif'" json:"status"` // Aktif, Lulus, Pindah, DropOut
	TahunMasuk     int            `gorm:"default:0" json:"tahun_masuk"`
	FotoURL        string         `gorm:"size:255" json:"foto_url"`
	Instagram      string         `gorm:"size:100" json:"instagram"`
	Youtube        string         `gorm:"size:255" json:"youtube"`
	NamaAyah       string         `gorm:"size:100" json:"nama_ayah"`
	NamaIbu        string         `gorm:"size:100" json:"nama_ibu"`
	PekerjaanOrtu  string         `gorm:"size:100" json:"pekerjaan_ortu"`
	WAOrtu         string         `gorm:"size:20" json:"wa_ortu"`
	PendapatanOrtu int64          `gorm:"default:0" json:"pendapatan_ortu"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Siswa) TableName() string { return "tbl_siswa" }

// Kelas represents tbl_kelas
type Kelas struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	NamaKelas   string         `gorm:"size:50;not null" json:"nama_kelas"`
	JurusanID   uint           `gorm:"not null;index" json:"jurusan_id"`
	Jurusan     Jurusan        `gorm:"foreignKey:JurusanID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"jurusan,omitempty"`
	WaliKelasID uint           `gorm:"not null;index" json:"wali_kelas_id"`
	WaliKelas   *Guru          `gorm:"foreignKey:WaliKelasID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"wali_kelas,omitempty"`
	TahunAjaran string         `gorm:"size:20;not null" json:"tahun_ajaran"` // e.g. 2025/2026
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Kelas) TableName() string { return "tbl_kelas" }

// Mapel represents tbl_mapel
type Mapel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	NamaMapel string         `gorm:"size:100;not null" json:"nama_mapel"`
	KodeMapel string         `gorm:"size:20;unique;not null" json:"kode_mapel"`
	Kelompok  string         `gorm:"size:50" json:"kelompok"` // Nasional, Kewilayahan, Kejuruan, dll.
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Mapel) TableName() string { return "tbl_mapel" }

// Mengajar represents tbl_mengajar
type Mengajar struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	GuruID      uint           `gorm:"not null;index" json:"guru_id"`
	Guru        Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	MapelID     uint           `gorm:"not null;index" json:"mapel_id"`
	Mapel       Mapel          `gorm:"foreignKey:MapelID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"mapel,omitempty"`
	KelasID     uint           `gorm:"not null;index" json:"kelas_id"`
	Kelas       Kelas          `gorm:"foreignKey:KelasID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"kelas,omitempty"`
	TahunAjaran string         `gorm:"size:20;not null" json:"tahun_ajaran"`
	Semester    string         `gorm:"size:10;not null" json:"semester"` // Ganjil, Genap
	JamKe       string         `gorm:"size:50;not null" json:"jam_ke"`   // e.g. "1-2", "3-4"
	Hari        string         `gorm:"size:20;not null" json:"hari"`     // Senin, Selasa, etc.
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Mengajar) TableName() string { return "tbl_mengajar" }

// Jurnal represents tbl_jurnal
type Jurnal struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	MengajarID  uint           `gorm:"not null;index" json:"mengajar_id"`
	Mengajar    Mengajar       `gorm:"foreignKey:MengajarID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"mengajar,omitempty"`
	Tanggal     time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	JamKe       string         `gorm:"size:20;not null" json:"jam_ke"` // format: "1" atau "1-3"
	TopikMateri string         `gorm:"type:text;not null" json:"topik_materi"`
	CatatanGuru string         `gorm:"type:text" json:"catatan_guru"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Jurnal) TableName() string { return "tbl_jurnal" }

// KehadiranGuru represents tbl_kehadiran_guru — guru yang tidak hadir
type KehadiranGuru struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	GuruID          uint           `gorm:"not null;index" json:"guru_id"`
	Guru            Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	Tanggal         time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	StatusKehadiran string         `gorm:"size:20;not null" json:"status_kehadiran"` // tidak_hadir, sakit, izin, cuti
	Keterangan      string         `gorm:"type:text" json:"keterangan"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (KehadiranGuru) TableName() string { return "tbl_kehadiran_guru" }

// RequestJurnalMundur represents tbl_request_jurnal_mundur
type RequestJurnalMundur struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	GuruID        uint           `gorm:"not null;index" json:"guru_id"`
	Guru          Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	MengajarID    uint           `gorm:"not null;index" json:"mengajar_id"`
	Mengajar      Mengajar       `gorm:"foreignKey:MengajarID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"mengajar,omitempty"`
	TanggalJurnal time.Time      `gorm:"type:date;not null" json:"tanggal_jurnal"`
	Alasan        string         `gorm:"type:text;not null" json:"alasan"`
	Status        string         `gorm:"size:20;default:'pending';index" json:"status"` // pending, approved, rejected
	AdminCatatan  string         `gorm:"type:text" json:"admin_catatan"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (RequestJurnalMundur) TableName() string { return "tbl_request_jurnal_mundur" }

// Absensi represents tbl_presensi_siswa (Student attendance per journal session)
type Absensi struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	JurnalID        *uint          `gorm:"index" json:"jurnal_id"`
	Jurnal          *Jurnal        `gorm:"foreignKey:JurnalID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"jurnal,omitempty"`
	SiswaID         uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa           Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	StatusKehadiran string         `gorm:"size:5;not null;index" json:"status_kehadiran"` // H, S, I, A
	Keterangan      string         `gorm:"type:text" json:"keterangan"`
	WaktuScan       *time.Time     `gorm:"index" json:"waktu_scan"`
	TipeAbsen       string         `gorm:"size:10;default:'masuk'" json:"tipe_absen"` // masuk, pulang
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Absensi) TableName() string { return "tbl_presensi_siswa" }

// AbsensiGuru represents tbl_absensi_guru
type AbsensiGuru struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	GuruID     uint           `gorm:"not null;index" json:"guru_id"`
	Guru       Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	Tanggal    time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	JamMasuk   *time.Time     `json:"jam_masuk"`
	JamPulang  *time.Time     `json:"jam_pulang"`
	Status     string         `gorm:"size:20;not null;index" json:"status"` // Hadir, Terlambat, Izin, Sakit, Alpa
	Keterangan string         `gorm:"type:text" json:"keterangan"`
	Latitude   float64        `json:"latitude"`
	Longitude  float64        `json:"longitude"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AbsensiGuru) TableName() string { return "tbl_absensi_guru" }

// HariLibur represents tbl_hari_libur
type HariLibur struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	Tanggal    time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	NamaLibur  string         `gorm:"size:150;not null" json:"nama_libur"`
	Jenis      string         `gorm:"size:50;default:'libur_nasional'" json:"jenis"` // libur_nasional, libur_sekolah, hari_khusus
	KelasID    *uint          `gorm:"index" json:"kelas_id"`                         // null = semua kelas
	Kelas      *Kelas         `gorm:"foreignKey:KelasID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"kelas,omitempty"`
	Keterangan string         `gorm:"size:500" json:"keterangan"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (HariLibur) TableName() string { return "tbl_hari_libur" }

// JamKhusus represents tbl_jam_khusus
type JamKhusus struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	Tanggal    time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	MaxJam     int            `gorm:"not null;default:0" json:"max_jam"` // Batas jam mengajar hari ini
	Alasan     string         `gorm:"size:255;not null" json:"alasan"`
	KelasID    *uint          `gorm:"index" json:"kelas_id"` // null = semua kelas
	Kelas      *Kelas         `gorm:"foreignKey:KelasID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"kelas,omitempty"`
	Keterangan string         `gorm:"size:500" json:"keterangan"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (JamKhusus) TableName() string { return "tbl_jam_khusus" }

// PengaturanJam represents tbl_pengaturan_jam
type PengaturanJam struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Tipe             string         `gorm:"size:20;unique;not null;index" json:"tipe"` // Guru, Siswa
	JamMasukMulai    string         `gorm:"size:10;not null" json:"jam_masuk_mulai"`
	JamMasukSelesai  string         `gorm:"size:10;not null" json:"jam_masuk_selesai"`
	JamPulangMulai   string         `gorm:"size:10;not null" json:"jam_pulang_mulai"`
	JamPulangSelesai string         `gorm:"size:10;not null" json:"jam_pulang_selesai"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (PengaturanJam) TableName() string { return "tbl_pengaturan_jam" }

// BKKonseling represents tbl_bk_konseling
type BKKonseling struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	SiswaID      uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa        Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	GuruID       uint           `gorm:"not null;index" json:"guru_id"` // Counselor or BK Teacher
	Guru         Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	Tanggal      time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	Masalah      string         `gorm:"type:text;not null" json:"masalah"`
	Solusi       string         `gorm:"type:text" json:"solusi"`
	TindakLanjut string         `gorm:"type:text" json:"tindak_lanjut"`
	Status       string         `gorm:"size:20;default:'Proses';index" json:"status"` // Selesai, Proses
	Tipe         string         `gorm:"size:50;not null" json:"tipe"`                 // Pribadi, Sosial, Belajar, Karir
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (BKKonseling) TableName() string { return "tbl_bk_konseling" }

// Pelanggaran represents tbl_pelanggaran
type Pelanggaran struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	SiswaID         uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa           Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	Tanggal         time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	NamaPelanggaran string         `gorm:"size:255;not null" json:"nama_pelanggaran"`
	Poin            int            `gorm:"not null" json:"poin"`
	Keterangan      string         `gorm:"type:text" json:"keterangan"`
	DilaporkanOleh  uint           `gorm:"not null;index" json:"dilaporkan_oleh"`
	Reporter        User           `gorm:"foreignKey:DilaporkanOleh;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"reporter,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Pelanggaran) TableName() string { return "tbl_pelanggaran" }

// Prestasi represents tbl_prestasi
type Prestasi struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	SiswaID      uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa        Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	Tanggal      time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	NamaPrestasi string         `gorm:"size:255;not null" json:"nama_prestasi"`
	Kategori     string         `gorm:"size:50;not null" json:"kategori"` // Akademik, Non-Akademik
	Tingkat      string         `gorm:"size:50;not null" json:"tingkat"`  // Sekolah, Kecamatan, Kabupaten, Provinsi, Nasional, Internasional
	Keterangan   string         `gorm:"type:text" json:"keterangan"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Prestasi) TableName() string { return "tbl_prestasi" }

// TesPsikologi represents tbl_tes_psikologi
type TesPsikologi struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	SiswaID     uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa       Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	Tanggal     time.Time      `gorm:"type:date;not null;index" json:"tanggal"`
	JenisTes    string         `gorm:"size:100;not null" json:"jenis_tes"`
	Hasil       string         `gorm:"type:text;not null" json:"hasil"`
	Rekomendasi string         `gorm:"type:text" json:"rekomendasi"`
	FileUrl     string         `gorm:"size:255" json:"file_url"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (TesPsikologi) TableName() string { return "tbl_tes_psikologi" }

// Proyek represents tbl_proyek
type Proyek struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	NamaProyek     string         `gorm:"size:150;not null" json:"nama_proyek"`
	Deskripsi      string         `gorm:"type:text" json:"deskripsi"`
	TanggalMulai   time.Time      `gorm:"type:date;not null" json:"tanggal_mulai"`
	TanggalSelesai time.Time      `gorm:"type:date;not null" json:"tanggal_selesai"`
	KelasID        uint           `gorm:"not null;index" json:"kelas_id"`
	Kelas          Kelas          `gorm:"foreignKey:KelasID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"kelas,omitempty"`
	Status         string         `gorm:"size:20;default:'Aktif'" json:"status"` // Aktif, Selesai
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Proyek) TableName() string { return "tbl_proyek" }

// Perizinan represents tbl_perizinan (Siswa permissions/leaves)
type Perizinan struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	SiswaID        uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa          Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	WaliKelasID    *uint          `gorm:"index" json:"wali_kelas_id"`
	WaliKelas      *Guru          `gorm:"foreignKey:WaliKelasID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"wali_kelas,omitempty"`
	MapelID        *uint          `gorm:"index" json:"mapel_id"`
	Mapel          *Mapel         `gorm:"foreignKey:MapelID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"mapel,omitempty"`
	TanggalMulai   time.Time      `gorm:"type:date;not null" json:"tanggal_mulai"`
	TanggalSelesai time.Time      `gorm:"type:date;not null" json:"tanggal_selesai"`
	JenisIzin      string         `gorm:"size:50;not null" json:"jenis_izin"`        // Sakit, Izin Keluar, Izin Pulang, Cuti
	TipeIzin       string         `gorm:"size:20;default:'harian'" json:"tipe_izin"` // harian, mapel
	Keterangan     string         `gorm:"type:text;not null" json:"keterangan"`
	BuktiUrl       string         `gorm:"size:255" json:"bukti_url"`
	Status         string         `gorm:"size:20;default:'Pending';index" json:"status"` // Pending, Approved, Rejected
	DisetujuiOleh  *uint          `json:"disetujui_oleh"`
	Approver       *User          `gorm:"foreignKey:DisetujuiOleh;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"approver,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Perizinan) TableName() string { return "tbl_perizinan" }

// IzinGuru represents tbl_izin_guru (Guru permissions/leaves)
type IzinGuru struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	GuruID         uint           `gorm:"not null;index" json:"guru_id"`
	Guru           Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	TanggalMulai   time.Time      `gorm:"type:date;not null" json:"tanggal_mulai"`
	TanggalSelesai time.Time      `gorm:"type:date;not null" json:"tanggal_selesai"`
	JenisIzin      string         `gorm:"size:50;default:'Izin'" json:"jenis_izin"` // Sakit, Izin, Cuti, Dinas Luar, dll
	Keterangan     string         `gorm:"type:text;not null" json:"keterangan"`
	BuktiUrl       string         `gorm:"size:255" json:"bukti_url"`
	Status         string         `gorm:"size:20;default:'Pending';index" json:"status"` // Pending, Approved, Rejected
	DisetujuiOleh  *uint          `json:"disetujui_oleh"`
	Approver       *User          `gorm:"foreignKey:DisetujuiOleh;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"approver,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (IzinGuru) TableName() string { return "tbl_izin_guru" }

// Nilai represents tbl_nilai (Student mapel grades)
type Nilai struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	SiswaID    uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa      Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	MapelID    uint           `gorm:"not null;index" json:"mapel_id"`
	Mapel      Mapel          `gorm:"foreignKey:MapelID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"mapel,omitempty"`
	GuruID     uint           `gorm:"not null;index" json:"guru_id"`
	Guru       Guru           `gorm:"foreignKey:GuruID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"guru,omitempty"`
	JenisNilai string         `gorm:"size:50;not null" json:"jenis_nilai"` // Tugas, UH, UTS, UAS
	Nilai      float64        `gorm:"not null" json:"nilai"`
	Keterangan string         `gorm:"type:text" json:"keterangan"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Nilai) TableName() string { return "tbl_nilai" }

// RekapNilai represents tbl_rekap_nilai — aggregated grade sheet per student per subject per semester
type RekapNilai struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	MengajarID  uint           `gorm:"not null;index" json:"mengajar_id"`
	Mengajar    Mengajar       `gorm:"foreignKey:MengajarID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"mengajar,omitempty"`
	SiswaID     uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa       Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"siswa,omitempty"`
	Semester    string         `gorm:"size:10;not null;index" json:"semester"`          // Ganjil, Genap
	TahunAjaran string         `gorm:"size:20;not null;index" json:"tahun_ajaran"`      // e.g. 2025/2026
	NilaiMid    *float64       `gorm:"type:decimal(5,2)" json:"nilai_mid"`              // null = belum diisi
	NilaiUAS    *float64       `gorm:"type:decimal(5,2)" json:"nilai_uas"`              // null = belum diisi
	NilaiAkhir  *float64       `gorm:"type:decimal(5,2)" json:"nilai_akhir"`            // auto-calculated
	BobotTugas  float64        `gorm:"type:decimal(5,2);default:30" json:"bobot_tugas"` // %
	BobotMid    float64        `gorm:"type:decimal(5,2);default:30" json:"bobot_mid"`
	BobotUAS    float64        `gorm:"type:decimal(5,2);default:40" json:"bobot_uas"`
	Tugas       []NilaiTugas   `gorm:"foreignKey:RekapNilaiID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"tugas,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (RekapNilai) TableName() string { return "tbl_rekap_nilai" }

// NilaiTugas represents tbl_nilai_tugas — individual task scores linked to a rekap
type NilaiTugas struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	RekapNilaiID uint      `gorm:"not null;index" json:"rekap_nilai_id"`
	Ke           int       `gorm:"not null" json:"ke"` // task number: 1, 2, 3...
	Nilai        float64   `gorm:"type:decimal(5,2);not null" json:"nilai"`
	Keterangan   string    `gorm:"type:text" json:"keterangan"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (NilaiTugas) TableName() string { return "tbl_nilai_tugas" }

// OrangTua represents tbl_orang_tua
type OrangTua struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"unique;not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"user,omitempty"`
	Nama      string         `gorm:"size:100;not null" json:"nama"`
	Phone     string         `gorm:"size:20" json:"phone"`
	Pekerjaan string         `gorm:"size:100" json:"pekerjaan"`
	Alamat    string         `gorm:"type:text" json:"alamat"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (OrangTua) TableName() string { return "tbl_orang_tua" }

// AnakOrangTua represents tbl_anak_orang_tua (Junction table for parents to multiple students)
type AnakOrangTua struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	OrangTuaID uint           `gorm:"not null;index" json:"orang_tua_id"`
	OrangTua   OrangTua       `gorm:"foreignKey:OrangTuaID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"orang_tua,omitempty"`
	SiswaID    uint           `gorm:"not null;index" json:"siswa_id"`
	Siswa      Siswa          `gorm:"foreignKey:SiswaID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"siswa,omitempty"`
	Hubungan   string         `gorm:"size:50;not null" json:"hubungan"` // Ayah, Ibu, Wali
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AnakOrangTua) TableName() string { return "tbl_anak_orang_tua" }

// Notifikasi represents tbl_notifikasi
type Notifikasi struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	Judul     string         `gorm:"size:150;not null" json:"judul"`
	Pesan     string         `gorm:"type:text;not null" json:"pesan"`
	Tipe      string         `gorm:"size:50;default:'Sistem'" json:"tipe"` // Sistem, Jurnal, Absensi, BK, Perizinan
	IsRead    bool           `gorm:"default:false;index" json:"is_read"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Notifikasi) TableName() string { return "tbl_notifikasi" }

// AuditLog represents tbl_audit_logs
type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    *uint     `gorm:"index" json:"user_id"`
	User      *User     `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"user,omitempty"`
	Aktivitas string    `gorm:"type:text;not null" json:"aktivitas"`
	IPAddress string    `gorm:"size:50" json:"ip_address"`
	UserAgent string    `gorm:"type:text" json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

func (AuditLog) TableName() string { return "tbl_audit_logs" }

// Pesan represents tbl_pesan (inbox messages between users)
type Pesan struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	DariUserID uint           `gorm:"not null;index" json:"dari_user_id"`
	DariUser   User           `gorm:"foreignKey:DariUserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"dari_user,omitempty"`
	KeUserID   uint           `gorm:"not null;index" json:"ke_user_id"`
	KeUser     User           `gorm:"foreignKey:KeUserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"ke_user,omitempty"`
	Judul      string         `gorm:"size:150;not null" json:"judul"`
	Isi        string         `gorm:"type:text;not null" json:"isi"`
	IsRead     bool           `gorm:"default:false;index" json:"is_read"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Pesan) TableName() string { return "tbl_pesan" }
