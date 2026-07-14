package service

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/asan14/jurnal-apps-backend/config"
	"github.com/asan14/jurnal-apps-backend/internal/domain"
	"github.com/asan14/jurnal-apps-backend/internal/dto"
	"github.com/asan14/jurnal-apps-backend/pkg/mailer"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// jakartaLoc is loaded once; falls back to UTC+7 fixed offset if tzdata missing.
var jakartaLoc *time.Location

func init() {
	var err error
	jakartaLoc, err = time.LoadLocation("Asia/Makassar")
	if err != nil {
		jakartaLoc = time.FixedZone("WITA", 8*60*60)
	}
}

// ─── Constants ───────────────────────────────────────────────────────────────
const (
	MaxHariMundurJurnal = 3  // Batas hari mundur input jurnal (tanpa approval)
	MaxJamPerHari       = 10 // Default max jam pelajaran per kelas per hari
)

// ─── JWT ──────────────────────────────────────────────────────────────────────
type JWTClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
type AuthService interface {
	Login(req dto.LoginRequest) (*dto.LoginResponse, error)
	RefreshToken(refreshToken string) (*dto.LoginResponse, error)
	GetProfile(userID uint) (*domain.User, error)
	ChangePassword(userID uint, req dto.ChangePasswordRequest) error
}

type authService struct {
	cfg       *config.Config
	userRepo  domain.UserRepository
	guruRepo  domain.GuruRepository
	siswaRepo domain.SiswaRepository
	ortuRepo  domain.OrangTuaRepository
	auditRepo domain.AuditLogRepository
}

func NewAuthService(cfg *config.Config, userRepo domain.UserRepository, guruRepo domain.GuruRepository, siswaRepo domain.SiswaRepository, ortuRepo domain.OrangTuaRepository, auditRepo domain.AuditLogRepository) AuthService {
	return &authService{cfg, userRepo, guruRepo, siswaRepo, ortuRepo, auditRepo}
}

func (s *authService) Login(req dto.LoginRequest) (*dto.LoginResponse, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, errors.New("username atau password salah")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("username atau password salah")
	}
	accessToken, _ := generateToken(s.cfg.JWTSecret, user.ID, user.Username, user.Role, 2*time.Hour)
	refreshToken, _ := generateToken(s.cfg.JWTSecret, user.ID, user.Username, user.Role, 7*24*time.Hour)
	_ = s.auditRepo.Create(&domain.AuditLog{UserID: &user.ID, Aktivitas: "Login", CreatedAt: time.Now()})
	return &dto.LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken, User: dto.UserResponse{ID: user.ID, Username: user.Username, Email: user.Email, Role: user.Role}}, nil
}

func (s *authService) RefreshToken(refreshToken string) (*dto.LoginResponse, error) {
	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}
	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	accessToken, _ := generateToken(s.cfg.JWTSecret, user.ID, user.Username, user.Role, 2*time.Hour)
	newRefreshToken, _ := generateToken(s.cfg.JWTSecret, user.ID, user.Username, user.Role, 7*24*time.Hour)
	return &dto.LoginResponse{AccessToken: accessToken, RefreshToken: newRefreshToken, User: dto.UserResponse{ID: user.ID, Username: user.Username, Email: user.Email, Role: user.Role}}, nil
}

func (s *authService) GetProfile(userID uint) (*domain.User, error) {
	return s.userRepo.FindByID(userID)
}

func (s *authService) ChangePassword(userID uint, req dto.ChangePasswordRequest) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return errors.New("password lama tidak sesuai")
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	user.Password = string(hashed)
	return s.userRepo.Update(user)
}

func generateToken(secret string, userID uint, username, role string, exp time.Duration) (string, error) {
	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(exp)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func generatePassword(length int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// ─── MASTER SERVICE ───────────────────────────────────────────────────────────
type MasterService interface {
	// Users
	GetDashboardStats() (map[string]int64, error)
	ResetUserPassword(userID uint) (string, error)
	// Jurusan
	CreateJurusan(req dto.JurusanCreateRequest) (*domain.Jurusan, error)
	UpdateJurusan(id uint, req dto.JurusanUpdateRequest) (*domain.Jurusan, error)
	DeleteJurusan(id uint) error
	GetJurusanByID(id uint) (*domain.Jurusan, error)
	ListJurusan(param domain.PaginationParam) (*domain.PaginatedResult[domain.Jurusan], error)
	// Kelas
	CreateKelas(req dto.KelasCreateRequest) (*domain.Kelas, error)
	UpdateKelas(id uint, req dto.KelasUpdateRequest) (*domain.Kelas, error)
	DeleteKelas(id uint) error
	GetKelasByID(id uint) (*domain.Kelas, error)
	ListKelas(param domain.PaginationParam, jurusanID uint) (*domain.PaginatedResult[domain.Kelas], error)
	// Mapel
	CreateMapel(req dto.MapelCreateRequest) (*domain.Mapel, error)
	UpdateMapel(id uint, req dto.MapelUpdateRequest) (*domain.Mapel, error)
	DeleteMapel(id uint) error
	GetMapelByID(id uint) (*domain.Mapel, error)
	ListMapel(param domain.PaginationParam) (*domain.PaginatedResult[domain.Mapel], error)
	// Guru
	CreateGuru(req dto.GuruCreateRequest) (*domain.Guru, error)
	UpdateGuru(id uint, req dto.GuruUpdateRequest) (*domain.Guru, error)
	DeleteGuru(id uint) error
	GetGuruByID(id uint) (*domain.Guru, error)
	ListGuru(param domain.PaginationParam, status string) (*domain.PaginatedResult[domain.Guru], error)
	// Siswa
	CreateSiswa(req dto.SiswaCreateRequest) (*domain.Siswa, error)
	UpdateSiswa(id uint, req dto.SiswaUpdateRequest) (*domain.Siswa, error)
	DeleteSiswa(id uint) error
	GetSiswaByID(id uint) (*domain.Siswa, error)
	ListSiswa(param domain.PaginationParam, kelasID uint, jurusanID uint, status string) (*domain.PaginatedResult[domain.Siswa], error)
	// OrangTua
	CreateOrangTua(req dto.OrangTuaCreateRequest) (*domain.OrangTua, error)
	UpdateOrangTua(id uint, req dto.OrangTuaUpdateRequest) (*domain.OrangTua, error)
	DeleteOrangTua(id uint) error
	GetOrangTuaByID(id uint) (*domain.OrangTua, error)
	ListOrangTua(param domain.PaginationParam) (*domain.PaginatedResult[domain.OrangTua], error)
	LinkParentAnak(ortuID, siswaID uint, hubungan string) error
	BuatAkunOrtuDariSiswa(siswaID uint, hubungan string) (map[string]interface{}, error)
	// Mengajar
	CreateMengajar(req dto.MengajarCreateRequest) (*domain.Mengajar, error)
	UpdateMengajar(id uint, req dto.MengajarUpdateRequest) (*domain.Mengajar, error)
	DeleteMengajar(id uint) error
	GetMengajarByID(id uint) (*domain.Mengajar, error)
	GetMengajarByGuru(guruID uint) ([]domain.Mengajar, error)
	ListMengajar(param domain.PaginationParam, guruID, kelasID uint) (*domain.PaginatedResult[domain.Mengajar], error)
}

type masterService struct {
	cfg          *config.Config
	userRepo     domain.UserRepository
	jurusanRepo  domain.JurusanRepository
	kelasRepo    domain.KelasRepository
	mapelRepo    domain.MapelRepository
	guruRepo     domain.GuruRepository
	siswaRepo    domain.SiswaRepository
	ortuRepo     domain.OrangTuaRepository
	anakOrtuRepo domain.AnakOrangTuaRepository
	mengajarRepo domain.MengajarRepository
}

func NewMasterService(cfg *config.Config, userRepo domain.UserRepository, jurusanRepo domain.JurusanRepository, kelasRepo domain.KelasRepository, mapelRepo domain.MapelRepository, guruRepo domain.GuruRepository, siswaRepo domain.SiswaRepository, ortuRepo domain.OrangTuaRepository, anakOrtuRepo domain.AnakOrangTuaRepository, mengajarRepo domain.MengajarRepository) MasterService {
	return &masterService{cfg, userRepo, jurusanRepo, kelasRepo, mapelRepo, guruRepo, siswaRepo, ortuRepo, anakOrtuRepo, mengajarRepo}
}

func (s *masterService) GetDashboardStats() (map[string]int64, error) {
	guruCount, _ := s.guruRepo.CountAll()
	siswaCount, _ := s.siswaRepo.CountAll()
	kelasCount, _ := s.kelasRepo.CountAll()
	return map[string]int64{"guru": guruCount, "siswa": siswaCount, "kelas": kelasCount}, nil
}

func (s *masterService) ResetUserPassword(userID uint) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", fmt.Errorf("user tidak ditemukan")
	}
	newPassword := generatePassword(10)
	hashed, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	user.Password = string(hashed)
	if err := s.userRepo.Update(user); err != nil {
		return "", err
	}
	// Kirim ke email jika ada
	if user.Email != "" {
		m := mailer.New(s.cfg)
		_ = m.SendPasswordReset(user.Email, user.NamaLengkap, user.Username, newPassword)
	}
	return newPassword, nil
}

func (s *masterService) CreateJurusan(req dto.JurusanCreateRequest) (*domain.Jurusan, error) {
	j := &domain.Jurusan{NamaJurusan: req.NamaJurusan, KodeJurusan: req.KodeJurusan}
	return j, s.jurusanRepo.Create(j)
}
func (s *masterService) UpdateJurusan(id uint, req dto.JurusanUpdateRequest) (*domain.Jurusan, error) {
	j, err := s.jurusanRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	j.NamaJurusan = req.NamaJurusan
	j.KodeJurusan = req.KodeJurusan
	return j, s.jurusanRepo.Update(j)
}
func (s *masterService) DeleteJurusan(id uint) error {
	if err := s.jurusanRepo.Delete(id); err != nil {
		if strings.Contains(err.Error(), "1451") || strings.Contains(err.Error(), "foreign key constraint") {
			return fmt.Errorf("DEACTIVATED: Jurusan masih digunakan oleh data kelas atau siswa. Hapus data terkait terlebih dahulu.")
		}
		return err
	}
	return nil
}
func (s *masterService) GetJurusanByID(id uint) (*domain.Jurusan, error) {
	return s.jurusanRepo.FindByID(id)
}
func (s *masterService) ListJurusan(param domain.PaginationParam) (*domain.PaginatedResult[domain.Jurusan], error) {
	return s.jurusanRepo.List(param)
}

func (s *masterService) CreateKelas(req dto.KelasCreateRequest) (*domain.Kelas, error) {
	k := &domain.Kelas{NamaKelas: req.NamaKelas, JurusanID: req.JurusanID, WaliKelasID: req.WaliKelasID, TahunAjaran: req.TahunAjaran}
	return k, s.kelasRepo.Create(k)
}
func (s *masterService) UpdateKelas(id uint, req dto.KelasUpdateRequest) (*domain.Kelas, error) {
	k, err := s.kelasRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	k.NamaKelas = req.NamaKelas
	k.JurusanID = req.JurusanID
	k.WaliKelasID = req.WaliKelasID
	k.TahunAjaran = req.TahunAjaran
	return k, s.kelasRepo.Update(k)
}
func (s *masterService) DeleteKelas(id uint) error {
	// Cek sebelum hapus — jika masih ada mengajar atau siswa aktif, tolak
	hasRef, err := s.kelasRepo.HasActiveReferences(id)
	if err != nil {
		return err
	}
	if hasRef {
		return fmt.Errorf("DEACTIVATED: Kelas masih memiliki data siswa, jadwal mengajar, atau jurnal terkait. Pindahkan/hapus data terkait terlebih dahulu sebelum menghapus kelas.")
	}
	return s.kelasRepo.Delete(id)
}
func (s *masterService) GetKelasByID(id uint) (*domain.Kelas, error) { return s.kelasRepo.FindByID(id) }
func (s *masterService) ListKelas(param domain.PaginationParam, jurusanID uint) (*domain.PaginatedResult[domain.Kelas], error) {
	return s.kelasRepo.List(param, jurusanID)
}

func (s *masterService) CreateMapel(req dto.MapelCreateRequest) (*domain.Mapel, error) {
	m := &domain.Mapel{NamaMapel: req.NamaMapel, KodeMapel: req.KodeMapel, Kelompok: req.Kelompok}
	return m, s.mapelRepo.Create(m)
}
func (s *masterService) UpdateMapel(id uint, req dto.MapelUpdateRequest) (*domain.Mapel, error) {
	m, err := s.mapelRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	m.NamaMapel = req.NamaMapel
	m.KodeMapel = req.KodeMapel
	m.Kelompok = req.Kelompok
	return m, s.mapelRepo.Update(m)
}
func (s *masterService) DeleteMapel(id uint) error {
	if err := s.mapelRepo.Delete(id); err != nil {
		if strings.Contains(err.Error(), "1451") || strings.Contains(err.Error(), "foreign key constraint") {
			return fmt.Errorf("DEACTIVATED: Mata pelajaran masih digunakan dalam jadwal mengajar atau penilaian. Hapus data terkait terlebih dahulu.")
		}
		return err
	}
	return nil
}
func (s *masterService) GetMapelByID(id uint) (*domain.Mapel, error) { return s.mapelRepo.FindByID(id) }
func (s *masterService) ListMapel(param domain.PaginationParam) (*domain.PaginatedResult[domain.Mapel], error) {
	return s.mapelRepo.List(param)
}

