package repository

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/asan14/jurnal-apps-backend/internal/domain"
	"gorm.io/gorm"
)

// Pagination helper
func paginate[T any](db *gorm.DB, param domain.PaginationParam, out *[]T) (domain.Meta, error) {
	var count int64
	err := db.Count(&count).Error
	if err != nil {
		return domain.Meta{}, err
	}

	if param.SortBy != "" {
		dir := "ASC"
		if param.SortDir == "DESC" || param.SortDir == "desc" {
			dir = "DESC"
		}
		db = db.Order(fmt.Sprintf("%s %s", param.SortBy, dir))
	} else {
		db = db.Order("id DESC")
	}

	page := param.Page
	if page <= 0 {
		page = 1
	}
	limit := param.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	err = db.Limit(limit).Offset(offset).Find(out).Error
	if err != nil {
		return domain.Meta{}, err
	}

	totalPages := int(count) / limit
	if int(count)%limit != 0 {
		totalPages++
	}

	return domain.Meta{
		Page:       page,
		Limit:      limit,
		TotalCount: count,
		TotalPages: totalPages,
	}, nil
}

// ----------------------------------------------------
// USER REPOSITORY
// ----------------------------------------------------
type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db}
}

func (r *userRepository) Create(u *domain.User) error {
	return r.db.Create(u).Error
}

func (r *userRepository) Update(u *domain.User) error {
	return r.db.Save(u).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&domain.User{}, id).Error
}

func (r *userRepository) FindByID(id uint) (*domain.User, error) {
	var u domain.User
	err := r.db.First(&u, id).Error
	return &u, err
}

func (r *userRepository) FindByUsername(username string) (*domain.User, error) {
	var u domain.User
	err := r.db.Where("username = ?", username).First(&u).Error
	return &u, err
}

func (r *userRepository) FindByEmail(email string) (*domain.User, error) {
	var u domain.User
	err := r.db.Where("email = ?", email).First(&u).Error
	return &u, err
}

func (r *userRepository) FindByUsernameUnscoped(username string) (*domain.User, error) {
	var u domain.User
	err := r.db.Unscoped().Where("username = ?", username).First(&u).Error
	return &u, err
}

func (r *userRepository) FindByEmailUnscoped(email string) (*domain.User, error) {
	var u domain.User
	err := r.db.Unscoped().Where("email = ?", email).First(&u).Error
	return &u, err
}

func (r *userRepository) List(param domain.PaginationParam) (*domain.PaginatedResult[domain.User], error) {
	var list []domain.User
	tx := r.db.Model(&domain.User{})
	if param.Search != "" {
		tx = tx.Where("username ILIKE ? OR email ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.User]{Data: list, Meta: meta}, nil
}

func (r *userRepository) ListAll() ([]domain.User, error) {
	var list []domain.User
	err := r.db.Select("id, username, email, role, nama_lengkap, foto_url").Where("deleted_at IS NULL").Order("username ASC").Find(&list).Error
	return list, err
}

func (r *userRepository) FindByRole(role string) ([]domain.User, error) {
	var list []domain.User
	err := r.db.Where("role = ? AND deleted_at IS NULL", role).Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// GURU REPOSITORY
// ----------------------------------------------------
type guruRepository struct {
	db *gorm.DB
}

func NewGuruRepository(db *gorm.DB) domain.GuruRepository {
	return &guruRepository{db}
}

func (r *guruRepository) Create(g *domain.Guru) error {
	return r.db.Create(g).Error
}

func (r *guruRepository) Update(g *domain.Guru) error {
	return r.db.Save(g).Error
}

func (r *guruRepository) Deactivate(id uint) error {
	return r.db.Model(&domain.Guru{}).Where("id = ?", id).Update("status", "Non-Aktif").Error
}

func (r *guruRepository) IsWaliKelas(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&domain.Kelas{}).Where("wali_kelas_id = ? AND deleted_at IS NULL", id).Count(&count).Error
	return count > 0, err
}

func (r *guruRepository) Delete(id uint) error {
	var g domain.Guru
	if err := r.db.First(&g, id).Error; err != nil {
		return err
	}
	// Delete user as well to maintain integrity
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Hard delete guru agar FK ke tbl_users tidak menghalangi penghapusan user
		if err := tx.Unscoped().Delete(&domain.Guru{}, id).Error; err != nil {
			return err
		}
		return tx.Unscoped().Delete(&domain.User{}, g.UserID).Error
	})
}

func (r *guruRepository) FindByID(id uint) (*domain.Guru, error) {
	var g domain.Guru
	err := r.db.Preload("User").First(&g, id).Error
	return &g, err
}

func (r *guruRepository) FindByUserID(userID uint) (*domain.Guru, error) {
	var g domain.Guru
	err := r.db.Preload("User").Where("user_id = ?", userID).First(&g).Error
	return &g, err
}

func (r *guruRepository) FindByNIP(nip string) (*domain.Guru, error) {
	var g domain.Guru
	err := r.db.Preload("User").Where("nip = ?", nip).First(&g).Error
	return &g, err
}

func (r *guruRepository) List(param domain.PaginationParam, status string) (*domain.PaginatedResult[domain.Guru], error) {
	var list []domain.Guru
	tx := r.db.Model(&domain.Guru{}).Preload("User")
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if param.Search != "" {
		tx = tx.Where("nama ILIKE ? OR nip ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Guru]{Data: list, Meta: meta}, nil
}

func (r *guruRepository) CountAll() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Guru{}).Where("status = 'Aktif'").Count(&count).Error
	return count, err
}

// ----------------------------------------------------
// SISWA REPOSITORY
// ----------------------------------------------------
type siswaRepository struct {
	db *gorm.DB
}

func NewSiswaRepository(db *gorm.DB) domain.SiswaRepository {
	return &siswaRepository{db}
}

func (r *siswaRepository) Create(s *domain.Siswa) error {
	return r.db.Create(s).Error
}

func (r *siswaRepository) Update(s *domain.Siswa) error {
	return r.db.Model(s).Omit("User", "Kelas", "Jurusan").Save(s).Error
}

func (r *siswaRepository) Deactivate(id uint) error {
	return r.db.Model(&domain.Siswa{}).Where("id = ?", id).Update("status", "Non-Aktif").Error
}

