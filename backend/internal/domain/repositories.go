package domain

import "time"

// Pagination Query parameters
type PaginationParam struct {
	Page    int    `json:"page"`
	Limit   int    `json:"limit"`
	Search  string `json:"search"`
	SortBy  string `json:"sort_by"`
	SortDir string `json:"sort_dir"`
}

// Meta pagination info
type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalCount int64 `json:"total_count"`
	TotalPages int   `json:"total_pages"`
}

// Response structure used for listings
type PaginatedResult[T any] struct {
	Data []T  `json:"data"`
	Meta Meta `json:"meta"`
}

// UserRepository interface
type UserRepository interface {
	Create(user *User) error
	Update(user *User) error
	Delete(id uint) error
	FindByID(id uint) (*User, error)
	FindByUsername(username string) (*User, error)
	FindByEmail(email string) (*User, error)
	FindByUsernameUnscoped(username string) (*User, error)
	FindByEmailUnscoped(email string) (*User, error)
	List(param PaginationParam) (*PaginatedResult[User], error)
	ListAll() ([]User, error)
	FindByRole(role string) ([]User, error)
}

// GuruRepository interface
type GuruRepository interface {
	Create(guru *Guru) error
	Update(guru *Guru) error
	Delete(id uint) error
	Deactivate(id uint) error
	IsWaliKelas(id uint) (bool, error)
	FindByID(id uint) (*Guru, error)
	FindByUserID(userID uint) (*Guru, error)
	FindByNIP(nip string) (*Guru, error)
	List(param PaginationParam, status string) (*PaginatedResult[Guru], error)
	CountAll() (int64, error)
}

// SiswaRepository interface
type SiswaRepository interface {
	Create(siswa *Siswa) error
	Update(siswa *Siswa) error
	Delete(id uint) error
	Deactivate(id uint) error
	FindByID(id uint) (*Siswa, error)
	FindByUserID(userID uint) (*Siswa, error)
	FindByNISN(nisn string) (*Siswa, error)
	FindByNIS(nis string) (*Siswa, error)
	List(param PaginationParam, kelasID uint, jurusanID uint, status string) (*PaginatedResult[Siswa], error)
	CountAll() (int64, error)
	GetByKelasID(kelasID uint) ([]Siswa, error)
}

// OrangTuaRepository interface
type OrangTuaRepository interface {
	Create(ortu *OrangTua) error
	Update(ortu *OrangTua) error
	Delete(id uint) error
	FindByID(id uint) (*OrangTua, error)
	FindByUserID(userID uint) (*OrangTua, error)
	List(param PaginationParam) (*PaginatedResult[OrangTua], error)
}

// AnakOrangTuaRepository interface
type AnakOrangTuaRepository interface {
	Create(relation *AnakOrangTua) error
	Delete(id uint) error
	FindByOrangTuaID(ortuID uint) ([]AnakOrangTua, error)
	FindBySiswaID(siswaID uint) ([]AnakOrangTua, error)
}

// KelasRepository interface
type KelasRepository interface {
	Create(kelas *Kelas) error
	Update(kelas *Kelas) error
	Delete(id uint) error
	HasActiveReferences(id uint) (bool, error)
	FindByID(id uint) (*Kelas, error)
	List(param PaginationParam, jurusanID uint) (*PaginatedResult[Kelas], error)
	CountAll() (int64, error)
}

// JurusanRepository interface
type JurusanRepository interface {
	Create(jurusan *Jurusan) error
	Update(jurusan *Jurusan) error
	Delete(id uint) error
	FindByID(id uint) (*Jurusan, error)
	FindByKode(kode string) (*Jurusan, error)
	FindByNama(nama string) (*Jurusan, error)
	List(param PaginationParam) (*PaginatedResult[Jurusan], error)
}

// MapelRepository interface
type MapelRepository interface {
	Create(mapel *Mapel) error
	Update(mapel *Mapel) error
	Delete(id uint) error
	FindByID(id uint) (*Mapel, error)
	List(param PaginationParam) (*PaginatedResult[Mapel], error)
	CountAll() (int64, error)
}