func (s *masterService) CreateGuru(req dto.GuruCreateRequest) (*domain.Guru, error) {
	if _, err := s.guruRepo.FindByNIP(req.NIP); err == nil {
		return nil, errors.New("NIP sudah terdaftar")
	}
	// Auto-generate password jika tidak diberikan
	plainPassword := req.Password
	if plainPassword == "" {
		plainPassword = generatePassword(10)
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	role := req.Role
	if role == "" || (role != "guru" && role != "guru_bk" && role != "wali_kelas") {
		role = "guru"
	}
	user := &domain.User{Username: req.Username, Email: req.Email, Password: string(hashed), Role: role}
	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("gagal membuat akun: %v", err)
	}
	guru := &domain.Guru{UserID: user.ID, NIP: req.NIP, Nama: req.Nama, Gelar: req.Gelar, Phone: req.Phone, Gender: req.Gender, Alamat: req.Alamat, Status: req.Status}
	if err := s.guruRepo.Create(guru); err != nil {
		return nil, err
	}
	// Kirim kredensial ke email guru
	if req.Email != "" {
		m := mailer.New(s.cfg)
		_ = m.SendCredentials(req.Email, req.Nama, req.Username, plainPassword, role)
	}
	return guru, nil
}
func (s *masterService) UpdateGuru(id uint, req dto.GuruUpdateRequest) (*domain.Guru, error) {
	g, err := s.guruRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	g.NIP = req.NIP
	g.Nama = req.Nama
	g.Gelar = req.Gelar
	g.Phone = req.Phone
	g.Gender = req.Gender
	g.Alamat = req.Alamat
	g.Status = req.Status
	if req.Email != "" {
		u, _ := s.userRepo.FindByID(g.UserID)
		if u != nil {
			u.Email = req.Email
			if req.Role != "" && (req.Role == "guru" || req.Role == "guru_bk" || req.Role == "wali_kelas") {
				u.Role = req.Role
			}
			_ = s.userRepo.Update(u)
		}
	}
	return g, s.guruRepo.Update(g)
}
func (s *masterService) DeleteGuru(id uint) error {
	// Coba hapus dulu. Jika gagal karena FK constraint (MySQL 1451),
	// non-aktifkan saja dan beri pesan jelas.
	err := s.guruRepo.Delete(id)
	if err == nil {
		return nil
	}
	// Cek apakah error adalah MySQL FK constraint violation (1451)
	if strings.Contains(err.Error(), "1451") || strings.Contains(err.Error(), "foreign key constraint") {
		if deactivateErr := s.guruRepo.Deactivate(id); deactivateErr != nil {
			return deactivateErr
		}
		return fmt.Errorf("DEACTIVATED: Guru memiliki data terkait di sistem (kelas, konseling, dll). Data guru telah dinonaktifkan, bukan dihapus. Hapus data terkait terlebih dahulu untuk menghapus permanen.")
	}
	return err
}
func (s *masterService) GetGuruByID(id uint) (*domain.Guru, error) { return s.guruRepo.FindByID(id) }
func (s *masterService) ListGuru(param domain.PaginationParam, status string) (*domain.PaginatedResult[domain.Guru], error) {
	return s.guruRepo.List(param, status)
}

func (s *masterService) CreateSiswa(req dto.SiswaCreateRequest) (*domain.Siswa, error) {
	nisn := req.NISN
	if nisn == "" {
		nisn = fmt.Sprintf("AUTO%d", time.Now().UnixNano()%1000000000)
	}
	nis := req.NIS
	if nis == "" {
		nis = fmt.Sprintf("NIS%d", time.Now().UnixNano()%100000)
	}
	// Username: gunakan req.Username jika ada, fallback ke NIS
	username := req.Username
	if username == "" {
		username = nis
	}
	// Password: auto-generate selalu
	pwd := generatePassword(10)
	hashed, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	// Email: gunakan email asli jika ada, fallback ke local
	email := req.Email
	if email == "" {
		email = fmt.Sprintf("%s@siswa.local", nis)
	}
	user := &domain.User{Username: username, Email: email, Password: string(hashed), Role: "siswa"}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	siswa := &domain.Siswa{
		UserID: user.ID, NISN: nisn, NIS: nis, Nama: req.Nama,
		KelasID: req.KelasID, JurusanID: req.JurusanID, Phone: req.Phone,
		Gender: req.Gender, Alamat: req.Alamat, Status: req.Status,
		NamaAyah: req.NamaAyah, NamaIbu: req.NamaIbu,
		PekerjaanOrtu: req.PekerjaanOrtu, WAOrtu: req.WAOrtu,
		Instagram: req.Instagram, Youtube: req.Youtube,
	}
	if req.Status == "" {
		siswa.Status = "Aktif"
	}
	if req.TahunMasuk > 0 {
		siswa.TahunMasuk = req.TahunMasuk
	}
	if err := s.siswaRepo.Create(siswa); err != nil {
		return nil, err
	}
	// Kirim kredensial ke email siswa jika email valid (bukan @siswa.local)
	if req.Email != "" && !strings.HasSuffix(req.Email, "@siswa.local") {
		m := mailer.New(s.cfg)
		_ = m.SendCredentials(req.Email, req.Nama, username, pwd, "siswa")
	}
	return siswa, nil
}
func (s *masterService) UpdateSiswa(id uint, req dto.SiswaUpdateRequest) (*domain.Siswa, error) {
	sv, err := s.siswaRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	sv.Nama = req.Nama
	sv.KelasID = req.KelasID
	sv.JurusanID = req.JurusanID
	sv.Phone = req.Phone
	sv.Gender = req.Gender
	sv.Alamat = req.Alamat
	sv.Status = req.Status
	if req.NISN != "" {
		sv.NISN = req.NISN
	}
	if req.NIS != "" {
		sv.NIS = req.NIS
	}
	if req.TahunMasuk > 0 {
		sv.TahunMasuk = req.TahunMasuk
	}
	// Update extended fields
	if req.FotoURL != "" {
		sv.FotoURL = req.FotoURL
	}
	if req.Instagram != "" {
		sv.Instagram = req.Instagram
	}
	if req.Youtube != "" {
		sv.Youtube = req.Youtube
	}
	if req.NamaAyah != "" {
		sv.NamaAyah = req.NamaAyah
	}
	if req.NamaIbu != "" {
		sv.NamaIbu = req.NamaIbu
	}
	if req.PekerjaanOrtu != "" {
		sv.PekerjaanOrtu = req.PekerjaanOrtu
	}
	if req.WAOrtu != "" {
		sv.WAOrtu = req.WAOrtu
	}
	if req.PendapatanOrtu > 0 {
		sv.PendapatanOrtu = req.PendapatanOrtu
	}
	// Update email via user
	if req.Email != "" {
		u, _ := s.userRepo.FindByID(sv.UserID)
		if u != nil && u.Email != req.Email {
			u.Email = req.Email
			_ = s.userRepo.Update(u)
		}
	}
	return sv, s.siswaRepo.Update(sv)
}
func (s *masterService) DeleteSiswa(id uint) error {
	if err := s.siswaRepo.Delete(id); err != nil {
		if strings.Contains(err.Error(), "1451") || strings.Contains(err.Error(), "foreign key constraint") {
			if deactivateErr := s.siswaRepo.Deactivate(id); deactivateErr != nil {
				return deactivateErr
			}
			return fmt.Errorf("DEACTIVATED: Siswa memiliki data absensi, nilai, atau catatan BK. Data siswa telah dinonaktifkan, bukan dihapus.")
		}
		return err
	}
	return nil
}
func (s *masterService) GetSiswaByID(id uint) (*domain.Siswa, error) { return s.siswaRepo.FindByID(id) }
func (s *masterService) ListSiswa(param domain.PaginationParam, kelasID uint, jurusanID uint, status string) (*domain.PaginatedResult[domain.Siswa], error) {
	return s.siswaRepo.List(param, kelasID, jurusanID, status)
}

func (s *masterService) CreateOrangTua(req dto.OrangTuaCreateRequest) (*domain.OrangTua, error) {
	pwd := generatePassword(8)
	hashed, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	uname := fmt.Sprintf("ortu%d", time.Now().UnixNano()%100000)
	user := &domain.User{Username: uname, Email: req.Email, Password: string(hashed), Role: "orang_tua"}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	o := &domain.OrangTua{UserID: user.ID, Nama: req.Nama, Phone: req.Phone, Pekerjaan: req.Pekerjaan, Alamat: req.Alamat}
	return o, s.ortuRepo.Create(o)
}
func (s *masterService) UpdateOrangTua(id uint, req dto.OrangTuaUpdateRequest) (*domain.OrangTua, error) {
	o, err := s.ortuRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	o.Nama = req.Nama
	o.Phone = req.Phone
	o.Pekerjaan = req.Pekerjaan
	o.Alamat = req.Alamat
	return o, s.ortuRepo.Update(o)
}
func (s *masterService) DeleteOrangTua(id uint) error { return s.ortuRepo.Delete(id) }
func (s *masterService) GetOrangTuaByID(id uint) (*domain.OrangTua, error) {
	return s.ortuRepo.FindByID(id)
}
func (s *masterService) ListOrangTua(param domain.PaginationParam) (*domain.PaginatedResult[domain.OrangTua], error) {
	return s.ortuRepo.List(param)
}
func (s *masterService) LinkParentAnak(ortuID, siswaID uint, hubungan string) error {
	return s.anakOrtuRepo.Create(&domain.AnakOrangTua{OrangTuaID: ortuID, SiswaID: siswaID, Hubungan: hubungan})
}

func (s *masterService) BuatAkunOrtuDariSiswa(siswaID uint, hubungan string) (map[string]interface{}, error) {
	siswa, err := s.siswaRepo.FindByID(siswaID)
	if err != nil {
		return nil, fmt.Errorf("siswa tidak ditemukan")
	}
	var namaOrtu string
	switch hubungan {
	case "Ayah":
		namaOrtu = siswa.NamaAyah
	case "Ibu":
		namaOrtu = siswa.NamaIbu
	default:
		namaOrtu = hubungan + " " + siswa.Nama
	}
	if namaOrtu == "" {
		namaOrtu = hubungan + " " + siswa.Nama
	}
	// Build unique username
	hubSuffix := strings.ToLower(hubungan)
	uname := fmt.Sprintf("ortu_%s_%s", siswa.NIS, hubSuffix)
	// Check existing
	existing, _ := s.userRepo.FindByUsername(uname)
	if existing != nil {
		// Already exists – return info to resend
		ortu, _ := s.ortuRepo.FindByUserID(existing.ID)
		result := map[string]interface{}{
			"username":       uname,
			"password":       "(sudah ada – gunakan reset password jika lupa)",
			"wa_ortu":        siswa.WAOrtu,
			"nama_ortu":      namaOrtu,
			"nama_siswa":     siswa.Nama,
			"already_exists": true,
		}
		if ortu != nil {
			result["ortu_id"] = ortu.ID
		}
		return result, nil
	}
	// Generate credentials
	pwd := generatePassword(10)
	hashed, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	email := fmt.Sprintf("%s@ortu.jurnal.sch.id", uname)
	user := &domain.User{
		Username:    uname,
		Email:       email,
		Password:    string(hashed),
		Role:        "orang_tua",
		NamaLengkap: namaOrtu,
		Phone:       siswa.WAOrtu,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("gagal membuat akun: %v", err)
	}
	ortu := &domain.OrangTua{
		UserID:    user.ID,
		Nama:      namaOrtu,
		Phone:     siswa.WAOrtu,
		Pekerjaan: siswa.PekerjaanOrtu,
	}
	if err := s.ortuRepo.Create(ortu); err != nil {
		return nil, fmt.Errorf("gagal membuat data ortu: %v", err)
	}
	// Link
	_ = s.anakOrtuRepo.Create(&domain.AnakOrangTua{OrangTuaID: ortu.ID, SiswaID: siswaID, Hubungan: hubungan})
	return map[string]interface{}{
		"username":       uname,
		"password":       pwd,
		"wa_ortu":        siswa.WAOrtu,
		"nama_ortu":      namaOrtu,
		"nama_siswa":     siswa.Nama,
		"already_exists": false,
	}, nil
}