func (r *siswaRepository) Delete(id uint) error {
	var s domain.Siswa
	if err := r.db.First(&s, id).Error; err != nil {
		return err
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Hard delete siswa agar FK ke tbl_users tidak menghalangi penghapusan user
		if err := tx.Unscoped().Delete(&domain.Siswa{}, id).Error; err != nil {
			return err
		}
		// Hard delete user agar username & email bisa digunakan kembali
		return tx.Unscoped().Delete(&domain.User{}, s.UserID).Error
	})
}

func (r *siswaRepository) FindByID(id uint) (*domain.Siswa, error) {
	var s domain.Siswa
	err := r.db.Preload("User").Preload("Kelas").Preload("Jurusan").First(&s, id).Error
	return &s, err
}

func (r *siswaRepository) FindByUserID(userID uint) (*domain.Siswa, error) {
	var s domain.Siswa
	err := r.db.Preload("User").Preload("Kelas").Preload("Jurusan").Where("user_id = ?", userID).First(&s).Error
	return &s, err
}

func (r *siswaRepository) FindByNISN(nisn string) (*domain.Siswa, error) {
	var s domain.Siswa
	err := r.db.Preload("User").Preload("Kelas").Preload("Jurusan").Where("nisn = ?", nisn).First(&s).Error
	return &s, err
}

func (r *siswaRepository) FindByNIS(nis string) (*domain.Siswa, error) {
	var s domain.Siswa
	err := r.db.Preload("User").Preload("Kelas").Preload("Jurusan").Where("nis = ?", nis).First(&s).Error
	return &s, err
}

func (r *siswaRepository) List(param domain.PaginationParam, kelasID uint, jurusanID uint, status string) (*domain.PaginatedResult[domain.Siswa], error) {
	var list []domain.Siswa
	tx := r.db.Model(&domain.Siswa{}).Preload("User").Preload("Kelas").Preload("Jurusan")
	if kelasID > 0 {
		tx = tx.Where("kelas_id = ?", kelasID)
	}
	if jurusanID > 0 {
		tx = tx.Where("jurusan_id = ?", jurusanID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if param.Search != "" {
		s := "%" + strings.ToLower(param.Search) + "%"
		tx = tx.Where("LOWER(nama) LIKE ? OR LOWER(nisn) LIKE ? OR LOWER(nis) LIKE ?", s, s, s)
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Siswa]{Data: list, Meta: meta}, nil
}

func (r *siswaRepository) CountAll() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Siswa{}).Where("status = 'Aktif'").Count(&count).Error
	return count, err
}

func (r *siswaRepository) GetByKelasID(kelasID uint) ([]domain.Siswa, error) {
	var list []domain.Siswa
	err := r.db.Where("kelas_id = ? AND status = 'Aktif'", kelasID).Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// ORANG TUA REPOSITORY
// ----------------------------------------------------
type orangTuaRepository struct {
	db *gorm.DB
}

func NewOrangTuaRepository(db *gorm.DB) domain.OrangTuaRepository {
	return &orangTuaRepository{db}
}

func (r *orangTuaRepository) Create(o *domain.OrangTua) error {
	return r.db.Create(o).Error
}

func (r *orangTuaRepository) Update(o *domain.OrangTua) error {
	return r.db.Save(o).Error
}

func (r *orangTuaRepository) Delete(id uint) error {
	var o domain.OrangTua
	if err := r.db.First(&o, id).Error; err != nil {
		return err
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&domain.OrangTua{}, id).Error; err != nil {
			return err
		}
		return tx.Delete(&domain.User{}, o.UserID).Error
	})
}

func (r *orangTuaRepository) FindByID(id uint) (*domain.OrangTua, error) {
	var o domain.OrangTua
	err := r.db.Preload("User").First(&o, id).Error
	return &o, err
}

func (r *orangTuaRepository) FindByUserID(userID uint) (*domain.OrangTua, error) {
	var o domain.OrangTua
	err := r.db.Preload("User").Where("user_id = ?", userID).First(&o).Error
	return &o, err
}