// MengajarRepository interface
type MengajarRepository interface {
	Create(mengajar *Mengajar) error
	Update(mengajar *Mengajar) error
	Delete(id uint) error
	FindByID(id uint) (*Mengajar, error)
	List(param PaginationParam, guruID uint, kelasID uint) (*PaginatedResult[Mengajar], error)
	ListByGuru(guruID uint) ([]Mengajar, error)
}

// JurnalRepository interface
type JurnalRepository interface {
	Create(jurnal *Jurnal) error
	Update(jurnal *Jurnal) error
	Delete(id uint) error
	FindByID(id uint) (*Jurnal, error)
	FindByMengajarAndTanggal(mengajarID uint, tanggal time.Time) (*Jurnal, error)
	List(param PaginationParam, guruID uint, kelasID uint, mapelID uint, startDate, endDate *time.Time) (*PaginatedResult[Jurnal], error)
	CountToday() (int64, error)
	SumJamByKelasAndTanggal(kelasID uint, tanggal time.Time) (int, error)
}

// AbsensiRepository interface
type AbsensiRepository interface {
	Create(absensi *Absensi) error
	CreateBatch(absensiList []Absensi) error
	Update(absensi *Absensi) error
	Delete(id uint) error
	FindByID(id uint) (*Absensi, error)
	GetByJurnalID(jurnalID uint) ([]Absensi, error)
	CountStatusToday(status string) (int64, error)
	List(param PaginationParam, siswaID uint, status string, start, end *time.Time) (*PaginatedResult[Absensi], error)
}

// KehadiranGuruRepository interface
type KehadiranGuruRepository interface {
	Create(k *KehadiranGuru) error
	Update(k *KehadiranGuru) error
	Delete(id uint) error
	FindByID(id uint) (*KehadiranGuru, error)
	FindByGuruAndTanggal(guruID uint, tanggal time.Time) (*KehadiranGuru, error)
	List(param PaginationParam, guruID uint, startDate, endDate *time.Time) (*PaginatedResult[KehadiranGuru], error)
}

// RequestJurnalMundurRepository interface
type RequestJurnalMundurRepository interface {
	Create(r *RequestJurnalMundur) error
	Update(r *RequestJurnalMundur) error
	Delete(id uint) error
	FindByID(id uint) (*RequestJurnalMundur, error)
	FindApproved(guruID, mengajarID uint, tanggal time.Time) (*RequestJurnalMundur, error)
	List(param PaginationParam, guruID uint, status string) (*PaginatedResult[RequestJurnalMundur], error)
}

// AbsensiGuruRepository interface
type AbsensiGuruRepository interface {
	Create(absensi *AbsensiGuru) error
	Update(absensi *AbsensiGuru) error
	FindByID(id uint) (*AbsensiGuru, error)
	FindByGuruAndDate(guruID uint, date time.Time) (*AbsensiGuru, error)
	List(param PaginationParam, guruID uint, status string, startDate, endDate *time.Time) (*PaginatedResult[AbsensiGuru], error)
	CountStatusToday(status string) (int64, error)
}

// HariLiburRepository interface
type HariLiburRepository interface {
	Create(libur *HariLibur) error
	Update(libur *HariLibur) error
	Delete(id uint) error
	FindByID(id uint) (*HariLibur, error)
	FindByDate(date time.Time) (*HariLibur, error)
	FindByDateAndKelas(date time.Time, kelasID uint) (*HariLibur, error)
	List(param PaginationParam) (*PaginatedResult[HariLibur], error)
	ListByBulan(year, month int) ([]HariLibur, error)
}

// PengaturanJamRepository interface
type PengaturanJamRepository interface {
	Update(config *PengaturanJam) error
	FindByID(id uint) (*PengaturanJam, error)
	FindByTipe(tipe string) (*PengaturanJam, error)
	List() ([]PengaturanJam, error)
}

// JamKhususRepository interface
type JamKhususRepository interface {
	Create(jam *JamKhusus) error
	Delete(id uint) error
	FindByID(id uint) (*JamKhusus, error)
	FindByTanggal(tanggal time.Time, kelasID *uint) (*JamKhusus, error)
	ListByBulan(year, month int) ([]JamKhusus, error)
}