func (s *masterService) CreateMengajar(req dto.MengajarCreateRequest) (*domain.Mengajar, error) {
	m := &domain.Mengajar{GuruID: req.GuruID, MapelID: req.MapelID, KelasID: req.KelasID, TahunAjaran: req.TahunAjaran, Semester: req.Semester, JamKe: req.JamKe, Hari: req.Hari}
	return m, s.mengajarRepo.Create(m)
}
func (s *masterService) UpdateMengajar(id uint, req dto.MengajarUpdateRequest) (*domain.Mengajar, error) {
	m, err := s.mengajarRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	m.GuruID = req.GuruID
	m.MapelID = req.MapelID
	m.KelasID = req.KelasID
	m.TahunAjaran = req.TahunAjaran
	m.Semester = req.Semester
	m.JamKe = req.JamKe
	m.Hari = req.Hari
	return m, s.mengajarRepo.Update(m)
}
func (s *masterService) DeleteMengajar(id uint) error { return s.mengajarRepo.Delete(id) }
func (s *masterService) GetMengajarByID(id uint) (*domain.Mengajar, error) {
	return s.mengajarRepo.FindByID(id)
}
func (s *masterService) GetMengajarByGuru(guruID uint) ([]domain.Mengajar, error) {
	return s.mengajarRepo.ListByGuru(guruID)
}
func (s *masterService) ListMengajar(param domain.PaginationParam, guruID, kelasID uint) (*domain.PaginatedResult[domain.Mengajar], error) {
	return s.mengajarRepo.List(param, guruID, kelasID)
}

// ─── JURNAL SERVICE ───────────────────────────────────────────────────────────
type JurnalService interface {
	CreateJurnal(req dto.JurnalCreateRequest, guruID uint) (*domain.Jurnal, error)
	UpdateJurnal(id uint, req dto.JurnalUpdateRequest, guruID uint) (*domain.Jurnal, error)
	DeleteJurnal(id uint, guruID uint, isAdmin bool) error
	GetJurnalByID(id uint) (*domain.Jurnal, error)
	ListJurnal(param domain.PaginationParam, guruID, kelasID, mapelID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Jurnal], error)
	GetPresensiByJurnalID(jurnalID uint) ([]domain.Absensi, error)
	// Request Jurnal Mundur
	AjukanRequestMundur(req dto.RequestJurnalMundurRequest, guruID uint) (*domain.RequestJurnalMundur, error)
	ReviewRequestMundur(id uint, req dto.ReviewRequestJurnalMundurRequest) error
	ListRequestMundur(param domain.PaginationParam, guruID uint, status string) (*domain.PaginatedResult[domain.RequestJurnalMundur], error)
	// Kehadiran Guru
	CreateKehadiranGuru(req dto.KehadiranGuruRequest) (*domain.KehadiranGuru, error)
	DeleteKehadiranGuru(id uint) error
	ListKehadiranGuru(param domain.PaginationParam, guruID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.KehadiranGuru], error)
}

type jurnalService struct {
	jurnalRepo    domain.JurnalRepository
	absensiRepo   domain.AbsensiRepository
	mengajarRepo  domain.MengajarRepository
	siswaRepo     domain.SiswaRepository
	liburRepo     domain.HariLiburRepository
	jamKhususRepo domain.JamKhususRepository
	kehadiranRepo domain.KehadiranGuruRepository
	requestRepo   domain.RequestJurnalMundurRepository
	guruRepo      domain.GuruRepository
	pesanRepo     domain.PesanRepository
	userRepo      domain.UserRepository
}

func NewJurnalService(
	jurnalRepo domain.JurnalRepository,
	absensiRepo domain.AbsensiRepository,
	mengajarRepo domain.MengajarRepository,
	siswaRepo domain.SiswaRepository,
	liburRepo domain.HariLiburRepository,
	jamKhususRepo domain.JamKhususRepository,
	kehadiranRepo domain.KehadiranGuruRepository,
	requestRepo domain.RequestJurnalMundurRepository,
	guruRepo domain.GuruRepository,
	pesanRepo domain.PesanRepository,
	userRepo domain.UserRepository,
) JurnalService {
	return &jurnalService{jurnalRepo, absensiRepo, mengajarRepo, siswaRepo, liburRepo, jamKhususRepo, kehadiranRepo, requestRepo, guruRepo, pesanRepo, userRepo}
}

// hitungJumlahJam parses "1" → 1, "1-3" → 3, "2-5" → 4
func hitungJumlahJam(jamKe string) int {
	parts := strings.Split(jamKe, "-")
	if len(parts) == 1 {
		return 1
	}
	start, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	end, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 == nil && err2 == nil && end >= start {
		return end - start + 1
	}
	return 1
}

func (s *jurnalService) CreateJurnal(req dto.JurnalCreateRequest, guruID uint) (*domain.Jurnal, error) {
	tgl, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		return nil, errors.New("format tanggal tidak valid, gunakan YYYY-MM-DD")
	}

	// Ambil data mengajar untuk kelas_id
	mengajar, err := s.mengajarRepo.FindByID(req.MengajarID)
	if err != nil {
		return nil, errors.New("jadwal mengajar tidak ditemukan")
	}
	kelasID := mengajar.KelasID

	// ── LAYER 1: Cek Hari Libur ──────────────────────────────────────────────
	libur, _ := s.liburRepo.FindByDateAndKelas(tgl, kelasID)
	if libur != nil {
		namaLibur := libur.NamaLibur
		if namaLibur == "" {
			namaLibur = libur.Keterangan
		}
		return nil, fmt.Errorf("tidak dapat mengisi jurnal: tanggal %s adalah hari libur (%s — %s)", req.Tanggal, libur.Jenis, namaLibur)
	}

	// ── LAYER 2: Cek Status Kehadiran Guru ───────────────────────────────────
	kehadiran, _ := s.kehadiranRepo.FindByGuruAndTanggal(guruID, tgl)
	if kehadiran != nil {
		return nil, fmt.Errorf("tidak dapat mengisi jurnal: guru tercatat %s (%s)", kehadiran.StatusKehadiran, kehadiran.Keterangan)
	}

	// ── LAYER 3: Cek Batas Tanggal Mundur ────────────────────────────────────
	batas := time.Now().AddDate(0, 0, -MaxHariMundurJurnal).Truncate(24 * time.Hour)
	if tgl.Before(batas) {
		// Cek apakah ada approval request
		_, errApproval := s.requestRepo.FindApproved(guruID, req.MengajarID, tgl)
		if errApproval != nil {
			return nil, fmt.Errorf("tanggal %s melebihi batas input mundur (%d hari). Ajukan request jurnal mundur terlebih dahulu", req.Tanggal, MaxHariMundurJurnal)
		}
	}

	// ── LAYER 4: Cek Duplikat Jurnal ─────────────────────────────────────────
	existing, _ := s.jurnalRepo.FindByMengajarAndTanggal(req.MengajarID, tgl)
	if existing != nil {
		return nil, errors.New("jurnal untuk jadwal dan tanggal ini sudah pernah diisi")
	}

	// ── LAYER 5: Cek Batas Jam Per Hari ──────────────────────────────────────
	maxJam := MaxJamPerHari
	jamKhusus, _ := s.jamKhususRepo.FindByTanggal(tgl, &kelasID)
	if jamKhusus != nil && jamKhusus.MaxJam > 0 {
		maxJam = jamKhusus.MaxJam
	}
	totalTerisi, _ := s.jurnalRepo.SumJamByKelasAndTanggal(kelasID, tgl)
	jamInput := hitungJumlahJam(req.JamKe)
	if totalTerisi+jamInput > maxJam {
		alasan := ""
		if jamKhusus != nil {
			alasan = fmt.Sprintf(" (alasan: %s)", jamKhusus.Alasan)
		}
		return nil, fmt.Errorf("batas jam per hari terlampaui: sudah %d/%d jam terisi, input %d jam%s", totalTerisi, maxJam, jamInput, alasan)
	}

	// ── INSERT ────────────────────────────────────────────────────────────────
	jurnal := &domain.Jurnal{
		MengajarID:  req.MengajarID,
		Tanggal:     tgl,
		JamKe:       req.JamKe,
		TopikMateri: req.TopikMateri,
		CatatanGuru: req.CatatanGuru,
	}
	if err := s.jurnalRepo.Create(jurnal); err != nil {
		return nil, err
	}

	// Batch insert presensi siswa
	if len(req.Presensi) > 0 {
		var presensiList []domain.Absensi
		for _, p := range req.Presensi {
			presensiList = append(presensiList, domain.Absensi{
				JurnalID:        &jurnal.ID,
				SiswaID:         p.SiswaID,
				StatusKehadiran: p.StatusKehadiran,
				Keterangan:      p.Keterangan,
			})
		}
		if err := s.absensiRepo.CreateBatch(presensiList); err != nil {
			_ = s.jurnalRepo.Delete(jurnal.ID) // rollback
			return nil, err
		}
	}

	return jurnal, nil
}

func (s *jurnalService) UpdateJurnal(id uint, req dto.JurnalUpdateRequest, guruID uint) (*domain.Jurnal, error) {
	jurnal, err := s.jurnalRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("jurnal tidak ditemukan")
	}
	// Ownership check (admin passes guruID=0 to skip)
	if guruID > 0 && jurnal.Mengajar.GuruID != guruID {
		return nil, errors.New("aksi ditolak: jurnal ini bukan milik Anda")
	}

	jurnal.JamKe = req.JamKe
	jurnal.TopikMateri = req.TopikMateri
	jurnal.CatatanGuru = req.CatatanGuru
	if err := s.jurnalRepo.Update(jurnal); err != nil {
		return nil, err
	}

	// Update presensi: delete existing, re-insert
	if len(req.Presensi) > 0 {
		existing, _ := s.absensiRepo.GetByJurnalID(id)
		for _, a := range existing {
			_ = s.absensiRepo.Delete(a.ID)
		}
		var list []domain.Absensi
		for _, p := range req.Presensi {
			list = append(list, domain.Absensi{
				JurnalID:        &jurnal.ID,
				SiswaID:         p.SiswaID,
				StatusKehadiran: p.StatusKehadiran,
				Keterangan:      p.Keterangan,
			})
		}
		_ = s.absensiRepo.CreateBatch(list)
	}
	return jurnal, nil
}

func (s *jurnalService) DeleteJurnal(id uint, guruID uint, isAdmin bool) error {
	if !isAdmin {
		jurnal, err := s.jurnalRepo.FindByID(id)
		if err != nil {
			return errors.New("jurnal tidak ditemukan")
		}
		if jurnal.Mengajar.GuruID != guruID {
			return errors.New("aksi ditolak: jurnal ini bukan milik Anda")
		}
	}
	return s.jurnalRepo.Delete(id)
}

func (s *jurnalService) GetJurnalByID(id uint) (*domain.Jurnal, error) {
	return s.jurnalRepo.FindByID(id)
}

func (s *jurnalService) ListJurnal(param domain.PaginationParam, guruID, kelasID, mapelID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Jurnal], error) {
	return s.jurnalRepo.List(param, guruID, kelasID, mapelID, startDate, endDate)
}

func (s *jurnalService) GetPresensiByJurnalID(jurnalID uint) ([]domain.Absensi, error) {
	return s.absensiRepo.GetByJurnalID(jurnalID)
}

func (s *jurnalService) AjukanRequestMundur(req dto.RequestJurnalMundurRequest, userID uint) (*domain.RequestJurnalMundur, error) {
	tgl, err := time.Parse("2006-01-02", req.TanggalJurnal)
	if err != nil {
		return nil, errors.New("format tanggal tidak valid")
	}
	// Resolve userID → guru_id
	guru, err := s.guruRepo.FindByUserID(userID)
	if err != nil || guru == nil {
		return nil, errors.New("profil guru tidak ditemukan untuk akun ini")
	}
	r := &domain.RequestJurnalMundur{
		GuruID:        guru.ID,
		MengajarID:    req.MengajarID,
		TanggalJurnal: tgl,
		Alasan:        req.Alasan,
		Status:        "pending",
	}
	if createErr := s.requestRepo.Create(r); createErr != nil {
		return nil, createErr
	}
	// Kirim notifikasi pesan ke semua admin
	admins, _ := s.userRepo.FindByRole("admin")
	for _, adm := range admins {
		_ = s.pesanRepo.Create(&domain.Pesan{
			DariUserID: userID,
			KeUserID:   adm.ID,
			Judul:      "[Request Jurnal Mundur] " + guru.Nama,
			Isi:        fmt.Sprintf("Guru %s mengajukan request jurnal mundur untuk tanggal %s.\nAlasan: %s\n\nSilakan review di menu Jurnal → Request Mundur.", guru.Nama, req.TanggalJurnal, req.Alasan),
		})
	}
	return r, nil
}