func (r *orangTuaRepository) List(param domain.PaginationParam) (*domain.PaginatedResult[domain.OrangTua], error) {
	var list []domain.OrangTua
	tx := r.db.Model(&domain.OrangTua{}).Preload("User")
	if param.Search != "" {
		tx = tx.Where("nama ILIKE ? OR phone ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.OrangTua]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// ANAK ORANG TUA REPOSITORY
// ----------------------------------------------------
type anakOrangTuaRepository struct {
	db *gorm.DB
}

func NewAnakOrangTuaRepository(db *gorm.DB) domain.AnakOrangTuaRepository {
	return &anakOrangTuaRepository{db}
}

func (r *anakOrangTuaRepository) Create(rel *domain.AnakOrangTua) error {
	return r.db.Create(rel).Error
}

func (r *anakOrangTuaRepository) Delete(id uint) error {
	return r.db.Delete(&domain.AnakOrangTua{}, id).Error
}

func (r *anakOrangTuaRepository) FindByOrangTuaID(ortuID uint) ([]domain.AnakOrangTua, error) {
	var list []domain.AnakOrangTua
	err := r.db.Preload("Siswa").Preload("Siswa.Kelas").Preload("Siswa.Jurusan").Where("orang_tua_id = ?", ortuID).Find(&list).Error
	return list, err
}

func (r *anakOrangTuaRepository) FindBySiswaID(siswaID uint) ([]domain.AnakOrangTua, error) {
	var list []domain.AnakOrangTua
	err := r.db.Preload("OrangTua").Where("siswa_id = ?", siswaID).Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// KELAS REPOSITORY
// ----------------------------------------------------
type kelasRepository struct {
	db *gorm.DB
}

func NewKelasRepository(db *gorm.DB) domain.KelasRepository {
	return &kelasRepository{db}
}

func (r *kelasRepository) Create(k *domain.Kelas) error {
	return r.db.Create(k).Error
}

func (r *kelasRepository) Update(k *domain.Kelas) error {
	return r.db.Save(k).Error
}

func (r *kelasRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Kelas{}, id).Error
}

func (r *kelasRepository) HasActiveReferences(id uint) (bool, error) {
	var mengajarCount, siswaCount int64
	r.db.Model(&domain.Mengajar{}).Where("kelas_id = ? AND deleted_at IS NULL", id).Count(&mengajarCount)
	r.db.Model(&domain.Siswa{}).Where("kelas_id = ? AND deleted_at IS NULL", id).Count(&siswaCount)
	return mengajarCount > 0 || siswaCount > 0, nil
}

func (r *kelasRepository) FindByID(id uint) (*domain.Kelas, error) {
	var k domain.Kelas
	err := r.db.Preload("Jurusan").Preload("WaliKelas").First(&k, id).Error
	return &k, err
}

func (r *kelasRepository) List(param domain.PaginationParam, jurusanID uint) (*domain.PaginatedResult[domain.Kelas], error) {
	var list []domain.Kelas
	tx := r.db.Model(&domain.Kelas{}).Preload("Jurusan").Preload("WaliKelas")
	if jurusanID > 0 {
		tx = tx.Where("jurusan_id = ?", jurusanID)
	}
	if param.Search != "" {
		tx = tx.Where("nama_kelas ILIKE ?", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Kelas]{Data: list, Meta: meta}, nil
}

func (r *kelasRepository) CountAll() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Kelas{}).Count(&count).Error
	return count, err
}

// ----------------------------------------------------
// JURUSAN REPOSITORY
// ----------------------------------------------------
type jurusanRepository struct {
	db *gorm.DB
}

func NewJurusanRepository(db *gorm.DB) domain.JurusanRepository {
	return &jurusanRepository{db}
}

func (r *jurusanRepository) Create(j *domain.Jurusan) error {
	return r.db.Create(j).Error
}

func (r *jurusanRepository) Update(j *domain.Jurusan) error {
	return r.db.Save(j).Error
}

func (r *jurusanRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Jurusan{}, id).Error
}

func (r *jurusanRepository) FindByID(id uint) (*domain.Jurusan, error) {
	var j domain.Jurusan
	err := r.db.First(&j, id).Error
	return &j, err
}

func (r *jurusanRepository) FindByKode(kode string) (*domain.Jurusan, error) {
	var j domain.Jurusan
	err := r.db.Where("LOWER(kode_jurusan) = LOWER(?)", kode).First(&j).Error
	return &j, err
}

func (r *jurusanRepository) FindByNama(nama string) (*domain.Jurusan, error) {
	var j domain.Jurusan
	err := r.db.Where("LOWER(nama_jurusan) = LOWER(?)", nama).First(&j).Error
	return &j, err
}

func (r *jurusanRepository) List(param domain.PaginationParam) (*domain.PaginatedResult[domain.Jurusan], error) {
	var list []domain.Jurusan
	tx := r.db.Model(&domain.Jurusan{})
	if param.Search != "" {
		s := "%" + strings.ToLower(param.Search) + "%"
		tx = tx.Where("LOWER(nama_jurusan) LIKE ? OR LOWER(kode_jurusan) LIKE ?", s, s)
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Jurusan]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// MAPEL REPOSITORY
// ----------------------------------------------------
type mapelRepository struct {
	db *gorm.DB
}

func NewMapelRepository(db *gorm.DB) domain.MapelRepository {
	return &mapelRepository{db}
}

func (r *mapelRepository) Create(m *domain.Mapel) error {
	return r.db.Create(m).Error
}

func (r *mapelRepository) Update(m *domain.Mapel) error {
	return r.db.Save(m).Error
}

func (r *mapelRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Mapel{}, id).Error
}

func (r *mapelRepository) FindByID(id uint) (*domain.Mapel, error) {
	var m domain.Mapel
	err := r.db.First(&m, id).Error
	return &m, err
}

func (r *mapelRepository) List(param domain.PaginationParam) (*domain.PaginatedResult[domain.Mapel], error) {
	var list []domain.Mapel
	tx := r.db.Model(&domain.Mapel{})
	if param.Search != "" {
		tx = tx.Where("nama_mapel ILIKE ? OR kode_mapel ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Mapel]{Data: list, Meta: meta}, nil
}

func (r *mapelRepository) CountAll() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Mapel{}).Count(&count).Error
	return count, err
}

// ----------------------------------------------------
// MENGAJAR REPOSITORY
// ----------------------------------------------------
type mengajarRepository struct {
	db *gorm.DB
}

func NewMengajarRepository(db *gorm.DB) domain.MengajarRepository {
	return &mengajarRepository{db}
}

func (r *mengajarRepository) Create(m *domain.Mengajar) error {
	return r.db.Create(m).Error
}

func (r *mengajarRepository) Update(m *domain.Mengajar) error {
	return r.db.Save(m).Error
}

func (r *mengajarRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Mengajar{}, id).Error
}

func (r *mengajarRepository) FindByID(id uint) (*domain.Mengajar, error) {
	var m domain.Mengajar
	err := r.db.Preload("Guru").Preload("Mapel").Preload("Kelas").Preload("Kelas.Jurusan").First(&m, id).Error
	return &m, err
}

func (r *mengajarRepository) List(param domain.PaginationParam, guruID uint, kelasID uint) (*domain.PaginatedResult[domain.Mengajar], error) {
	var list []domain.Mengajar
	tx := r.db.Model(&domain.Mengajar{}).Preload("Guru").Preload("Mapel").Preload("Kelas").Preload("Kelas.Jurusan")
	if guruID > 0 {
		tx = tx.Where("guru_id = ?", guruID)
	}
	if kelasID > 0 {
		tx = tx.Where("kelas_id = ?", kelasID)
	}
	if param.Search != "" {
		tx = tx.Joins("JOIN tbl_guru ON tbl_guru.id = tbl_mengajar.guru_id").
			Joins("JOIN tbl_mapel ON tbl_mapel.id = tbl_mengajar.mapel_id").
			Where("tbl_guru.nama ILIKE ? OR tbl_mapel.nama_mapel ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Mengajar]{Data: list, Meta: meta}, nil
}

func (r *mengajarRepository) ListByGuru(guruID uint) ([]domain.Mengajar, error) {
	var list []domain.Mengajar
	err := r.db.Preload("Mapel").Preload("Kelas").Preload("Kelas.Jurusan").Where("guru_id = ?", guruID).Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// JURNAL REPOSITORY
// ----------------------------------------------------
type jurnalRepository struct {
	db *gorm.DB
}

func NewJurnalRepository(db *gorm.DB) domain.JurnalRepository {
	return &jurnalRepository{db}
}

func (r *jurnalRepository) Create(j *domain.Jurnal) error {
	return r.db.Create(j).Error
}

func (r *jurnalRepository) Update(j *domain.Jurnal) error {
	return r.db.Save(j).Error
}

func (r *jurnalRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Jurnal{}, id).Error
}

func (r *jurnalRepository) FindByID(id uint) (*domain.Jurnal, error) {
	var j domain.Jurnal
	err := r.db.Preload("Mengajar").Preload("Mengajar.Guru").Preload("Mengajar.Mapel").Preload("Mengajar.Kelas", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).First(&j, id).Error
	return &j, err
}

func (r *jurnalRepository) FindByMengajarAndTanggal(mengajarID uint, tanggal time.Time) (*domain.Jurnal, error) {
	var j domain.Jurnal
	err := r.db.Where("mengajar_id = ? AND tanggal = ?", mengajarID, tanggal.Format("2006-01-02")).First(&j).Error
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (r *jurnalRepository) List(param domain.PaginationParam, guruID uint, kelasID uint, mapelID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Jurnal], error) {
	var list []domain.Jurnal
	tx := r.db.Model(&domain.Jurnal{}).Preload("Mengajar").Preload("Mengajar.Guru").Preload("Mengajar.Mapel").Preload("Mengajar.Kelas", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	})

	if guruID > 0 || kelasID > 0 || mapelID > 0 {
		tx = tx.Joins("JOIN tbl_mengajar ON tbl_mengajar.id = tbl_jurnal.mengajar_id AND tbl_mengajar.deleted_at IS NULL")
		if guruID > 0 {
			tx = tx.Where("tbl_mengajar.guru_id = ?", guruID)
		}
		if kelasID > 0 {
			tx = tx.Where("tbl_mengajar.kelas_id = ?", kelasID)
		}
		if mapelID > 0 {
			tx = tx.Where("tbl_mengajar.mapel_id = ?", mapelID)
		}
	}

	if startDate != nil {
		tx = tx.Where("tbl_jurnal.tanggal >= ?", *startDate)
	}
	if endDate != nil {
		tx = tx.Where("tbl_jurnal.tanggal <= ?", *endDate)
	}
	if param.Search != "" {
		tx = tx.Where("tbl_jurnal.topik_materi LIKE ?", "%"+param.Search+"%")
	}

	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Jurnal]{Data: list, Meta: meta}, nil
}