// BKKonselingRepository interface
type BKKonselingRepository interface {
	Create(bk *BKKonseling) error
	Update(bk *BKKonseling) error
	Delete(id uint) error
	FindByID(id uint) (*BKKonseling, error)
	List(param PaginationParam, siswaID uint, guruID uint, status string, tipe string) (*PaginatedResult[BKKonseling], error)
}

// PelanggaranRepository interface
type PelanggaranRepository interface {
	Create(pelanggaran *Pelanggaran) error
	Update(pelanggaran *Pelanggaran) error
	Delete(id uint) error
	FindByID(id uint) (*Pelanggaran, error)
	List(param PaginationParam, siswaID uint) (*PaginatedResult[Pelanggaran], error)
	SumPointsBySiswaID(siswaID uint) (int, error)
}

// PrestasiRepository interface
type PrestasiRepository interface {
	Create(prestasi *Prestasi) error
	Update(prestasi *Prestasi) error
	Delete(id uint) error
	FindByID(id uint) (*Prestasi, error)
	List(param PaginationParam, siswaID uint, kategori string) (*PaginatedResult[Prestasi], error)
}

// TesPsikologiRepository interface
type TesPsikologiRepository interface {
	Create(tes *TesPsikologi) error
	Update(tes *TesPsikologi) error
	Delete(id uint) error
	FindByID(id uint) (*TesPsikologi, error)
	List(param PaginationParam, siswaID uint) (*PaginatedResult[TesPsikologi], error)
}

// ProyekRepository interface
type ProyekRepository interface {
	Create(proyek *Proyek) error
	Update(proyek *Proyek) error
	Delete(id uint) error
	FindByID(id uint) (*Proyek, error)
	List(param PaginationParam, kelasID uint, status string) (*PaginatedResult[Proyek], error)
}

// PerizinanRepository interface
type PerizinanRepository interface {
	Create(izin *Perizinan) error
	Update(izin *Perizinan) error
	Delete(id uint) error
	FindByID(id uint) (*Perizinan, error)
	List(param PaginationParam, siswaID uint, status string) (*PaginatedResult[Perizinan], error)
	ListForApprover(param PaginationParam, waliKelasID uint, mapelIDs []uint, status string) (*PaginatedResult[Perizinan], error)
}

// IzinGuruRepository interface
type IzinGuruRepository interface {
	Create(izin *IzinGuru) error
	Update(izin *IzinGuru) error
	Delete(id uint) error
	FindByID(id uint) (*IzinGuru, error)
	List(param PaginationParam, guruID uint, status string) (*PaginatedResult[IzinGuru], error)
}

// NilaiRepository interface
type NilaiRepository interface {
	Create(nilai *Nilai) error
	Update(nilai *Nilai) error
	Delete(id uint) error
	FindByID(id uint) (*Nilai, error)
	List(param PaginationParam, siswaID uint, mapelID uint, jenisNilai string) (*PaginatedResult[Nilai], error)
}

// NotifikasiRepository interface
type NotifikasiRepository interface {
	Create(notif *Notifikasi) error
	Update(notif *Notifikasi) error
	MarkAllAsRead(userID uint) error
	FindByID(id uint) (*Notifikasi, error)
	List(param PaginationParam, userID uint, isRead *bool) (*PaginatedResult[Notifikasi], error)
}

// AuditLogRepository interface
type AuditLogRepository interface {
	Create(log *AuditLog) error
	List(param PaginationParam, userID uint) (*PaginatedResult[AuditLog], error)
}

// PesanRepository interface
type PesanRepository interface {
	Create(p *Pesan) error
	FindByID(id uint) (*Pesan, error)
	ListInbox(param PaginationParam, userID uint) (*PaginatedResult[Pesan], error)
	ListSent(param PaginationParam, userID uint) (*PaginatedResult[Pesan], error)
	MarkAsRead(id uint) error
	Delete(id uint) error
}