func (s *jurnalService) ReviewRequestMundur(id uint, req dto.ReviewRequestJurnalMundurRequest) error {
	r, err := s.requestRepo.FindByID(id)
	if err != nil {
		return errors.New("request tidak ditemukan")
	}
	r.Status = req.Status
	r.AdminCatatan = req.AdminCatatan
	if updateErr := s.requestRepo.Update(r); updateErr != nil {
		return updateErr
	}
	// Kirim notifikasi balik ke guru
	guru, errG := s.guruRepo.FindByID(r.GuruID)
	if errG == nil && guru != nil && guru.UserID > 0 {
		statusLabel := "Disetujui ✅"
		if req.Status == "rejected" {
			statusLabel = "Ditolak ❌"
		}
		catatan := ""
		if req.AdminCatatan != "" {
			catatan = "\nCatatan admin: " + req.AdminCatatan
		}
		// Cari user admin yang melakukan review (ambil admin pertama sebagai pengirim)
		admins, _ := s.userRepo.FindByRole("admin")
		var adminUserID uint = 1
		if len(admins) > 0 {
			adminUserID = admins[0].ID
		}
		_ = s.pesanRepo.Create(&domain.Pesan{
			DariUserID: adminUserID,
			KeUserID:   guru.UserID,
			Judul:      fmt.Sprintf("[Request Jurnal Mundur] %s", statusLabel),
			Isi:        fmt.Sprintf("Request jurnal mundur Anda untuk tanggal %s telah %s.%s\n\nAnda sekarang dapat mengisi jurnal untuk tanggal tersebut.", r.TanggalJurnal.Format("2006-01-02"), statusLabel, catatan),
		})
	}
	return nil
}

func (s *jurnalService) ListRequestMundur(param domain.PaginationParam, guruID uint, status string) (*domain.PaginatedResult[domain.RequestJurnalMundur], error) {
	return s.requestRepo.List(param, guruID, status)
}

func (s *jurnalService) CreateKehadiranGuru(req dto.KehadiranGuruRequest) (*domain.KehadiranGuru, error) {
	tgl, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		return nil, errors.New("format tanggal tidak valid")
	}
	k := &domain.KehadiranGuru{
		GuruID:          req.GuruID,
		Tanggal:         tgl,
		StatusKehadiran: req.StatusKehadiran,
		Keterangan:      req.Keterangan,
	}
	return k, s.kehadiranRepo.Create(k)
}

func (s *jurnalService) DeleteKehadiranGuru(id uint) error {
	return s.kehadiranRepo.Delete(id)
}

func (s *jurnalService) ListKehadiranGuru(param domain.PaginationParam, guruID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.KehadiranGuru], error) {
	return s.kehadiranRepo.List(param, guruID, startDate, endDate)
}

// ─── ATTENDANCE SERVICE ───────────────────────────────────────────────────────
type AttendanceService interface {
	ScanTeacherQR(req dto.ScanQRAttendanceRequest, ip, ua string) (*domain.AbsensiGuru, error)
	ScanStudentQR(req dto.ScanQRAttendanceRequest, ip, ua string) (*domain.Absensi, error)
	SelfCheckInGuru(userID uint, lat, lng float64, ip, ua string) (*domain.AbsensiGuru, error)
	GetGuruAttendanceStatus(guruID uint) (*dto.AttendanceStatusResponse, error)
	ListStudentAttendanceByUserID(param domain.PaginationParam, userID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.Absensi], error)
	ListTeacherAttendance(param domain.PaginationParam, guruID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.AbsensiGuru], error)
	ListStudentAttendance(param domain.PaginationParam, siswaID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.Absensi], error)
	// Hari Libur
	CreateHariLibur(req dto.HariLiburRequest) error
	GetHolidays(param domain.PaginationParam) (*domain.PaginatedResult[domain.HariLibur], error)
	GetHolidaysByBulan(year, month int) ([]domain.HariLibur, error)
	DeleteHoliday(id uint) error
	// Jam Khusus
	CreateJamKhusus(req dto.JamKhususRequest) error
	GetJamKhususByBulan(year, month int) ([]domain.JamKhusus, error)
	DeleteJamKhusus(id uint) error
	// Pengaturan Jam
	GetTimeConfig(tipe string) (*domain.PengaturanJam, error)
	UpdateTimeConfig(tipe string, req dto.PengaturanJamRequest) error
}

type attendanceService struct {
	db            *gorm.DB
	absGuruRepo   domain.AbsensiGuruRepository
	absSiswaRepo  domain.AbsensiRepository
	guruRepo      domain.GuruRepository
	siswaRepo     domain.SiswaRepository
	liburRepo     domain.HariLiburRepository
	jamRepo       domain.PengaturanJamRepository
	jamKhususRepo domain.JamKhususRepository
	jurnalRepo    domain.JurnalRepository
	auditRepo     domain.AuditLogRepository
}

func NewAttendanceService(db *gorm.DB, absGuruRepo domain.AbsensiGuruRepository, absSiswaRepo domain.AbsensiRepository, guruRepo domain.GuruRepository, siswaRepo domain.SiswaRepository, liburRepo domain.HariLiburRepository, jamRepo domain.PengaturanJamRepository, jamKhususRepo domain.JamKhususRepository, jurnalRepo domain.JurnalRepository, auditRepo domain.AuditLogRepository) AttendanceService {
	return &attendanceService{db, absGuruRepo, absSiswaRepo, guruRepo, siswaRepo, liburRepo, jamRepo, jamKhususRepo, jurnalRepo, auditRepo}
}

func (s *attendanceService) GetGuruAttendanceStatus(guruID uint) (*dto.AttendanceStatusResponse, error) {
	now := time.Now().In(jakartaLoc)
	todayDate, _ := time.ParseInLocation("2006-01-02", now.Format("2006-01-02"), jakartaLoc)
	record, err := s.absGuruRepo.FindByGuruAndDate(guruID, todayDate)
	if err != nil {
		return &dto.AttendanceStatusResponse{AlreadyCheckedIn: false, AlreadyCheckedOut: false, Status: "Belum Absen"}, nil
	}
	resp := &dto.AttendanceStatusResponse{
		AlreadyCheckedIn:  record.JamMasuk != nil,
		AlreadyCheckedOut: record.JamPulang != nil,
		CheckInTime:       record.JamMasuk,
		CheckOutTime:      record.JamPulang,
		Status:            record.Status,
	}
	return resp, nil
}

func (s *attendanceService) ScanTeacherQR(req dto.ScanQRAttendanceRequest, ip, ua string) (*domain.AbsensiGuru, error) {
	parts := strings.Split(req.QRCode, ":")
	if len(parts) < 3 || parts[0] != "JURNAL_QR" || parts[1] != "guru" {
		return nil, errors.New("invalid QR Code format")
	}
	guruIDUint, err := strconv.ParseUint(parts[2], 10, 32)
	if err != nil {
		return nil, errors.New("invalid QR Code content")
	}
	guruID := uint(guruIDUint)
	guru, err := s.guruRepo.FindByID(guruID)
	if err != nil {
		return nil, errors.New("guru profile not found")
	}

	now := time.Now().In(jakartaLoc)
	todayStr := now.Format("2006-01-02")
	todayDate, _ := time.ParseInLocation("2006-01-02", todayStr, jakartaLoc)

	libur, _ := s.liburRepo.FindByDate(todayDate)
	if libur != nil {
		return nil, fmt.Errorf("hari ini libur: %s", libur.NamaLibur)
	}

	cfg, err := s.jamRepo.FindByTipe("Guru")
	if err != nil {
		return nil, errors.New("attendance settings not configured")
	}
	currTimeStr := now.Format("15:04")

	record, err := s.absGuruRepo.FindByGuruAndDate(guruID, todayDate)
	if err != nil {
		if currTimeStr < cfg.JamMasukMulai {
			return nil, fmt.Errorf("belum waktu masuk. Absen masuk mulai jam %s", cfg.JamMasukMulai)
		}
		status := "Hadir"
		if currTimeStr > cfg.JamMasukSelesai {
			status = "Terlambat"
		}
		record = &domain.AbsensiGuru{GuruID: guruID, Tanggal: todayDate, JamMasuk: &now, Status: status, Keterangan: "Check-in via QR", Latitude: req.Latitude, Longitude: req.Longitude}
		if err := s.absGuruRepo.Create(record); err != nil {
			return nil, err
		}
		_ = s.auditRepo.Create(&domain.AuditLog{UserID: &guru.UserID, Aktivitas: fmt.Sprintf("Absen Masuk - %s", status), IPAddress: ip, UserAgent: ua, CreatedAt: time.Now()})
		return record, nil
	}
	if record.JamPulang != nil {
		return nil, errors.New("anda sudah absen pulang hari ini")
	}
	if currTimeStr < cfg.JamPulangMulai {
		return nil, fmt.Errorf("belum waktu pulang. Mulai jam %s", cfg.JamPulangMulai)
	}
	record.JamPulang = &now
	_ = s.absGuruRepo.Update(record)
	_ = s.auditRepo.Create(&domain.AuditLog{UserID: &guru.UserID, Aktivitas: "Absen Pulang", IPAddress: ip, UserAgent: ua, CreatedAt: time.Now()})
	return record, nil
}

func (s *attendanceService) ScanStudentQR(req dto.ScanQRAttendanceRequest, ip, ua string) (*domain.Absensi, error) {
	parts := strings.Split(req.QRCode, ":")
	if len(parts) < 3 || parts[0] != "JURNAL_QR" || parts[1] != "siswa" {
		return nil, errors.New("invalid QR Code format")
	}
	siswaIDUint, err := strconv.ParseUint(parts[2], 10, 32)
	if err != nil {
		return nil, errors.New("invalid QR Code content")
	}
	siswaID := uint(siswaIDUint)

	now := time.Now().In(jakartaLoc)
	todayDate, _ := time.ParseInLocation("2006-01-02", now.Format("2006-01-02"), jakartaLoc)

	libur, _ := s.liburRepo.FindByDate(todayDate)
	if libur != nil {
		return nil, fmt.Errorf("hari ini libur: %s", libur.NamaLibur)
	}

	cfg, err := s.jamRepo.FindByTipe("Siswa")
	if err != nil {
		return nil, errors.New("attendance settings not configured")
	}
	if now.Format("15:04") < cfg.JamMasukMulai {
		return nil, fmt.Errorf("belum waktu masuk. Absen mulai jam %s", cfg.JamMasukMulai)
	}

	var jurnalID *uint
	if len(parts) >= 5 && parts[3] == "jurnal" {
		jIDUint, _ := strconv.ParseUint(parts[4], 10, 32)
		jID := uint(jIDUint)
		jurnalID = &jID
		jurnal, err := s.jurnalRepo.FindByID(jID)
		if err != nil {
			return nil, errors.New("jurnal tidak ditemukan")
		}
		if jurnal.Tanggal.Format("2006-01-02") != now.Format("2006-01-02") {
			return nil, errors.New("jurnal ini bukan untuk hari ini")
		}
	}

	status := "Hadir"
	tipeAbsen := "masuk"
	if now.Format("15:04") > cfg.JamMasukSelesai {
		// After check-in window: could be terlambat masuk or pulang
		if now.Format("15:04") >= cfg.JamPulangMulai {
			// Pulang time - check if already checked in today
			var existingCount int64
			s.db.Table("tbl_presensi_siswa").Where("siswa_id = ? AND tipe_absen = 'masuk' AND DATE(created_at) = ? AND deleted_at IS NULL", siswaID, now.Format("2006-01-02")).Count(&existingCount)
			if existingCount > 0 {
				tipeAbsen = "pulang"
			}
		} else {
			status = "Terlambat"
		}
	}
	waktuScan := now
	absensi := &domain.Absensi{
		JurnalID:        jurnalID,
		SiswaID:         siswaID,
		StatusKehadiran: "H",
		Keterangan:      fmt.Sprintf("QR Scan - %s - %s", status, tipeAbsen),
		WaktuScan:       &waktuScan,
		TipeAbsen:       tipeAbsen,
	}
	return absensi, s.absSiswaRepo.Create(absensi)
}

func (s *attendanceService) SelfCheckInGuru(userID uint, lat, lng float64, ip, ua string) (*domain.AbsensiGuru, error) {
	guru, err := s.guruRepo.FindByUserID(userID)
	if err != nil {
		return nil, errors.New("data guru tidak ditemukan")
	}
	qrCode := fmt.Sprintf("JURNAL_QR:guru:%d:%s", guru.ID, guru.NIP)
	return s.ScanTeacherQR(dto.ScanQRAttendanceRequest{QRCode: qrCode, Latitude: lat, Longitude: lng}, ip, ua)
}

func (s *attendanceService) ListStudentAttendanceByUserID(param domain.PaginationParam, userID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.Absensi], error) {
	siswa, err := s.siswaRepo.FindByUserID(userID)
	if err != nil {
		return &domain.PaginatedResult[domain.Absensi]{}, nil
	}
	return s.absSiswaRepo.List(param, siswa.ID, status, start, end)
}

func (s *attendanceService) ListTeacherAttendance(param domain.PaginationParam, guruID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.AbsensiGuru], error) {
	return s.absGuruRepo.List(param, guruID, status, start, end)
}

func (s *attendanceService) ListStudentAttendance(param domain.PaginationParam, siswaID uint, status string, start, end *time.Time) (*domain.PaginatedResult[domain.Absensi], error) {
	return s.absSiswaRepo.List(param, siswaID, status, start, end)
}