func (r *jurnalRepository) CountToday() (int64, error) {
	var count int64
	today := time.Now().Format("2006-01-02")
	err := r.db.Model(&domain.Jurnal{}).Where("tanggal = ?", today).Count(&count).Error
	return count, err
}

// SumJamByKelasAndTanggal counts total jam pelajaran filled for a kelas on a date
func (r *jurnalRepository) SumJamByKelasAndTanggal(kelasID uint, tanggal time.Time) (int, error) {
	type Row struct {
		JamKe string
	}
	var rows []Row
	err := r.db.Model(&domain.Jurnal{}).
		Select("tbl_jurnal.jam_ke").
		Joins("JOIN tbl_mengajar ON tbl_mengajar.id = tbl_jurnal.mengajar_id AND tbl_mengajar.deleted_at IS NULL").
		Where("tbl_mengajar.kelas_id = ? AND tbl_jurnal.tanggal = ? AND tbl_jurnal.deleted_at IS NULL", kelasID, tanggal.Format("2006-01-02")).
		Find(&rows).Error
	if err != nil {
		return 0, err
	}
	total := 0
	for _, row := range rows {
		total += hitungJumlahJam(row.JamKe)
	}
	return total, nil
}

// hitungJumlahJam calculates number of lesson hours from jam_ke string
func hitungJumlahJam(jamKe string) int {
	parts := strings.Split(jamKe, "-")
	if len(parts) == 1 {
		return 1
	}
	if len(parts) == 2 {
		start, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
		end, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err1 == nil && err2 == nil && end >= start {
			return end - start + 1
		}
	}
	return 1
}

// ----------------------------------------------------
// ABSENSI (PRESENSI SISWA) REPOSITORY
// ----------------------------------------------------
type absensiRepository struct {
	db *gorm.DB
}

func NewAbsensiRepository(db *gorm.DB) domain.AbsensiRepository {
	return &absensiRepository{db}
}

func (r *absensiRepository) Create(a *domain.Absensi) error {
	return r.db.Create(a).Error
}

func (r *absensiRepository) CreateBatch(list []domain.Absensi) error {
	return r.db.Create(&list).Error
}

func (r *absensiRepository) Update(a *domain.Absensi) error {
	return r.db.Save(a).Error
}

func (r *absensiRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Absensi{}, id).Error
}

func (r *absensiRepository) FindByID(id uint) (*domain.Absensi, error) {
	var a domain.Absensi
	err := r.db.Preload("Siswa").First(&a, id).Error
	return &a, err
}

func (r *absensiRepository) GetByJurnalID(jurnalID uint) ([]domain.Absensi, error) {
	var list []domain.Absensi
	err := r.db.Preload("Siswa").Where("jurnal_id = ?", jurnalID).Find(&list).Error
	return list, err
}

func (r *absensiRepository) CountStatusToday(status string) (int64, error) {
	var count int64
	today := time.Now().Format("2006-01-02")
	err := r.db.Model(&domain.Absensi{}).
		Joins("JOIN tbl_jurnal ON tbl_jurnal.id = tbl_presensi_siswa.jurnal_id AND tbl_jurnal.deleted_at IS NULL").
		Where("tbl_jurnal.tanggal = ? AND tbl_presensi_siswa.status_kehadiran = ?", today, status).
		Count(&count).Error
	return count, err
}

func (r *absensiRepository) List(param domain.PaginationParam, siswaID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.Absensi], error) {
	var list []domain.Absensi
	tx := r.db.Model(&domain.Absensi{}).Preload("Siswa")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if status != "" {
		tx = tx.Where("status_kehadiran = ?", status)
	}
	if start != nil {
		tx = tx.Where("created_at >= ?", *start)
	}
	if end != nil {
		tx = tx.Where("created_at <= ?", *end)
	}
	tx = tx.Order("created_at DESC")
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Absensi]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// KEHADIRAN GURU REPOSITORY
// ----------------------------------------------------
type kehadiranGuruRepository struct {
	db *gorm.DB
}

func NewKehadiranGuruRepository(db *gorm.DB) domain.KehadiranGuruRepository {
	return &kehadiranGuruRepository{db}
}

func (r *kehadiranGuruRepository) Create(k *domain.KehadiranGuru) error {
	return r.db.Create(k).Error
}

func (r *kehadiranGuruRepository) Update(k *domain.KehadiranGuru) error {
	return r.db.Save(k).Error
}

func (r *kehadiranGuruRepository) Delete(id uint) error {
	return r.db.Delete(&domain.KehadiranGuru{}, id).Error
}

func (r *kehadiranGuruRepository) FindByID(id uint) (*domain.KehadiranGuru, error) {
	var k domain.KehadiranGuru
	err := r.db.Preload("Guru").First(&k, id).Error
	return &k, err
}