func (s *attendanceService) CreateHariLibur(req dto.HariLiburRequest) error {
	tgl, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		return errors.New("format tanggal tidak valid")
	}
	return s.liburRepo.Create(&domain.HariLibur{Tanggal: tgl, NamaLibur: req.NamaLibur, Jenis: req.Jenis, KelasID: req.KelasID, Keterangan: req.Keterangan})
}
func (s *attendanceService) GetHolidays(param domain.PaginationParam) (*domain.PaginatedResult[domain.HariLibur], error) {
	return s.liburRepo.List(param)
}
func (s *attendanceService) GetHolidaysByBulan(year, month int) ([]domain.HariLibur, error) {
	return s.liburRepo.ListByBulan(year, month)
}
func (s *attendanceService) DeleteHoliday(id uint) error { return s.liburRepo.Delete(id) }

func (s *attendanceService) CreateJamKhusus(req dto.JamKhususRequest) error {
	tgl, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		return errors.New("format tanggal tidak valid")
	}
	return s.jamKhususRepo.Create(&domain.JamKhusus{Tanggal: tgl, MaxJam: req.MaxJam, Alasan: req.Alasan, KelasID: req.KelasID, Keterangan: req.Keterangan})
}
func (s *attendanceService) GetJamKhususByBulan(year, month int) ([]domain.JamKhusus, error) {
	return s.jamKhususRepo.ListByBulan(year, month)
}
func (s *attendanceService) DeleteJamKhusus(id uint) error { return s.jamKhususRepo.Delete(id) }

func (s *attendanceService) GetTimeConfig(tipe string) (*domain.PengaturanJam, error) {
	return s.jamRepo.FindByTipe(tipe)
}
func (s *attendanceService) UpdateTimeConfig(tipe string, req dto.PengaturanJamRequest) error {
	cfg, err := s.jamRepo.FindByTipe(tipe)
	if err != nil {
		cfg = &domain.PengaturanJam{Tipe: tipe}
	}
	cfg.JamMasukMulai = req.JamMasukMulai
	cfg.JamMasukSelesai = req.JamMasukSelesai
	cfg.JamPulangMulai = req.JamPulangMulai
	cfg.JamPulangSelesai = req.JamPulangSelesai
	return s.jamRepo.Update(cfg)
}

// ─── BK SERVICE ───────────────────────────────────────────────────────────────
type BKService interface {
	CreateKonseling(req dto.BKKonselingRequest, counselorID uint) (*domain.BKKonseling, error)
	UpdateKonseling(id uint, req dto.BKKonselingRequest) (*domain.BKKonseling, error)
	DeleteKonseling(id uint) error
	GetKonselingByID(id uint) (*domain.BKKonseling, error)
	ListKonseling(param domain.PaginationParam, siswaID, guruID uint, status, tipe string) (*domain.PaginatedResult[domain.BKKonseling], error)
	CreatePelanggaran(req dto.PelanggaranRequest, reporterID uint) (*domain.Pelanggaran, error)
	UpdatePelanggaran(id uint, req dto.PelanggaranRequest) (*domain.Pelanggaran, error)
	DeletePelanggaran(id uint) error
	GetPelanggaranByID(id uint) (*domain.Pelanggaran, error)
	ListPelanggaran(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Pelanggaran], error)
	GetStudentViolationPoints(siswaID uint) (int, error)
	CreatePrestasi(req dto.PrestasiRequest) (*domain.Prestasi, error)
	UpdatePrestasi(id uint, req dto.PrestasiRequest) (*domain.Prestasi, error)
	DeletePrestasi(id uint) error
	GetPrestasiByID(id uint) (*domain.Prestasi, error)
	ListPrestasi(param domain.PaginationParam, siswaID uint, kategori string) (*domain.PaginatedResult[domain.Prestasi], error)
	CreateTesPsikologi(req dto.TesPsikologiRequest) (*domain.TesPsikologi, error)
	UpdateTesPsikologi(id uint, req dto.TesPsikologiRequest) (*domain.TesPsikologi, error)
	DeleteTesPsikologi(id uint) error
	GetTesPsikologiByID(id uint) (*domain.TesPsikologi, error)
	ListTesPsikologi(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.TesPsikologi], error)
	CreateProyek(req dto.ProyekRequest) (*domain.Proyek, error)
	UpdateProyek(id uint, req dto.ProyekRequest) (*domain.Proyek, error)
	DeleteProyek(id uint) error
	GetProyekByID(id uint) (*domain.Proyek, error)
	ListProyek(param domain.PaginationParam, kelasID uint, status string) (*domain.PaginatedResult[domain.Proyek], error)
}

type bkService struct {
	bkRepo   domain.BKKonselingRepository
	pelRepo  domain.PelanggaranRepository
	presRepo domain.PrestasiRepository
	tesRepo  domain.TesPsikologiRepository
	proyRepo domain.ProyekRepository
	guruRepo domain.GuruRepository
}

func NewBKService(bkRepo domain.BKKonselingRepository, pelRepo domain.PelanggaranRepository, presRepo domain.PrestasiRepository, tesRepo domain.TesPsikologiRepository, proyRepo domain.ProyekRepository, guruRepo domain.GuruRepository) BKService {
	return &bkService{bkRepo, pelRepo, presRepo, tesRepo, proyRepo, guruRepo}
}

func (s *bkService) CreateKonseling(req dto.BKKonselingRequest, counselorUserID uint) (*domain.BKKonseling, error) {
	// Resolve guru_id from user_id
	guru, err := s.guruRepo.FindByUserID(counselorUserID)
	if err != nil {
		return nil, fmt.Errorf("akun guru BK tidak ditemukan, pastikan akun terdaftar sebagai Guru: %v", err)
	}
	tgl, _ := time.Parse("2006-01-02", req.Tanggal)
	k := &domain.BKKonseling{SiswaID: req.SiswaID, GuruID: guru.ID, Tanggal: tgl, Tipe: req.Tipe, Masalah: req.Masalah, Solusi: req.Solusi, TindakLanjut: req.TindakLanjut, Status: "Proses"}
	return k, s.bkRepo.Create(k)
}
func (s *bkService) UpdateKonseling(id uint, req dto.BKKonselingRequest) (*domain.BKKonseling, error) {
	k, err := s.bkRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	k.Masalah = req.Masalah
	k.Solusi = req.Solusi
	k.TindakLanjut = req.TindakLanjut
	k.Status = req.Status
	return k, s.bkRepo.Update(k)
}
func (s *bkService) DeleteKonseling(id uint) error { return s.bkRepo.Delete(id) }
func (s *bkService) GetKonselingByID(id uint) (*domain.BKKonseling, error) {
	return s.bkRepo.FindByID(id)
}
func (s *bkService) ListKonseling(param domain.PaginationParam, siswaID, guruID uint, status, tipe string) (*domain.PaginatedResult[domain.BKKonseling], error) {
	return s.bkRepo.List(param, siswaID, guruID, status, tipe)
}

func (s *bkService) CreatePelanggaran(req dto.PelanggaranRequest, reporterID uint) (*domain.Pelanggaran, error) {
	tgl, _ := time.Parse("2006-01-02", req.Tanggal)
	p := &domain.Pelanggaran{SiswaID: req.SiswaID, DilaporkanOleh: reporterID, Tanggal: tgl, NamaPelanggaran: req.NamaPelanggaran, Poin: req.Poin, Keterangan: req.Keterangan}
	return p, s.pelRepo.Create(p)
}
func (s *bkService) UpdatePelanggaran(id uint, req dto.PelanggaranRequest) (*domain.Pelanggaran, error) {
	p, err := s.pelRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	p.NamaPelanggaran = req.NamaPelanggaran
	p.Keterangan = req.Keterangan
	return p, s.pelRepo.Update(p)
}
func (s *bkService) DeletePelanggaran(id uint) error { return s.pelRepo.Delete(id) }
func (s *bkService) GetPelanggaranByID(id uint) (*domain.Pelanggaran, error) {
	return s.pelRepo.FindByID(id)
}
func (s *bkService) ListPelanggaran(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Pelanggaran], error) {
	return s.pelRepo.List(param, siswaID)
}
func (s *bkService) GetStudentViolationPoints(siswaID uint) (int, error) {
	return s.pelRepo.SumPointsBySiswaID(siswaID)
}

func (s *bkService) CreatePrestasi(req dto.PrestasiRequest) (*domain.Prestasi, error) {
	tgl, _ := time.Parse("2006-01-02", req.Tanggal)
	p := &domain.Prestasi{SiswaID: req.SiswaID, Tanggal: tgl, NamaPrestasi: req.NamaPrestasi, Kategori: req.Kategori, Tingkat: req.Tingkat, Keterangan: req.Keterangan}
	return p, s.presRepo.Create(p)
}
func (s *bkService) UpdatePrestasi(id uint, req dto.PrestasiRequest) (*domain.Prestasi, error) {
	p, err := s.presRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	p.NamaPrestasi = req.NamaPrestasi
	p.Keterangan = req.Keterangan
	return p, s.presRepo.Update(p)
}
func (s *bkService) DeletePrestasi(id uint) error { return s.presRepo.Delete(id) }
func (s *bkService) GetPrestasiByID(id uint) (*domain.Prestasi, error) {
	return s.presRepo.FindByID(id)
}
func (s *bkService) ListPrestasi(param domain.PaginationParam, siswaID uint, kategori string) (*domain.PaginatedResult[domain.Prestasi], error) {
	return s.presRepo.List(param, siswaID, kategori)
}

func (s *bkService) CreateTesPsikologi(req dto.TesPsikologiRequest) (*domain.TesPsikologi, error) {
	tgl, _ := time.Parse("2006-01-02", req.Tanggal)
	t := &domain.TesPsikologi{SiswaID: req.SiswaID, Tanggal: tgl, JenisTes: req.JenisTes, Hasil: req.Hasil, Rekomendasi: req.Rekomendasi, FileUrl: req.FileUrl}
	return t, s.tesRepo.Create(t)
}
func (s *bkService) UpdateTesPsikologi(id uint, req dto.TesPsikologiRequest) (*domain.TesPsikologi, error) {
	t, err := s.tesRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	t.JenisTes = req.JenisTes
	t.Hasil = req.Hasil
	t.Rekomendasi = req.Rekomendasi
	if req.FileUrl != "" {
		t.FileUrl = req.FileUrl
	}
	return t, s.tesRepo.Update(t)
}
func (s *bkService) DeleteTesPsikologi(id uint) error { return s.tesRepo.Delete(id) }
func (s *bkService) GetTesPsikologiByID(id uint) (*domain.TesPsikologi, error) {
	return s.tesRepo.FindByID(id)
}
func (s *bkService) ListTesPsikologi(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.TesPsikologi], error) {
	return s.tesRepo.List(param, siswaID)
}

func (s *bkService) CreateProyek(req dto.ProyekRequest) (*domain.Proyek, error) {
	mulai, _ := time.Parse("2006-01-02", req.TanggalMulai)
	selesai, _ := time.Parse("2006-01-02", req.TanggalSelesai)
	p := &domain.Proyek{KelasID: req.KelasID, NamaProyek: req.NamaProyek, Deskripsi: req.Deskripsi, TanggalMulai: mulai, TanggalSelesai: selesai, Status: "Aktif"}
	return p, s.proyRepo.Create(p)
}
func (s *bkService) UpdateProyek(id uint, req dto.ProyekRequest) (*domain.Proyek, error) {
	p, err := s.proyRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	p.NamaProyek = req.NamaProyek
	p.Deskripsi = req.Deskripsi
	p.Status = req.Status
	return p, s.proyRepo.Update(p)
}
func (s *bkService) DeleteProyek(id uint) error                    { return s.proyRepo.Delete(id) }
func (s *bkService) GetProyekByID(id uint) (*domain.Proyek, error) { return s.proyRepo.FindByID(id) }
func (s *bkService) ListProyek(param domain.PaginationParam, kelasID uint, status string) (*domain.PaginatedResult[domain.Proyek], error) {
	return s.proyRepo.List(param, kelasID, status)
}

// ─── PERIZINAN SERVICE ────────────────────────────────────────────────────────
type PerizinanService interface {
	CreateStudentLeave(req dto.PerizinanRequest, siswaID uint) (*domain.Perizinan, error)
	UpdateStudentLeave(id uint, req dto.PerizinanRequest) (*domain.Perizinan, error)
	DeleteStudentLeave(id uint) error
	GetStudentLeaveByID(id uint) (*domain.Perizinan, error)
	ListStudentLeaves(param domain.PaginationParam, siswaID uint, status string) (*domain.PaginatedResult[domain.Perizinan], error)
	ListStudentLeavesForApprover(param domain.PaginationParam, waliKelasID uint, mapelIDs []uint, status string) (*domain.PaginatedResult[domain.Perizinan], error)
	ApproveStudentLeave(id uint, status string, approverID uint) error
	CreateTeacherLeave(req dto.IzinGuruRequest, guruID uint) (*domain.IzinGuru, error)
	UpdateTeacherLeave(id uint, req dto.IzinGuruRequest) (*domain.IzinGuru, error)
	DeleteTeacherLeave(id uint) error
	GetTeacherLeaveByID(id uint) (*domain.IzinGuru, error)
	ListTeacherLeaves(param domain.PaginationParam, guruID uint, status string) (*domain.PaginatedResult[domain.IzinGuru], error)
	ApproveTeacherLeave(id uint, status string) error
}

type perizinanService struct {
	db           *gorm.DB
	perSiswaRepo domain.PerizinanRepository
	perGuruRepo  domain.IzinGuruRepository
	guruRepo     domain.GuruRepository
	siswaRepo    domain.SiswaRepository
	pesanRepo    domain.PesanRepository
	userRepo     domain.UserRepository
}

func NewPerizinanService(db *gorm.DB, perSiswaRepo domain.PerizinanRepository, perGuruRepo domain.IzinGuruRepository, guruRepo domain.GuruRepository, siswaRepo domain.SiswaRepository, pesanRepo domain.PesanRepository, userRepo domain.UserRepository) PerizinanService {
	return &perizinanService{db, perSiswaRepo, perGuruRepo, guruRepo, siswaRepo, pesanRepo, userRepo}
}

func (s *perizinanService) CreateStudentLeave(req dto.PerizinanRequest, userID uint) (*domain.Perizinan, error) {
	// Lookup siswa by userID to get actual siswa.ID
	siswa, err := s.siswaRepo.FindByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("data siswa tidak ditemukan untuk user ini")
	}
	tglMulai, _ := time.Parse("2006-01-02", req.TanggalMulai)
	tglSelesai, _ := time.Parse("2006-01-02", req.TanggalSelesai)
	tipeIzin := req.TipeIzin
	if tipeIzin == "" {
		tipeIzin = "harian"
	}
	waliKelasID := req.WaliKelasID
	// Jika tipe harian dan wali_kelas_id tidak dikirim frontend,
	// otomatis ambil dari data kelas siswa
	if tipeIzin == "harian" && (waliKelasID == nil || *waliKelasID == 0) {
		if siswa.Kelas != nil && siswa.Kelas.WaliKelasID != 0 {
			id := siswa.Kelas.WaliKelasID
			waliKelasID = &id
		} else if siswa.KelasID != 0 {
			// Fallback: query kelas langsung
			var kelas domain.Kelas
			if err2 := s.db.First(&kelas, siswa.KelasID).Error; err2 == nil && kelas.WaliKelasID != 0 {
				id := kelas.WaliKelasID
				waliKelasID = &id
			}
		}
	}
	p := &domain.Perizinan{
		SiswaID:        siswa.ID,
		TanggalMulai:   tglMulai,
		TanggalSelesai: tglSelesai,
		JenisIzin:      req.JenisIzin,
		TipeIzin:       tipeIzin,
		WaliKelasID:    waliKelasID,
		MapelID:        req.MapelID,
		Keterangan:     req.Keterangan,
		BuktiUrl:       req.BuktiUrl,
		Status:         "Pending",
	}
	if err := s.perSiswaRepo.Create(p); err != nil {
		return nil, err
	}
	// Notifikasi ke wali kelas
	if waliKelasID != nil && *waliKelasID != 0 {
		wali, errW := s.guruRepo.FindByID(*waliKelasID)
		if errW == nil && wali != nil && wali.UserID > 0 {
			_ = s.pesanRepo.Create(&domain.Pesan{
				DariUserID: siswa.UserID,
				KeUserID:   wali.UserID,
				Judul:      fmt.Sprintf("[Permohonan Izin] %s", siswa.Nama),
				Isi:        fmt.Sprintf("Siswa %s mengajukan izin %s dari %s s/d %s.\nKeterangan: %s\n\nSilakan setujui/tolak di menu Perizinan.", siswa.Nama, req.JenisIzin, req.TanggalMulai, req.TanggalSelesai, req.Keterangan),
			})
		}
	}
	// Notifikasi ke guru mapel jika izin per-mapel
	if req.MapelID != nil && *req.MapelID != 0 {
		var mengajarList []domain.Mengajar
		s.db.Where("mapel_id = ? AND kelas_id = ? AND deleted_at IS NULL", *req.MapelID, siswa.KelasID).Find(&mengajarList)
		notifiedGuru := map[uint]bool{}
		for _, m := range mengajarList {
			if notifiedGuru[m.GuruID] {
				continue
			}
			notifiedGuru[m.GuruID] = true
			guruMapel, errG := s.guruRepo.FindByID(m.GuruID)
			if errG == nil && guruMapel != nil && guruMapel.UserID > 0 {
				_ = s.pesanRepo.Create(&domain.Pesan{
					DariUserID: siswa.UserID,
					KeUserID:   guruMapel.UserID,
					Judul:      fmt.Sprintf("[Permohonan Izin Mapel] %s", siswa.Nama),
					Isi:        fmt.Sprintf("Siswa %s mengajukan izin %s dari %s s/d %s untuk mata pelajaran Anda.\nKeterangan: %s", siswa.Nama, req.JenisIzin, req.TanggalMulai, req.TanggalSelesai, req.Keterangan),
				})
			}
		}
	}
	return p, nil
}
func (s *perizinanService) UpdateStudentLeave(id uint, req dto.PerizinanRequest) (*domain.Perizinan, error) {
	p, err := s.perSiswaRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	p.Keterangan = req.Keterangan
	return p, s.perSiswaRepo.Update(p)
}
func (s *perizinanService) DeleteStudentLeave(id uint) error { return s.perSiswaRepo.Delete(id) }
func (s *perizinanService) GetStudentLeaveByID(id uint) (*domain.Perizinan, error) {
	return s.perSiswaRepo.FindByID(id)
}
func (s *perizinanService) ListStudentLeaves(param domain.PaginationParam, siswaID uint, status string) (*domain.PaginatedResult[domain.Perizinan], error) {
	return s.perSiswaRepo.List(param, siswaID, status)
}
func (s *perizinanService) ListStudentLeavesForApprover(param domain.PaginationParam, waliKelasID uint, mapelIDs []uint, status string) (*domain.PaginatedResult[domain.Perizinan], error) {
	return s.perSiswaRepo.ListForApprover(param, waliKelasID, mapelIDs, status)
}
func (s *perizinanService) ApproveStudentLeave(id uint, status string, approverID uint) error {
	p, err := s.perSiswaRepo.FindByID(id)
	if err != nil {
		return err
	}
	p.Status = status
	p.DisetujuiOleh = &approverID
	if err := s.perSiswaRepo.Update(p); err != nil {
		return err
	}
	// Jika disetujui, update status absensi siswa pada rentang tanggal
	if status == "Approved" {
		statusAbsensi := "I" // Izin
		if p.JenisIzin == "Sakit" {
			statusAbsensi = "S"
		}
		keterangan := fmt.Sprintf("Perizinan: %s - %s", p.JenisIzin, p.Keterangan)
		// Update semua record absensi siswa untuk jurnal dalam rentang tanggal
		s.db.Exec(`
			UPDATE tbl_presensi_siswa ps
			INNER JOIN tbl_jurnal j ON ps.jurnal_id = j.id AND j.deleted_at IS NULL
			SET ps.status_kehadiran = ?, ps.keterangan = ?
			WHERE ps.siswa_id = ?
			  AND ps.deleted_at IS NULL
			  AND DATE(j.tanggal_jurnal) BETWEEN ? AND ?
		`, statusAbsensi, keterangan, p.SiswaID,
			p.TanggalMulai.Format("2006-01-02"),
			p.TanggalSelesai.Format("2006-01-02"),
		)
	}
	// Notifikasi ke siswa
	var siswa domain.Siswa
	if errS := s.db.First(&siswa, p.SiswaID).Error; errS == nil && siswa.UserID > 0 {
		statusLabel := "Disetujui ✅"
		if status == "Rejected" {
			statusLabel = "Ditolak ❌"
		}
		_ = s.pesanRepo.Create(&domain.Pesan{
			DariUserID: approverID,
			KeUserID:   siswa.UserID,
			Judul:      fmt.Sprintf("[Perizinan] %s", statusLabel),
			Isi:        fmt.Sprintf("Permohonan izin %s Anda dari %s s/d %s telah %s.", p.JenisIzin, p.TanggalMulai.Format("02 Jan 2006"), p.TanggalSelesai.Format("02 Jan 2006"), statusLabel),
		})
	}
	return nil
}
func (s *perizinanService) CreateTeacherLeave(req dto.IzinGuruRequest, userID uint) (*domain.IzinGuru, error) {
	// Lookup guru by userID to get actual guru.ID
	guru, err := s.guruRepo.FindByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("data guru tidak ditemukan untuk user ini")
	}
	tglMulai, _ := time.Parse("2006-01-02", req.TanggalMulai)
	tglSelesai, _ := time.Parse("2006-01-02", req.TanggalSelesai)
	p := &domain.IzinGuru{GuruID: guru.ID, TanggalMulai: tglMulai, TanggalSelesai: tglSelesai, JenisIzin: req.JenisIzin, Keterangan: req.Keterangan, BuktiUrl: req.BuktiUrl, Status: "Pending"}
	if err := s.perGuruRepo.Create(p); err != nil {
		return nil, err
	}
	// Notifikasi ke semua kepsek
	kepsekList, _ := s.userRepo.FindByRole("kepsek")
	for _, k := range kepsekList {
		_ = s.pesanRepo.Create(&domain.Pesan{
			DariUserID: userID,
			KeUserID:   k.ID,
			Judul:      fmt.Sprintf("[Permohonan Izin Guru] %s", guru.Nama),
			Isi:        fmt.Sprintf("Guru %s mengajukan izin %s dari %s s/d %s.\nKeterangan: %s\n\nSilakan setujui/tolak di menu Perizinan.", guru.Nama, req.JenisIzin, req.TanggalMulai, req.TanggalSelesai, req.Keterangan),
		})
	}
	// Juga notif ke admin
	adminList, _ := s.userRepo.FindByRole("admin")
	for _, adm := range adminList {
		_ = s.pesanRepo.Create(&domain.Pesan{
			DariUserID: userID,
			KeUserID:   adm.ID,
			Judul:      fmt.Sprintf("[Permohonan Izin Guru] %s", guru.Nama),
			Isi:        fmt.Sprintf("Guru %s mengajukan izin %s dari %s s/d %s.\nKeterangan: %s", guru.Nama, req.JenisIzin, req.TanggalMulai, req.TanggalSelesai, req.Keterangan),
		})
	}
	return p, nil
}
func (s *perizinanService) UpdateTeacherLeave(id uint, req dto.IzinGuruRequest) (*domain.IzinGuru, error) {
	p, err := s.perGuruRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	p.Keterangan = req.Keterangan
	return p, s.perGuruRepo.Update(p)
}
func (s *perizinanService) DeleteTeacherLeave(id uint) error { return s.perGuruRepo.Delete(id) }
func (s *perizinanService) GetTeacherLeaveByID(id uint) (*domain.IzinGuru, error) {
	return s.perGuruRepo.FindByID(id)
}
func (s *perizinanService) ListTeacherLeaves(param domain.PaginationParam, guruID uint, status string) (*domain.PaginatedResult[domain.IzinGuru], error) {
	return s.perGuruRepo.List(param, guruID, status)
}
func (s *perizinanService) ApproveTeacherLeave(id uint, status string) error {
	p, err := s.perGuruRepo.FindByID(id)
	if err != nil {
		return err
	}
	p.Status = status
	if err := s.perGuruRepo.Update(p); err != nil {
		return err
	}
	// Notif ke guru
	guru, errG := s.guruRepo.FindByID(p.GuruID)
	if errG == nil && guru != nil && guru.UserID > 0 {
		statusLabel := "Disetujui ✅"
		if status == "Rejected" {
			statusLabel = "Ditolak ❌"
		}
		admins, _ := s.userRepo.FindByRole("kepsek")
		var senderID uint = 1
		if len(admins) > 0 {
			senderID = admins[0].ID
		}
		_ = s.pesanRepo.Create(&domain.Pesan{
			DariUserID: senderID,
			KeUserID:   guru.UserID,
			Judul:      fmt.Sprintf("[Izin Guru] %s", statusLabel),
			Isi:        fmt.Sprintf("Permohonan izin %s Anda dari %s s/d %s telah %s.", p.JenisIzin, p.TanggalMulai.Format("02 Jan 2006"), p.TanggalSelesai.Format("02 Jan 2006"), statusLabel),
		})
	}
	return nil
}

// ─── NILAI SERVICE ────────────────────────────────────────────────────────────
type NilaiService interface {
	CreateNilai(req dto.NilaiRequest, guruID uint) (*domain.Nilai, error)
	UpdateNilai(id uint, req dto.NilaiRequest) (*domain.Nilai, error)
	DeleteNilai(id uint) error
	ListNilai(param domain.PaginationParam, siswaID, mapelID uint, jenisNilai string) (*domain.PaginatedResult[domain.Nilai], error)
}