func (r *kehadiranGuruRepository) FindByGuruAndTanggal(guruID uint, tanggal time.Time) (*domain.KehadiranGuru, error) {
	var k domain.KehadiranGuru
	err := r.db.Where("guru_id = ? AND tanggal = ?", guruID, tanggal.Format("2006-01-02")).First(&k).Error
	if err != nil {
		return nil, err
	}
	return &k, nil
}

func (r *kehadiranGuruRepository) List(param domain.PaginationParam, guruID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.KehadiranGuru], error) {
	var list []domain.KehadiranGuru
	tx := r.db.Model(&domain.KehadiranGuru{}).Preload("Guru")
	if guruID > 0 {
		tx = tx.Where("guru_id = ?", guruID)
	}
	if startDate != nil {
		tx = tx.Where("tanggal >= ?", *startDate)
	}
	if endDate != nil {
		tx = tx.Where("tanggal <= ?", *endDate)
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.KehadiranGuru]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// REQUEST JURNAL MUNDUR REPOSITORY
// ----------------------------------------------------
type requestJurnalMundurRepository struct {
	db *gorm.DB
}

func NewRequestJurnalMundurRepository(db *gorm.DB) domain.RequestJurnalMundurRepository {
	return &requestJurnalMundurRepository{db}
}

func (r *requestJurnalMundurRepository) Create(req *domain.RequestJurnalMundur) error {
	return r.db.Create(req).Error
}

func (r *requestJurnalMundurRepository) Update(req *domain.RequestJurnalMundur) error {
	return r.db.Save(req).Error
}

func (r *requestJurnalMundurRepository) Delete(id uint) error {
	return r.db.Delete(&domain.RequestJurnalMundur{}, id).Error
}

func (r *requestJurnalMundurRepository) FindByID(id uint) (*domain.RequestJurnalMundur, error) {
	var req domain.RequestJurnalMundur
	err := r.db.Preload("Guru").Preload("Mengajar").Preload("Mengajar.Mapel").Preload("Mengajar.Kelas").First(&req, id).Error
	return &req, err
}

func (r *requestJurnalMundurRepository) FindApproved(guruID, mengajarID uint, tanggal time.Time) (*domain.RequestJurnalMundur, error) {
	var req domain.RequestJurnalMundur
	err := r.db.Where("guru_id = ? AND mengajar_id = ? AND tanggal_jurnal = ? AND status = 'approved'",
		guruID, mengajarID, tanggal.Format("2006-01-02")).First(&req).Error
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *requestJurnalMundurRepository) List(param domain.PaginationParam, guruID uint, status string) (*domain.PaginatedResult[domain.RequestJurnalMundur], error) {
	var list []domain.RequestJurnalMundur
	tx := r.db.Model(&domain.RequestJurnalMundur{}).Preload("Guru").Preload("Mengajar").Preload("Mengajar.Mapel").Preload("Mengajar.Kelas")
	if guruID > 0 {
		tx = tx.Where("guru_id = ?", guruID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	tx = tx.Order("created_at DESC")
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.RequestJurnalMundur]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// ABSENSI GURU REPOSITORY
// ----------------------------------------------------
type absensiGuruRepository struct {
	db *gorm.DB
}

func NewAbsensiGuruRepository(db *gorm.DB) domain.AbsensiGuruRepository {
	return &absensiGuruRepository{db}
}

func (r *absensiGuruRepository) Create(a *domain.AbsensiGuru) error {
	return r.db.Create(a).Error
}

func (r *absensiGuruRepository) Update(a *domain.AbsensiGuru) error {
	return r.db.Save(a).Error
}

func (r *absensiGuruRepository) FindByID(id uint) (*domain.AbsensiGuru, error) {
	var a domain.AbsensiGuru
	err := r.db.Preload("Guru").First(&a, id).Error
	return &a, err
}

func (r *absensiGuruRepository) FindByGuruAndDate(guruID uint, date time.Time) (*domain.AbsensiGuru, error) {
	var a domain.AbsensiGuru
	dateStr := date.Format("2006-01-02")
	err := r.db.Preload("Guru").Where("guru_id = ? AND tanggal = ?", guruID, dateStr).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *absensiGuruRepository) List(param domain.PaginationParam, guruID uint, status string, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.AbsensiGuru], error) {
	var list []domain.AbsensiGuru
	tx := r.db.Model(&domain.AbsensiGuru{}).Preload("Guru")
	if guruID > 0 {
		tx = tx.Where("guru_id = ?", guruID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if startDate != nil {
		tx = tx.Where("tanggal >= ?", *startDate)
	}
	if endDate != nil {
		tx = tx.Where("tanggal <= ?", *endDate)
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.AbsensiGuru]{Data: list, Meta: meta}, nil
}

func (r *absensiGuruRepository) CountStatusToday(status string) (int64, error) {
	var count int64
	today := time.Now().Format("2006-01-02")
	err := r.db.Model(&domain.AbsensiGuru{}).Where("tanggal = ? AND status = ?", today, status).Count(&count).Error
	return count, err
}

// ----------------------------------------------------
// HARI LIBUR REPOSITORY
// ----------------------------------------------------
type hariLiburRepository struct {
	db *gorm.DB
}

func NewHariLiburRepository(db *gorm.DB) domain.HariLiburRepository {
	return &hariLiburRepository{db}
}

func (r *hariLiburRepository) Create(l *domain.HariLibur) error {
	return r.db.Create(l).Error
}

func (r *hariLiburRepository) Update(l *domain.HariLibur) error {
	return r.db.Save(l).Error
}

func (r *hariLiburRepository) Delete(id uint) error {
	return r.db.Delete(&domain.HariLibur{}, id).Error
}

func (r *hariLiburRepository) FindByID(id uint) (*domain.HariLibur, error) {
	var l domain.HariLibur
	err := r.db.First(&l, id).Error
	return &l, err
}

func (r *hariLiburRepository) FindByDate(date time.Time) (*domain.HariLibur, error) {
	var l domain.HariLibur
	dateStr := date.Format("2006-01-02")
	// Prioritaskan libur global (kelas_id IS NULL) terlebih dahulu
	err := r.db.Where("tanggal = ? AND kelas_id IS NULL", dateStr).First(&l).Error
	if err == nil {
		return &l, nil
	}
	// Fallback: cek apakah ada libur untuk tanggal ini (termasuk per-kelas)
	err = r.db.Where("tanggal = ?", dateStr).First(&l).Error
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *hariLiburRepository) FindByDateAndKelas(date time.Time, kelasID uint) (*domain.HariLibur, error) {
	var l domain.HariLibur
	dateStr := date.Format("2006-01-02")
	// Global holiday first
	err := r.db.Where("tanggal = ? AND kelas_id IS NULL", dateStr).First(&l).Error
	if err == nil {
		return &l, nil
	}
	// Then class-specific
	err = r.db.Where("tanggal = ? AND kelas_id = ?", dateStr, kelasID).First(&l).Error
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *hariLiburRepository) List(param domain.PaginationParam) (*domain.PaginatedResult[domain.HariLibur], error) {
	var list []domain.HariLibur
	tx := r.db.Model(&domain.HariLibur{}).Preload("Kelas")
	if param.Search != "" {
		tx = tx.Where("nama_libur LIKE ? OR keterangan LIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.HariLibur]{Data: list, Meta: meta}, nil
}

func (r *hariLiburRepository) ListByBulan(year, month int) ([]domain.HariLibur, error) {
	var list []domain.HariLibur
	err := r.db.Preload("Kelas").Where("YEAR(tanggal) = ? AND MONTH(tanggal) = ?", year, month).Order("tanggal ASC").Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// PENGATURAN JAM REPOSITORY
// ----------------------------------------------------
type pengaturanJamRepository struct {
	db *gorm.DB
}

func NewPengaturanJamRepository(db *gorm.DB) domain.PengaturanJamRepository {
	return &pengaturanJamRepository{db}
}

func (r *pengaturanJamRepository) Update(cfg *domain.PengaturanJam) error {
	return r.db.Save(cfg).Error
}

func (r *pengaturanJamRepository) FindByID(id uint) (*domain.PengaturanJam, error) {
	var cfg domain.PengaturanJam
	err := r.db.First(&cfg, id).Error
	return &cfg, err
}

func (r *pengaturanJamRepository) FindByTipe(tipe string) (*domain.PengaturanJam, error) {
	var cfg domain.PengaturanJam
	err := r.db.Where("tipe = ?", tipe).First(&cfg).Error
	return &cfg, err
}

func (r *pengaturanJamRepository) List() ([]domain.PengaturanJam, error) {
	var list []domain.PengaturanJam
	err := r.db.Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// JAM KHUSUS REPOSITORY
// ----------------------------------------------------
type jamKhususRepository struct {
	db *gorm.DB
}

func NewJamKhususRepository(db *gorm.DB) domain.JamKhususRepository {
	return &jamKhususRepository{db}
}

func (r *jamKhususRepository) Create(j *domain.JamKhusus) error {
	return r.db.Create(j).Error
}

func (r *jamKhususRepository) Delete(id uint) error {
	return r.db.Delete(&domain.JamKhusus{}, id).Error
}

func (r *jamKhususRepository) FindByID(id uint) (*domain.JamKhusus, error) {
	var j domain.JamKhusus
	err := r.db.Preload("Kelas").First(&j, id).Error
	return &j, err
}

func (r *jamKhususRepository) FindByTanggal(tanggal time.Time, kelasID *uint) (*domain.JamKhusus, error) {
	var j domain.JamKhusus
	q := r.db.Where("tanggal = ?", tanggal.Format("2006-01-02"))
	if kelasID != nil {
		q = q.Where("kelas_id = ? OR kelas_id IS NULL", *kelasID)
	} else {
		q = q.Where("kelas_id IS NULL")
	}
	err := q.First(&j).Error
	return &j, err
}

func (r *jamKhususRepository) ListByBulan(year, month int) ([]domain.JamKhusus, error) {
	var list []domain.JamKhusus
	err := r.db.Preload("Kelas").Where("YEAR(tanggal) = ? AND MONTH(tanggal) = ?", year, month).Order("tanggal ASC").Find(&list).Error
	return list, err
}

// ----------------------------------------------------
// BK KONSELING REPOSITORY
// ----------------------------------------------------
type bkKonselingRepository struct {
	db *gorm.DB
}

func NewBKKonselingRepository(db *gorm.DB) domain.BKKonselingRepository {
	return &bkKonselingRepository{db}
}

func (r *bkKonselingRepository) Create(bk *domain.BKKonseling) error {
	return r.db.Create(bk).Error
}

func (r *bkKonselingRepository) Update(bk *domain.BKKonseling) error {
	return r.db.Save(bk).Error
}

func (r *bkKonselingRepository) Delete(id uint) error {
	return r.db.Delete(&domain.BKKonseling{}, id).Error
}

func (r *bkKonselingRepository) FindByID(id uint) (*domain.BKKonseling, error) {
	var bk domain.BKKonseling
	err := r.db.Preload("Siswa").Preload("Siswa.Kelas").Preload("Guru").First(&bk, id).Error
	return &bk, err
}

func (r *bkKonselingRepository) List(param domain.PaginationParam, siswaID uint, guruID uint, status string, tipe string) (*domain.PaginatedResult[domain.BKKonseling], error) {
	var list []domain.BKKonseling
	tx := r.db.Model(&domain.BKKonseling{}).Preload("Siswa").Preload("Siswa.Kelas").Preload("Guru")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if guruID > 0 {
		tx = tx.Where("guru_id = ?", guruID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if tipe != "" {
		tx = tx.Where("tipe = ?", tipe)
	}
	if param.Search != "" {
		tx = tx.Where("masalah ILIKE ? OR solusi ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.BKKonseling]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// PELANGGARAN REPOSITORY
// ----------------------------------------------------
type pelanggaranRepository struct {
	db *gorm.DB
}

func NewPelanggaranRepository(db *gorm.DB) domain.PelanggaranRepository {
	return &pelanggaranRepository{db}
}

func (r *pelanggaranRepository) Create(p *domain.Pelanggaran) error {
	return r.db.Create(p).Error
}

func (r *pelanggaranRepository) Update(p *domain.Pelanggaran) error {
	return r.db.Save(p).Error
}

func (r *pelanggaranRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Pelanggaran{}, id).Error
}

func (r *pelanggaranRepository) FindByID(id uint) (*domain.Pelanggaran, error) {
	var p domain.Pelanggaran
	err := r.db.Preload("Siswa").Preload("Reporter").First(&p, id).Error
	return &p, err
}

func (r *pelanggaranRepository) List(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Pelanggaran], error) {
	var list []domain.Pelanggaran
	tx := r.db.Model(&domain.Pelanggaran{}).Preload("Siswa").Preload("Reporter")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if param.Search != "" {
		tx = tx.Where("nama_pelanggaran ILIKE ? OR keterangan ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Pelanggaran]{Data: list, Meta: meta}, nil
}

func (r *pelanggaranRepository) SumPointsBySiswaID(siswaID uint) (int, error) {
	var sum int
	err := r.db.Model(&domain.Pelanggaran{}).Where("siswa_id = ?", siswaID).Select("COALESCE(SUM(poin), 0)").Scan(&sum).Error
	return sum, err
}

// ----------------------------------------------------
// PRESTASI REPOSITORY
// ----------------------------------------------------
type prestasiRepository struct {
	db *gorm.DB
}

func NewPrestasiRepository(db *gorm.DB) domain.PrestasiRepository {
	return &prestasiRepository{db}
}

func (r *prestasiRepository) Create(p *domain.Prestasi) error {
	return r.db.Create(p).Error
}

func (r *prestasiRepository) Update(p *domain.Prestasi) error {
	return r.db.Save(p).Error
}

func (r *prestasiRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Prestasi{}, id).Error
}

func (r *prestasiRepository) FindByID(id uint) (*domain.Prestasi, error) {
	var p domain.Prestasi
	err := r.db.Preload("Siswa").First(&p, id).Error
	return &p, err
}

func (r *prestasiRepository) List(param domain.PaginationParam, siswaID uint, kategori string) (*domain.PaginatedResult[domain.Prestasi], error) {
	var list []domain.Prestasi
	tx := r.db.Model(&domain.Prestasi{}).Preload("Siswa")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if kategori != "" {
		tx = tx.Where("kategori = ?", kategori)
	}
	if param.Search != "" {
		tx = tx.Where("nama_prestasi ILIKE ? OR keterangan ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Prestasi]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// TES PSIKOLOGI REPOSITORY
// ----------------------------------------------------
type tesPsikologiRepository struct {
	db *gorm.DB
}

func NewTesPsikologiRepository(db *gorm.DB) domain.TesPsikologiRepository {
	return &tesPsikologiRepository{db}
}

func (r *tesPsikologiRepository) Create(t *domain.TesPsikologi) error {
	return r.db.Create(t).Error
}

func (r *tesPsikologiRepository) Update(t *domain.TesPsikologi) error {
	return r.db.Save(t).Error
}

func (r *tesPsikologiRepository) Delete(id uint) error {
	return r.db.Delete(&domain.TesPsikologi{}, id).Error
}

func (r *tesPsikologiRepository) FindByID(id uint) (*domain.TesPsikologi, error) {
	var t domain.TesPsikologi
	err := r.db.Preload("Siswa").First(&t, id).Error
	return &t, err
}

func (r *tesPsikologiRepository) List(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.TesPsikologi], error) {
	var list []domain.TesPsikologi
	tx := r.db.Model(&domain.TesPsikologi{}).Preload("Siswa")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if param.Search != "" {
		tx = tx.Where("jenis_tes ILIKE ? OR hasil ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.TesPsikologi]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// PROYEK REPOSITORY
// ----------------------------------------------------
type proyekRepository struct {
	db *gorm.DB
}

func NewProyekRepository(db *gorm.DB) domain.ProyekRepository {
	return &proyekRepository{db}
}

func (r *proyekRepository) Create(p *domain.Proyek) error {
	return r.db.Create(p).Error
}

func (r *proyekRepository) Update(p *domain.Proyek) error {
	return r.db.Save(p).Error
}

func (r *proyekRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Proyek{}, id).Error
}

func (r *proyekRepository) FindByID(id uint) (*domain.Proyek, error) {
	var p domain.Proyek
	err := r.db.Preload("Kelas").First(&p, id).Error
	return &p, err
}

func (r *proyekRepository) List(param domain.PaginationParam, kelasID uint, status string) (*domain.PaginatedResult[domain.Proyek], error) {
	var list []domain.Proyek
	tx := r.db.Model(&domain.Proyek{}).Preload("Kelas")
	if kelasID > 0 {
		tx = tx.Where("kelas_id = ?", kelasID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if param.Search != "" {
		tx = tx.Where("nama_proyek ILIKE ? OR deskripsi ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Proyek]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// PERIZINAN REPOSITORY (SISWA)
// ----------------------------------------------------
type perizinanRepository struct {
	db *gorm.DB
}

func NewPerizinanRepository(db *gorm.DB) domain.PerizinanRepository {
	return &perizinanRepository{db}
}

func (r *perizinanRepository) Create(p *domain.Perizinan) error {
	return r.db.Create(p).Error
}

func (r *perizinanRepository) Update(p *domain.Perizinan) error {
	return r.db.Save(p).Error
}

func (r *perizinanRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Perizinan{}, id).Error
}

func (r *perizinanRepository) FindByID(id uint) (*domain.Perizinan, error) {
	var p domain.Perizinan
	err := r.db.Preload("Siswa").Preload("Siswa.Kelas").Preload("Approver").First(&p, id).Error
	return &p, err
}

func (r *perizinanRepository) List(param domain.PaginationParam, siswaID uint, status string) (*domain.PaginatedResult[domain.Perizinan], error) {
	var list []domain.Perizinan
	tx := r.db.Model(&domain.Perizinan{}).Preload("Siswa").Preload("Siswa.Kelas").Preload("Approver")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if param.Search != "" {
		tx = tx.Where("jenis_izin ILIKE ? OR keterangan ILIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Perizinan]{Data: list, Meta: meta}, nil
}

func (r *perizinanRepository) ListForApprover(param domain.PaginationParam, waliKelasID uint, mapelIDs []uint, status string) (*domain.PaginatedResult[domain.Perizinan], error) {
	var list []domain.Perizinan
	tx := r.db.Model(&domain.Perizinan{}).Preload("Siswa").Preload("Siswa.Kelas").Preload("Approver").Preload("Mapel")
	if waliKelasID > 0 && len(mapelIDs) > 0 {
		tx = tx.Where("wali_kelas_id = ? OR mapel_id IN ?", waliKelasID, mapelIDs)
	} else if waliKelasID > 0 {
		tx = tx.Where("wali_kelas_id = ?", waliKelasID)
	} else if len(mapelIDs) > 0 {
		tx = tx.Where("mapel_id IN ?", mapelIDs)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	tx = tx.Order("created_at DESC")
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Perizinan]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
type izinGuruRepository struct {
	db *gorm.DB
}

func NewIzinGuruRepository(db *gorm.DB) domain.IzinGuruRepository {
	return &izinGuruRepository{db}
}

func (r *izinGuruRepository) Create(p *domain.IzinGuru) error {
	return r.db.Create(p).Error
}

func (r *izinGuruRepository) Update(p *domain.IzinGuru) error {
	return r.db.Save(p).Error
}

func (r *izinGuruRepository) Delete(id uint) error {
	return r.db.Delete(&domain.IzinGuru{}, id).Error
}

func (r *izinGuruRepository) FindByID(id uint) (*domain.IzinGuru, error) {
	var p domain.IzinGuru
	err := r.db.Preload("Guru").Preload("Approver").First(&p, id).Error
	return &p, err
}

func (r *izinGuruRepository) List(param domain.PaginationParam, guruID uint, status string) (*domain.PaginatedResult[domain.IzinGuru], error) {
	var list []domain.IzinGuru
	tx := r.db.Model(&domain.IzinGuru{}).Preload("Guru").Preload("Approver")
	if guruID > 0 {
		tx = tx.Where("guru_id = ?", guruID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if param.Search != "" {
		tx = tx.Where("keterangan ILIKE ?", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.IzinGuru]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// NILAI REPOSITORY
// ----------------------------------------------------
type nilaiRepository struct {
	db *gorm.DB
}

func NewNilaiRepository(db *gorm.DB) domain.NilaiRepository {
	return &nilaiRepository{db}
}

func (r *nilaiRepository) Create(n *domain.Nilai) error {
	return r.db.Create(n).Error
}

func (r *nilaiRepository) Update(n *domain.Nilai) error {
	return r.db.Save(n).Error
}

func (r *nilaiRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Nilai{}, id).Error
}

func (r *nilaiRepository) FindByID(id uint) (*domain.Nilai, error) {
	var n domain.Nilai
	err := r.db.Preload("Siswa").Preload("Mapel").Preload("Guru").First(&n, id).Error
	return &n, err
}

func (r *nilaiRepository) List(param domain.PaginationParam, siswaID uint, mapelID uint, jenisNilai string) (*domain.PaginatedResult[domain.Nilai], error) {
	var list []domain.Nilai
	tx := r.db.Model(&domain.Nilai{}).Preload("Siswa").Preload("Mapel").Preload("Guru")
	if siswaID > 0 {
		tx = tx.Where("siswa_id = ?", siswaID)
	}
	if mapelID > 0 {
		tx = tx.Where("mapel_id = ?", mapelID)
	}
	if jenisNilai != "" {
		tx = tx.Where("jenis_nilai = ?", jenisNilai)
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Nilai]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// NOTIFIKASI REPOSITORY
// ----------------------------------------------------
type notifikasiRepository struct {
	db *gorm.DB
}

func NewNotifikasiRepository(db *gorm.DB) domain.NotifikasiRepository {
	return &notifikasiRepository{db}
}

func (r *notifikasiRepository) Create(n *domain.Notifikasi) error {
	return r.db.Create(n).Error
}

func (r *notifikasiRepository) Update(n *domain.Notifikasi) error {
	return r.db.Save(n).Error
}

func (r *notifikasiRepository) MarkAllAsRead(userID uint) error {
	return r.db.Model(&domain.Notifikasi{}).Where("user_id = ?", userID).Update("is_read", true).Error
}

func (r *notifikasiRepository) FindByID(id uint) (*domain.Notifikasi, error) {
	var n domain.Notifikasi
	err := r.db.First(&n, id).Error
	return &n, err
}

func (r *notifikasiRepository) List(param domain.PaginationParam, userID uint, isRead *bool) (*domain.PaginatedResult[domain.Notifikasi], error) {
	var list []domain.Notifikasi
	tx := r.db.Model(&domain.Notifikasi{})
	if userID > 0 {
		tx = tx.Where("user_id = ?", userID)
	}
	if isRead != nil {
		tx = tx.Where("is_read = ?", *isRead)
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Notifikasi]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// AUDIT LOG REPOSITORY
// ----------------------------------------------------
type auditLogRepository struct {
	db *gorm.DB
}

func NewAuditLogRepository(db *gorm.DB) domain.AuditLogRepository {
	return &auditLogRepository{db}
}

func (r *auditLogRepository) Create(l *domain.AuditLog) error {
	return r.db.Create(l).Error
}

func (r *auditLogRepository) List(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.AuditLog], error) {
	var list []domain.AuditLog
	tx := r.db.Model(&domain.AuditLog{}).Preload("User")
	if userID > 0 {
		tx = tx.Where("user_id = ?", userID)
	}
	if param.Search != "" {
		tx = tx.Where("aktivitas ILIKE ?", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.AuditLog]{Data: list, Meta: meta}, nil
}

// ----------------------------------------------------
// PESAN REPOSITORY
// ----------------------------------------------------
type pesanRepository struct {
	db *gorm.DB
}

func NewPesanRepository(db *gorm.DB) domain.PesanRepository {
	return &pesanRepository{db}
}

func (r *pesanRepository) Create(p *domain.Pesan) error {
	return r.db.Create(p).Error
}

func (r *pesanRepository) FindByID(id uint) (*domain.Pesan, error) {
	var p domain.Pesan
	err := r.db.Preload("DariUser").Preload("KeUser").First(&p, id).Error
	return &p, err
}

func (r *pesanRepository) ListInbox(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.Pesan], error) {
	var list []domain.Pesan
	tx := r.db.Model(&domain.Pesan{}).Preload("DariUser").Preload("KeUser").Where("ke_user_id = ?", userID).Order("created_at DESC")
	if param.Search != "" {
		tx = tx.Where("judul LIKE ? OR isi LIKE ?", "%"+param.Search+"%", "%"+param.Search+"%")
	}
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Pesan]{Data: list, Meta: meta}, nil
}

func (r *pesanRepository) ListSent(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.Pesan], error) {
	var list []domain.Pesan
	tx := r.db.Model(&domain.Pesan{}).Preload("DariUser").Preload("KeUser").Where("dari_user_id = ?", userID).Order("created_at DESC")
	meta, err := paginate(tx, param, &list)
	if err != nil {
		return nil, err
	}
	return &domain.PaginatedResult[domain.Pesan]{Data: list, Meta: meta}, nil
}

func (r *pesanRepository) MarkAsRead(id uint) error {
	return r.db.Model(&domain.Pesan{}).Where("id = ?", id).Update("is_read", true).Error
}

func (r *pesanRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Pesan{}, id).Error
}