type nilaiService struct {
	nilaiRepo domain.NilaiRepository
	guruRepo  domain.GuruRepository
}

func NewNilaiService(nilaiRepo domain.NilaiRepository, guruRepo domain.GuruRepository) NilaiService {
	return &nilaiService{nilaiRepo, guruRepo}
}

func (s *nilaiService) CreateNilai(req dto.NilaiRequest, guruID uint) (*domain.Nilai, error) {
	n := &domain.Nilai{SiswaID: req.SiswaID, MapelID: req.MapelID, GuruID: guruID, JenisNilai: req.JenisNilai, Nilai: req.Nilai, Keterangan: req.Keterangan}
	return n, s.nilaiRepo.Create(n)
}
func (s *nilaiService) UpdateNilai(id uint, req dto.NilaiRequest) (*domain.Nilai, error) {
	n, err := s.nilaiRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	n.Nilai = req.Nilai
	n.Keterangan = req.Keterangan
	return n, s.nilaiRepo.Update(n)
}
func (s *nilaiService) DeleteNilai(id uint) error { return s.nilaiRepo.Delete(id) }
func (s *nilaiService) ListNilai(param domain.PaginationParam, siswaID, mapelID uint, jenisNilai string) (*domain.PaginatedResult[domain.Nilai], error) {
	return s.nilaiRepo.List(param, siswaID, mapelID, jenisNilai)
}

// ─── REPORT SERVICE ───────────────────────────────────────────────────────────
type ReportService interface {
	GetJurnalReport(param domain.PaginationParam, guruID uint, kelasID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Jurnal], error)
	GetAttendanceReport(param domain.PaginationParam, siswaID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Absensi], error)
	GetTeacherAttendanceReport(param domain.PaginationParam, guruID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.AbsensiGuru], error)
	GetViolationsReport(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Pelanggaran], error)
	GetAchievementsReport(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Prestasi], error)
	GetAuditLogs(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.AuditLog], error)
	GetSiswaDashboard(siswaID uint) (map[string]interface{}, error)
	GetAdminDashboard() (map[string]interface{}, error)
	GetOrtuDashboard(userID uint) (map[string]interface{}, error)
	GetGuruDashboard(userID uint) (map[string]interface{}, error)
}

type reportService struct {
	db           *gorm.DB
	guruRepo     domain.GuruRepository
	siswaRepo    domain.SiswaRepository
	kelasRepo    domain.KelasRepository
	mapelRepo    domain.MapelRepository
	jurnalRepo   domain.JurnalRepository
	absGuruRepo  domain.AbsensiGuruRepository
	absSiswaRepo domain.AbsensiRepository
	pelRepo      domain.PelanggaranRepository
	presRepo     domain.PrestasiRepository
	auditRepo    domain.AuditLogRepository
	anakOrtuRepo domain.AnakOrangTuaRepository
}

func NewReportService(db *gorm.DB, guruRepo domain.GuruRepository, siswaRepo domain.SiswaRepository, kelasRepo domain.KelasRepository, mapelRepo domain.MapelRepository, jurnalRepo domain.JurnalRepository, absGuruRepo domain.AbsensiGuruRepository, absSiswaRepo domain.AbsensiRepository, pelRepo domain.PelanggaranRepository, presRepo domain.PrestasiRepository, auditRepo domain.AuditLogRepository, anakOrtuRepo domain.AnakOrangTuaRepository) ReportService {
	return &reportService{db, guruRepo, siswaRepo, kelasRepo, mapelRepo, jurnalRepo, absGuruRepo, absSiswaRepo, pelRepo, presRepo, auditRepo, anakOrtuRepo}
}

func (s *reportService) GetJurnalReport(param domain.PaginationParam, guruID uint, kelasID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Jurnal], error) {
	return s.jurnalRepo.List(param, guruID, kelasID, 0, startDate, endDate)
}

func (s *reportService) GetAttendanceReport(param domain.PaginationParam, siswaID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.Absensi], error) {
	return &domain.PaginatedResult[domain.Absensi]{}, nil
}

func (s *reportService) GetTeacherAttendanceReport(param domain.PaginationParam, guruID uint, startDate, endDate *time.Time) (*domain.PaginatedResult[domain.AbsensiGuru], error) {
	return s.absGuruRepo.List(param, guruID, "", startDate, endDate)
}

func (s *reportService) GetViolationsReport(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Pelanggaran], error) {
	return s.pelRepo.List(param, siswaID)
}

func (s *reportService) GetAchievementsReport(param domain.PaginationParam, siswaID uint) (*domain.PaginatedResult[domain.Prestasi], error) {
	return s.presRepo.List(param, siswaID, "")
}

func (s *reportService) GetAuditLogs(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.AuditLog], error) {
	return s.auditRepo.List(param, userID)
}

func (s *reportService) GetSiswaDashboard(siswaID uint) (map[string]interface{}, error) {
	now := time.Now()
	firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastDay := firstDay.AddDate(0, 1, 0).Add(-time.Second)

	// Attendance rate bulan ini
	var totalAbsensi, hadirAbsensi int64
	s.db.Model(&domain.Absensi{}).Where("siswa_id = ? AND tanggal BETWEEN ? AND ?", siswaID, firstDay, lastDay).Count(&totalAbsensi)
	s.db.Model(&domain.Absensi{}).Where("siswa_id = ? AND tanggal BETWEEN ? AND ? AND status = ?", siswaID, firstDay, lastDay, "hadir").Count(&hadirAbsensi)
	attendanceRate := 0.0
	if totalAbsensi > 0 {
		attendanceRate = float64(hadirAbsensi) / float64(totalAbsensi) * 100
	}

	// Izin pending
	var perizinanPending int64
	s.db.Model(&domain.Perizinan{}).Where("siswa_id = ? AND status = ?", siswaID, "pending").Count(&perizinanPending)

	// Pelanggaran
	var violationCount int64
	s.db.Model(&domain.Pelanggaran{}).Where("siswa_id = ?", siswaID).Count(&violationCount)
	violationPoints, _ := s.pelRepo.SumPointsBySiswaID(siswaID)

	// Prestasi
	var prestasiCount int64
	s.db.Model(&domain.Prestasi{}).Where("siswa_id = ?", siswaID).Count(&prestasiCount)

	return map[string]interface{}{
		"attendance_rate":   math.Round(attendanceRate*10) / 10,
		"perizinan_pending": perizinanPending,
		"violations":        violationCount,
		"violation_points":  violationPoints,
		"prestasi":          prestasiCount,
	}, nil
}

func (s *reportService) GetOrtuDashboard(userID uint) (map[string]interface{}, error) {
	// Cari orang tua by userID
	var ortu domain.OrangTua
	if err := s.db.Where("user_id = ? AND deleted_at IS NULL", userID).First(&ortu).Error; err != nil {
		return nil, fmt.Errorf("data orang tua tidak ditemukan")
	}
	// Ambil semua anak
	anakList, err := s.anakOrtuRepo.FindByOrangTuaID(ortu.ID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastDay := firstDay.AddDate(0, 1, 0).Add(-time.Second)

	type AnakData struct {
		ID               uint    `json:"id"`
		Nama             string  `json:"nama"`
		NIS              string  `json:"nis"`
		NISN             string  `json:"nisn"`
		Kelas            string  `json:"kelas"`
		Jurusan          string  `json:"jurusan"`
		Hubungan         string  `json:"hubungan"`
		AttendanceRate   float64 `json:"attendance_rate"`
		Hadir            int64   `json:"hadir"`
		Sakit            int64   `json:"sakit"`
		Izin             int64   `json:"izin"`
		Alpa             int64   `json:"alpa"`
		Violations       int64   `json:"violations"`
		ViolationPoints  int     `json:"violation_points"`
		Prestasi         int64   `json:"prestasi"`
		PerizinanPending int64   `json:"perizinan_pending"`
	}
	var result []AnakData
	for _, a := range anakList {
		siswa, err := s.siswaRepo.FindByID(a.SiswaID)
		if err != nil {
			continue
		}
		// Absensi bulan ini via presensi jurnal
		var hadir, sakit, izin, alpa int64
		s.db.Table("tbl_absensi").Where("siswa_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL", siswa.ID, firstDay, lastDay).Where("status_kehadiran = ?", "H").Count(&hadir)
		s.db.Table("tbl_absensi").Where("siswa_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL", siswa.ID, firstDay, lastDay).Where("status_kehadiran = ?", "S").Count(&sakit)
		s.db.Table("tbl_absensi").Where("siswa_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL", siswa.ID, firstDay, lastDay).Where("status_kehadiran = ?", "I").Count(&izin)
		s.db.Table("tbl_absensi").Where("siswa_id = ? AND created_at BETWEEN ? AND ? AND deleted_at IS NULL", siswa.ID, firstDay, lastDay).Where("status_kehadiran = ?", "A").Count(&alpa)
		total := hadir + sakit + izin + alpa
		rate := 0.0
		if total > 0 {
			rate = math.Round(float64(hadir)/float64(total)*1000) / 10
		}
		var violations int64
		s.db.Model(&domain.Pelanggaran{}).Where("siswa_id = ? AND deleted_at IS NULL", siswa.ID).Count(&violations)
		vpoints, _ := s.pelRepo.SumPointsBySiswaID(siswa.ID)
		var prestasi int64
		s.db.Model(&domain.Prestasi{}).Where("siswa_id = ? AND deleted_at IS NULL", siswa.ID).Count(&prestasi)
		var perizinanPending int64
		s.db.Model(&domain.Perizinan{}).Where("siswa_id = ? AND status = ? AND deleted_at IS NULL", siswa.ID, "Pending").Count(&perizinanPending)
		kelas := ""
		if siswa.Kelas != nil {
			kelas = siswa.Kelas.NamaKelas
		}
		jurusan := ""
		if siswa.Jurusan.ID > 0 {
			jurusan = siswa.Jurusan.NamaJurusan
		}
		result = append(result, AnakData{
			ID: siswa.ID, Nama: siswa.Nama, NIS: siswa.NIS, NISN: siswa.NISN,
			Kelas: kelas, Jurusan: jurusan, Hubungan: a.Hubungan,
			AttendanceRate: rate, Hadir: hadir, Sakit: sakit, Izin: izin, Alpa: alpa,
			Violations: violations, ViolationPoints: vpoints, Prestasi: prestasi, PerizinanPending: perizinanPending,
		})
	}
	return map[string]interface{}{
		"nama_ortu":  ortu.Nama,
		"anak_count": len(result),
		"anak_list":  result,
	}, nil
}

func (s *reportService) GetGuruDashboard(userID uint) (map[string]interface{}, error) {
	guru, err := s.guruRepo.FindByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("data guru tidak ditemukan")
	}
	guruID := guru.ID
	now := time.Now()
	today := now.Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)
	firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastDay := firstDay.AddDate(0, 1, 0).Add(-time.Second)

	hariIndonesia := map[time.Weekday]string{
		time.Sunday: "Minggu", time.Monday: "Senin", time.Tuesday: "Selasa",
		time.Wednesday: "Rabu", time.Thursday: "Kamis", time.Friday: "Jumat", time.Saturday: "Sabtu",
	}
	hariIni := hariIndonesia[now.Weekday()]

	var jurnalBulanIni int64
	s.db.Model(&domain.Jurnal{}).Where("guru_id = ? AND tanggal BETWEEN ? AND ? AND deleted_at IS NULL", guruID, firstDay, lastDay).Count(&jurnalBulanIni)

	var mengajarHariIni int64
	s.db.Model(&domain.Mengajar{}).Where("guru_id = ? AND hari = ? AND deleted_at IS NULL", guruID, hariIni).Count(&mengajarHariIni)

	var checkInHariIni domain.AbsensiGuru
	checkInErr := s.db.Where("guru_id = ? AND tanggal BETWEEN ? AND ? AND deleted_at IS NULL", guruID, today, tomorrow).First(&checkInHariIni).Error
	sudahCheckIn := checkInErr == nil
	checkInTime := ""
	if sudahCheckIn && checkInHariIni.JamMasuk != nil {
		checkInTime = checkInHariIni.JamMasuk.Format("15:04")
	}

	var hadirBulanIni int64
	s.db.Model(&domain.AbsensiGuru{}).Where("guru_id = ? AND tanggal BETWEEN ? AND ? AND LOWER(status) IN (?,?) AND deleted_at IS NULL", guruID, firstDay, lastDay, "hadir", "terlambat").Count(&hadirBulanIni)

	totalHari := now.Day()
	kehadiranRate := 0.0
	if totalHari > 0 {
		kehadiranRate = math.Round(float64(hadirBulanIni)/float64(totalHari)*1000) / 10
	}

	var perizinanPending int64
	s.db.Model(&domain.Perizinan{}).Where("guru_id = ? AND status = ? AND deleted_at IS NULL", guruID, "Pending").Count(&perizinanPending)

	var requestPending int64
	s.db.Model(&domain.RequestJurnalMundur{}).Where("guru_id = ? AND status = ? AND deleted_at IS NULL", guruID, "pending").Count(&requestPending)

	return map[string]interface{}{
		"jurnal_bulan_ini":  jurnalBulanIni,
		"mengajar_hari_ini": mengajarHariIni,
		"sudah_check_in":    sudahCheckIn,
		"check_in_time":     checkInTime,
		"hadir_bulan_ini":   hadirBulanIni,
		"kehadiran_rate":    kehadiranRate,
		"perizinan_pending": perizinanPending,
		"request_pending":   requestPending,
		"hari_ini":          hariIni,
	}, nil
}

func (s *reportService) GetAdminDashboard() (map[string]interface{}, error) {
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	var totalGuru, totalSiswa, totalKelas int64
	s.db.Model(&domain.Guru{}).Count(&totalGuru)
	s.db.Model(&domain.Siswa{}).Count(&totalSiswa)
	s.db.Model(&domain.Kelas{}).Count(&totalKelas)

	var jurnalHariIni int64
	s.db.Model(&domain.Jurnal{}).Where("tanggal BETWEEN ? AND ?", today, tomorrow).Count(&jurnalHariIni)

	// tbl_absensi tidak punya kolom tanggal, gunakan created_at, status = 'Hadir'
	var siswaHadir, siswaTerlambat int64
	s.db.Raw("SELECT COUNT(*) FROM tbl_absensi WHERE created_at BETWEEN ? AND ? AND LOWER(status) = ? AND deleted_at IS NULL", today, tomorrow, "hadir").Scan(&siswaHadir)
	s.db.Raw("SELECT COUNT(*) FROM tbl_absensi WHERE created_at BETWEEN ? AND ? AND LOWER(status) = ? AND deleted_at IS NULL", today, tomorrow, "terlambat").Scan(&siswaTerlambat)

	// tbl_absensi_guru punya kolom tanggal, status = 'Hadir'
	var guruHadir, guruTidakHadir int64
	s.db.Raw("SELECT COUNT(*) FROM tbl_absensi_guru WHERE tanggal BETWEEN ? AND ? AND LOWER(status) IN (?,?) AND deleted_at IS NULL", today, tomorrow, "hadir", "terlambat").Scan(&guruHadir)
	guruTidakHadir = totalGuru - guruHadir
	if guruTidakHadir < 0 {
		guruTidakHadir = 0
	}

	return map[string]interface{}{
		"total_guru":           totalGuru,
		"total_siswa":          totalSiswa,
		"total_kelas":          totalKelas,
		"jurnal_hari_ini":      jurnalHariIni,
		"siswa_hadir_hari_ini": siswaHadir,
		"siswa_terlambat":      siswaTerlambat,
		"guru_hadir_hari_ini":  guruHadir,
		"guru_tidak_hadir":     guruTidakHadir,
	}, nil
}

// ─── QR SERVICE ───────────────────────────────────────────────────────────────
type QRService interface {
	GenerateSiswaQR(siswaID uint) (string, error)
	GenerateGuruQR(guruID uint) (string, error)
	GenerateBatchQR(kelasID uint) ([]map[string]interface{}, error)
}

type qrService struct {
	siswaRepo domain.SiswaRepository
	guruRepo  domain.GuruRepository
}

func NewQRService(siswaRepo domain.SiswaRepository, guruRepo domain.GuruRepository) QRService {
	return &qrService{siswaRepo, guruRepo}
}

func (s *qrService) GenerateSiswaQR(siswaID uint) (string, error) {
	siswa, err := s.siswaRepo.FindByID(siswaID)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("JURNAL_QR:siswa:%d:%s", siswa.ID, siswa.NIS), nil
}

func (s *qrService) GenerateGuruQR(guruID uint) (string, error) {
	guru, err := s.guruRepo.FindByID(guruID)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("JURNAL_QR:guru:%d:%s", guru.ID, guru.NIP), nil
}

func (s *qrService) GenerateBatchQR(kelasID uint) ([]map[string]interface{}, error) {
	siswas, err := s.siswaRepo.GetByKelasID(kelasID)
	if err != nil {
		return nil, err
	}
	var result []map[string]interface{}
	for _, s := range siswas {
		result = append(result, map[string]interface{}{
			"siswa_id": s.ID,
			"nama":     s.Nama,
			"nis":      s.NIS,
			"qr_code":  fmt.Sprintf("JURNAL_QR:siswa:%d:%s", s.ID, s.NIS),
		})
	}
	return result, nil
}

// ─── PROFILE SERVICE ──────────────────────────────────────────────────────────
type ProfileService interface {
	UpdateProfile(userID uint, req dto.UpdateProfileRequest) (*dto.FullProfileResponse, error)
	GetProfileFull(userID uint) (*dto.FullProfileResponse, error)
}

type profileService struct {
	userRepo  domain.UserRepository
	guruRepo  domain.GuruRepository
	siswaRepo domain.SiswaRepository
	ortuRepo  domain.OrangTuaRepository
}

func NewProfileService(userRepo domain.UserRepository, guruRepo domain.GuruRepository, siswaRepo domain.SiswaRepository, ortuRepo domain.OrangTuaRepository) ProfileService {
	return &profileService{userRepo, guruRepo, siswaRepo, ortuRepo}
}

func (s *profileService) GetProfileFull(userID uint) (*dto.FullProfileResponse, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user tidak ditemukan")
	}
	res := &dto.FullProfileResponse{
		ID:          user.ID,
		Username:    user.Username,
		Email:       user.Email,
		Role:        user.Role,
		NamaLengkap: user.NamaLengkap,
		Phone:       user.Phone,
		FotoURL:     user.FotoURL,
	}
	switch user.Role {
	case "guru", "wali_kelas", "guru_bk", "counselor", "kepsek":
		guru, err := s.guruRepo.FindByUserID(userID)
		if err == nil && guru != nil {
			res.GuruID = &guru.ID
			res.NIP = guru.NIP
			res.Gelar = guru.Gelar
			res.Gender = guru.Gender
			res.Alamat = guru.Alamat
			// Fallback: jika tbl_users belum diisi, ambil dari tbl_guru
			if res.NamaLengkap == "" {
				res.NamaLengkap = guru.Nama
			}
			if res.Phone == "" {
				res.Phone = guru.Phone
			}
		}
	case "siswa":
		siswa, err := s.siswaRepo.FindByUserID(userID)
		if err == nil && siswa != nil {
			res.SiswaID = &siswa.ID
			res.NISN = siswa.NISN
			res.NIS = siswa.NIS
			res.Gender = siswa.Gender
			res.Alamat = siswa.Alamat
			res.Instagram = siswa.Instagram
			res.Youtube = siswa.Youtube
			res.NamaAyah = siswa.NamaAyah
			res.NamaIbu = siswa.NamaIbu
			res.WAOrtu = siswa.WAOrtu
			res.KelasID = &siswa.KelasID
			res.JurusanID = &siswa.JurusanID
			if siswa.Kelas != nil {
				res.NamaKelas = siswa.Kelas.NamaKelas
			}
			if siswa.Jurusan.ID > 0 {
				res.NamaJurusan = siswa.Jurusan.NamaJurusan
			}
			// Fallback: jika tbl_users belum diisi, ambil dari tbl_siswa
			if res.NamaLengkap == "" {
				res.NamaLengkap = siswa.Nama
			}
			if res.Phone == "" {
				res.Phone = siswa.Phone
			}
			if res.FotoURL == "" && siswa.FotoURL != "" {
				res.FotoURL = siswa.FotoURL
			}
		}
	case "orang_tua":
		ortu, err := s.ortuRepo.FindByUserID(userID)
		if err == nil && ortu != nil {
			res.OrtuID = &ortu.ID
			res.NamaOrtu = ortu.Nama
			res.Pekerjaan = ortu.Pekerjaan
			res.Alamat = ortu.Alamat
			// Fallback
			if res.NamaLengkap == "" {
				res.NamaLengkap = ortu.Nama
			}
			if res.Phone == "" {
				res.Phone = ortu.Phone
			}
		}
	}
	return res, nil
}

func (s *profileService) UpdateProfile(userID uint, req dto.UpdateProfileRequest) (*dto.FullProfileResponse, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user tidak ditemukan")
	}
	if req.NamaLengkap != "" {
		user.NamaLengkap = req.NamaLengkap
	}
	if req.Email != "" {
		existing, err := s.userRepo.FindByEmail(req.Email)
		if err == nil && existing != nil && existing.ID != userID {
			return nil, fmt.Errorf("email '%s' sudah digunakan oleh akun lain", req.Email)
		}
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.FotoURL != "" {
		user.FotoURL = req.FotoURL
	}
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	// Update role-specific tables
	switch user.Role {
	case "guru", "wali_kelas", "guru_bk", "counselor", "kepsek":
		guru, err := s.guruRepo.FindByUserID(userID)
		if err == nil && guru != nil {
			if req.NamaLengkap != "" {
				guru.Nama = req.NamaLengkap
			}
			if req.Gelar != "" {
				guru.Gelar = req.Gelar
			}
			if req.Gender != "" {
				guru.Gender = req.Gender
			}
			if req.Alamat != "" {
				guru.Alamat = req.Alamat
			}
			if req.Phone != "" {
				guru.Phone = req.Phone
			}
			_ = s.guruRepo.Update(guru)
		}
	case "siswa":
		siswa, err := s.siswaRepo.FindByUserID(userID)
		if err == nil && siswa != nil {
			if req.NamaLengkap != "" {
				siswa.Nama = req.NamaLengkap
			}
			if req.Phone != "" {
				siswa.Phone = req.Phone
			}
			if req.Gender != "" {
				siswa.Gender = req.Gender
			}
			if req.Alamat != "" {
				siswa.Alamat = req.Alamat
			}
			if req.Instagram != "" {
				siswa.Instagram = req.Instagram
			}
			if req.Youtube != "" {
				siswa.Youtube = req.Youtube
			}
			if req.NamaAyah != "" {
				siswa.NamaAyah = req.NamaAyah
			}
			if req.NamaIbu != "" {
				siswa.NamaIbu = req.NamaIbu
			}
			if req.WAOrtu != "" {
				siswa.WAOrtu = req.WAOrtu
			}
			// Sync foto ke tbl_siswa juga
			if req.FotoURL != "" {
				siswa.FotoURL = req.FotoURL
			}
			_ = s.siswaRepo.Update(siswa)
		}
	case "orang_tua":
		ortu, err := s.ortuRepo.FindByUserID(userID)
		if err == nil && ortu != nil {
			if req.NamaOrtu != "" {
				ortu.Nama = req.NamaOrtu
			}
			if req.Phone != "" {
				ortu.Phone = req.Phone
			}
			if req.Pekerjaan != "" {
				ortu.Pekerjaan = req.Pekerjaan
			}
			if req.Alamat != "" {
				ortu.Alamat = req.Alamat
			}
			_ = s.ortuRepo.Update(ortu)
		}
	}
	return s.GetProfileFull(userID)
}

// ─── PESAN SERVICE ────────────────────────────────────────────────────────────
type PesanService interface {
	KirimPesan(dariUserID uint, req dto.KirimPesanRequest) (*domain.Pesan, error)
	GetInbox(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.Pesan], error)
	GetSent(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.Pesan], error)
	BacaPesan(id uint) error
	HapusPesan(id uint) error
	CountUnread(userID uint) (int64, error)
	ListUsers(userRepo domain.UserRepository) ([]domain.User, error)
}

type pesanService struct {
	pesanRepo domain.PesanRepository
	userRepo  domain.UserRepository
}

func NewPesanService(pesanRepo domain.PesanRepository, userRepo domain.UserRepository) PesanService {
	return &pesanService{pesanRepo, userRepo}
}

func (s *pesanService) KirimPesan(dariUserID uint, req dto.KirimPesanRequest) (*domain.Pesan, error) {
	p := &domain.Pesan{DariUserID: dariUserID, KeUserID: req.KeUserID, Judul: req.Judul, Isi: req.Isi}
	return p, s.pesanRepo.Create(p)
}

func (s *pesanService) GetInbox(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.Pesan], error) {
	return s.pesanRepo.ListInbox(param, userID)
}

func (s *pesanService) GetSent(param domain.PaginationParam, userID uint) (*domain.PaginatedResult[domain.Pesan], error) {
	return s.pesanRepo.ListSent(param, userID)
}

func (s *pesanService) BacaPesan(id uint) error  { return s.pesanRepo.MarkAsRead(id) }
func (s *pesanService) HapusPesan(id uint) error { return s.pesanRepo.Delete(id) }

func (s *pesanService) CountUnread(userID uint) (int64, error) {
	var count int64
	// Use userRepo's DB via a direct count — we expose via repo method
	return count, nil
}

func (s *pesanService) ListUsers(userRepo domain.UserRepository) ([]domain.User, error) {
	return userRepo.ListAll()
}
