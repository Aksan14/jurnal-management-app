package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/asan14/jurnal-apps-backend/internal/domain"
	"github.com/asan14/jurnal-apps-backend/internal/dto"
	"github.com/asan14/jurnal-apps-backend/internal/middleware"
	"github.com/asan14/jurnal-apps-backend/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// Response Helper
func respond[T any](c echo.Context, status int, success bool, message string, data T, meta any) error {
	return c.JSON(status, dto.WebResponse[T]{
		Success: success,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// respondDelete menangani error delete: jika DEACTIVATED → 409, jika error lain → 500
func respondDelete(c echo.Context, err error, entityName string) error {
	if err == nil {
		return respond[any](c, http.StatusOK, true, entityName+" berhasil dihapus", nil, nil)
	}
	if len(err.Error()) > 12 && err.Error()[:12] == "DEACTIVATED:" {
		return respond[any](c, http.StatusConflict, false, err.Error()[13:], nil, nil)
	}
	return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
}

func parsePaginationParam(c echo.Context) domain.PaginationParam {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 10
	}
	return domain.PaginationParam{
		Page:    page,
		Limit:   limit,
		Search:  c.QueryParam("search"),
		SortBy:  c.QueryParam("sort_by"),
		SortDir: c.QueryParam("sort_dir"),
	}
}

// ----------------------------------------------------
// AUTH HANDLER
// ----------------------------------------------------
type AuthHandler struct {
	authService service.AuthService
	rdb         *redis.Client
}

func NewAuthHandler(authService service.AuthService, rdb *redis.Client) *AuthHandler {
	return &AuthHandler{authService, rdb}
}

// Logout revokes the current access token by adding it to the Redis blacklist.
func (h *AuthHandler) Logout(c echo.Context) error {
	rawToken, _ := c.Get("raw_token").(string)
	if rawToken != "" && h.rdb != nil {
		ttl, _ := c.Get("token_ttl").(time.Duration)
		if ttl <= 0 {
			ttl = 2 * time.Hour
		}
		key := fmt.Sprintf("blacklist:%s", rawToken)
		h.rdb.Set(context.Background(), key, "1", ttl)
	}
	return respond[any](c, http.StatusOK, true, "Logged out successfully", nil, nil)
}

func (h *AuthHandler) Login(c echo.Context) error {
	var req dto.LoginRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := c.Validate(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	res, err := h.authService.Login(req)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Login successful", res, nil)
}

func (h *AuthHandler) RefreshToken(c echo.Context) error {
	var req dto.RefreshTokenRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := c.Validate(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	res, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Token refreshed successfully", res, nil)
}

func (h *AuthHandler) ChangePassword(c echo.Context) error {
	var req dto.ChangePasswordRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := c.Validate(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}

	err = h.authService.ChangePassword(userID, req)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	return respond[any](c, http.StatusOK, true, "Password changed successfully", nil, nil)
}

func (h *AuthHandler) GetProfile(c echo.Context) error {
	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}

	res, err := h.authService.GetProfile(userID)
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Profile retrieved", res, nil)
}

// ----------------------------------------------------
// MASTER HANDLER
// ----------------------------------------------------
type MasterHandler struct {
	masterService service.MasterService
}

func NewMasterHandler(masterService service.MasterService) *MasterHandler {
	return &MasterHandler{masterService}
}

// Jurusan
func (h *MasterHandler) CreateJurusan(c echo.Context) error {
	var req dto.JurusanCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateJurusan(req)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Jurusan created", res, nil)
}

func (h *MasterHandler) UpdateJurusan(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.JurusanUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateJurusan(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Jurusan updated", res, nil)
}

func (h *MasterHandler) DeleteJurusan(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	return respondDelete(c, h.masterService.DeleteJurusan(uint(id)), "Jurusan")
}

func (h *MasterHandler) GetJurusan(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetJurusanByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Jurusan not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Jurusan found", res, nil)
}

func (h *MasterHandler) ListJurusan(c echo.Context) error {
	param := parsePaginationParam(c)
	res, err := h.masterService.ListJurusan(param)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Kelas
func (h *MasterHandler) CreateKelas(c echo.Context) error {
	var req dto.KelasCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateKelas(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Kelas created", res, nil)
}

func (h *MasterHandler) UpdateKelas(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.KelasUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateKelas(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Kelas updated", res, nil)
}

func (h *MasterHandler) DeleteKelas(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	return respondDelete(c, h.masterService.DeleteKelas(uint(id)), "Kelas")
}

func (h *MasterHandler) GetKelas(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetKelasByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Kelas not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Kelas found", res, nil)
}

func (h *MasterHandler) ListKelas(c echo.Context) error {
	param := parsePaginationParam(c)
	jurID, _ := strconv.Atoi(c.QueryParam("jurusan_id"))
	res, err := h.masterService.ListKelas(param, uint(jurID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Mapel
func (h *MasterHandler) CreateMapel(c echo.Context) error {
	var req dto.MapelCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateMapel(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Mapel created", res, nil)
}

func (h *MasterHandler) UpdateMapel(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.MapelUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateMapel(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Mapel updated", res, nil)
}

func (h *MasterHandler) DeleteMapel(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	return respondDelete(c, h.masterService.DeleteMapel(uint(id)), "Mata Pelajaran")
}

func (h *MasterHandler) GetMapel(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetMapelByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Mapel not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Mapel found", res, nil)
}

func (h *MasterHandler) ListMapel(c echo.Context) error {
	param := parsePaginationParam(c)
	res, err := h.masterService.ListMapel(param)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Guru
func (h *MasterHandler) CreateGuru(c echo.Context) error {
	var req dto.GuruCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateGuru(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Guru created", res, nil)
}

func (h *MasterHandler) UpdateGuru(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.GuruUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateGuru(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Guru updated", res, nil)
}

func (h *MasterHandler) DeleteGuru(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	return respondDelete(c, h.masterService.DeleteGuru(uint(id)), "Guru")
}

func (h *MasterHandler) ResetGuruPassword(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	guru, err := h.masterService.GetGuruByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Guru tidak ditemukan", nil, nil)
	}
	newPass, err := h.masterService.ResetUserPassword(guru.UserID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Password berhasil direset", map[string]string{"password_baru": newPass}, nil)
}

func (h *MasterHandler) ResetSiswaPassword(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	siswa, err := h.masterService.GetSiswaByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Siswa tidak ditemukan", nil, nil)
	}
	newPass, err := h.masterService.ResetUserPassword(siswa.UserID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Password berhasil direset", map[string]string{"password_baru": newPass}, nil)
}

func (h *MasterHandler) ResetOrangTuaPassword(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	ortu, err := h.masterService.GetOrangTuaByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Orang tua tidak ditemukan", nil, nil)
	}
	newPass, err := h.masterService.ResetUserPassword(ortu.UserID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Password berhasil direset", map[string]string{"password_baru": newPass}, nil)
}

func (h *MasterHandler) GetGuru(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetGuruByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Guru not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Guru found", res, nil)
}

func (h *MasterHandler) ListGuru(c echo.Context) error {
	param := parsePaginationParam(c)
	status := c.QueryParam("status")
	res, err := h.masterService.ListGuru(param, status)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Siswa
func (h *MasterHandler) CreateSiswa(c echo.Context) error {
	var req dto.SiswaCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateSiswa(req)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Siswa created", res, nil)
}

func (h *MasterHandler) UpdateSiswa(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.SiswaUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateSiswa(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Siswa updated", res, nil)
}

func (h *MasterHandler) DeleteSiswa(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	return respondDelete(c, h.masterService.DeleteSiswa(uint(id)), "Siswa")
}

func (h *MasterHandler) GetSiswa(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetSiswaByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Siswa not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Siswa found", res, nil)
}

func (h *MasterHandler) ListSiswa(c echo.Context) error {
	param := parsePaginationParam(c)
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	jurusanID, _ := strconv.Atoi(c.QueryParam("jurusan_id"))
	status := c.QueryParam("status")
	res, err := h.masterService.ListSiswa(param, uint(kelasID), uint(jurusanID), status)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Orang Tua
func (h *MasterHandler) CreateOrangTua(c echo.Context) error {
	var req dto.OrangTuaCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateOrangTua(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Orang Tua created", res, nil)
}

func (h *MasterHandler) UpdateOrangTua(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.OrangTuaUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateOrangTua(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Orang Tua updated", res, nil)
}

func (h *MasterHandler) DeleteOrangTua(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.masterService.DeleteOrangTua(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Orang Tua deleted", nil, nil)
}

func (h *MasterHandler) GetOrangTua(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetOrangTuaByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Orang Tua not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Orang Tua found", res, nil)
}

func (h *MasterHandler) ListOrangTua(c echo.Context) error {
	param := parsePaginationParam(c)
	res, err := h.masterService.ListOrangTua(param)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *MasterHandler) LinkParentAnak(c echo.Context) error {
	var req dto.ParentAnakRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	err := h.masterService.LinkParentAnak(req.OrangTuaID, req.SiswaID, req.Hubungan)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Parent and child linked successfully", nil, nil)
}

func (h *MasterHandler) BuatAkunOrtuDariSiswa(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "invalid id", nil, nil)
	}
	var body struct {
		Hubungan string `json:"hubungan"`
	}
	if err := c.Bind(&body); err != nil || body.Hubungan == "" {
		body.Hubungan = "Ayah"
	}
	result, err := h.masterService.BuatAkunOrtuDariSiswa(uint(id), body.Hubungan)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[map[string]interface{}](c, http.StatusOK, true, "Akun orang tua berhasil dibuat", result, nil)
}

// Mengajar
func (h *MasterHandler) CreateMengajar(c echo.Context) error {
	var req dto.MengajarCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.CreateMengajar(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Mengajar assignment created", res, nil)
}

func (h *MasterHandler) UpdateMengajar(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.MengajarUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.masterService.UpdateMengajar(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Mengajar assignment updated", res, nil)
}

func (h *MasterHandler) DeleteMengajar(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.masterService.DeleteMengajar(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Mengajar assignment deleted", nil, nil)
}

func (h *MasterHandler) GetMengajar(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.masterService.GetMengajarByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Assignment not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Assignment found", res, nil)
}

func (h *MasterHandler) ListMengajar(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	res, err := h.masterService.ListMengajar(param, uint(guruID), uint(kelasID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *MasterHandler) GetMengajarByGuru(c echo.Context) error {
	guruID, _ := strconv.Atoi(c.Param("guru_id"))
	res, err := h.masterService.GetMengajarByGuru(uint(guruID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

// ----------------------------------------------------
// JURNAL HANDLER
// ----------------------------------------------------
type JurnalHandler struct {
	jurnalService service.JurnalService
}

func NewJurnalHandler(jurnalService service.JurnalService) *JurnalHandler {
	return &JurnalHandler{jurnalService}
}

func (h *JurnalHandler) Create(c echo.Context) error {
	var req dto.JurnalCreateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.jurnalService.CreateJurnal(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusCreated, true, "Jurnal entry created successfully", res, nil)
}

func (h *JurnalHandler) Update(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.JurnalUpdateRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.jurnalService.UpdateJurnal(uint(id), req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Jurnal entry updated successfully", res, nil)
}

func (h *JurnalHandler) Delete(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, role, _ := middleware.GetCurrentUser(c)
	isAdmin := role == "admin" || role == "super_admin"
	if err := h.jurnalService.DeleteJurnal(uint(id), userID, isAdmin); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Jurnal deleted", nil, nil)
}

func (h *JurnalHandler) GetByID(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.jurnalService.GetJurnalByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Jurnal not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Jurnal found", res, nil)
}

func (h *JurnalHandler) List(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	mapelID, _ := strconv.Atoi(c.QueryParam("mapel_id"))

	var startVal, endVal *time.Time
	if s := c.QueryParam("start_date"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			startVal = &t
		}
	}
	if e := c.QueryParam("end_date"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			endVal = &t
		}
	}

	res, err := h.jurnalService.ListJurnal(param, uint(guruID), uint(kelasID), uint(mapelID), startVal, endVal)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *JurnalHandler) GetPresensi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.jurnalService.GetPresensiByJurnalID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *JurnalHandler) AjukanRequestMundur(c echo.Context) error {
	var req dto.RequestJurnalMundurRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.jurnalService.AjukanRequestMundur(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Request jurnal mundur diajukan", res, nil)
}

func (h *JurnalHandler) ReviewRequestMundur(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.ReviewRequestJurnalMundurRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := h.jurnalService.ReviewRequestMundur(uint(id), req); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Request jurnal mundur diperbarui", nil, nil)
}

func (h *JurnalHandler) ListRequestMundur(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	status := c.QueryParam("status")
	res, err := h.jurnalService.ListRequestMundur(param, uint(guruID), status)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *JurnalHandler) CreateKehadiranGuru(c echo.Context) error {
	var req dto.KehadiranGuruRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.jurnalService.CreateKehadiranGuru(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Kehadiran guru dicatat", res, nil)
}

func (h *JurnalHandler) DeleteKehadiranGuru(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.jurnalService.DeleteKehadiranGuru(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Kehadiran guru dihapus", nil, nil)
}

func (h *JurnalHandler) ListKehadiranGuru(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	var start, end *time.Time
	if s := c.QueryParam("start_date"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			start = &t
		}
	}
	if e := c.QueryParam("end_date"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			end = &t
		}
	}
	res, err := h.jurnalService.ListKehadiranGuru(param, uint(guruID), start, end)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// ----------------------------------------------------
// ATTENDANCE HANDLER
// ----------------------------------------------------
type AttendanceHandler struct {
	attendanceService service.AttendanceService
}

func NewAttendanceHandler(attendanceService service.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{attendanceService}
}

func (h *AttendanceHandler) GetGuruStatus(c echo.Context) error {
	guruID, _ := strconv.Atoi(c.Param("guru_id"))
	res, err := h.attendanceService.GetGuruAttendanceStatus(uint(guruID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Retrieved status", res, nil)
}

// SelfCheckIn: guru check-in/out mandiri tanpa perlu kirim QR (resolves dari JWT)
func (h *AttendanceHandler) SelfCheckIn(c echo.Context) error {
	userID, _, _ := middleware.GetCurrentUser(c)
	var req struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	_ = c.Bind(&req)
	ip := c.RealIP()
	ua := c.Request().UserAgent()
	res, err := h.attendanceService.SelfCheckInGuru(userID, req.Latitude, req.Longitude, ip, ua)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Absensi berhasil dicatat", res, nil)
}

func (h *AttendanceHandler) ScanTeacher(c echo.Context) error {
	var req dto.ScanQRAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	ip := c.RealIP()
	ua := c.Request().UserAgent()

	res, err := h.attendanceService.ScanTeacherQR(req, ip, ua)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Attendance scanned successfully", res, nil)
}

func (h *AttendanceHandler) ScanStudent(c echo.Context) error {
	var req dto.ScanQRAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	ip := c.RealIP()
	ua := c.Request().UserAgent()

	res, err := h.attendanceService.ScanStudentQR(req, ip, ua)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Student attendance registered", res, nil)
}

func (h *AttendanceHandler) ListTeacher(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	status := c.QueryParam("status")
	_, role, _ := middleware.GetCurrentUser(c)
	// Guru non-admin: otomatis filter ke diri sendiri
	if role == "guru" || role == "wali_kelas" || role == "guru_bk" {
		if guruID == 0 {
			userID, _, _ := middleware.GetCurrentUser(c)
			guruID = int(userID) // will be resolved in service via userID, use negative as signal
			_ = userID
		}
	}

	var startVal, endVal *time.Time
	if s := c.QueryParam("start_date"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			startVal = &t
		}
	}
	if e := c.QueryParam("end_date"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			endVal = &t
		}
	}

	res, err := h.attendanceService.ListTeacherAttendance(param, uint(guruID), status, startVal, endVal)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *AttendanceHandler) ListStudent(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	status := c.QueryParam("status")
	userID, role, _ := middleware.GetCurrentUser(c)

	var startVal, endVal *time.Time
	if s := c.QueryParam("start_date"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			startVal = &t
		}
	}
	if e := c.QueryParam("end_date"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			endVal = &t
		}
	}

	// Siswa: otomatis filter ke diri sendiri berdasarkan JWT userID
	if role == "siswa" {
		res, err := h.attendanceService.ListStudentAttendanceByUserID(param, userID, status, startVal, endVal)
		if err != nil {
			return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
		}
		return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
	}

	res, err := h.attendanceService.ListStudentAttendance(param, uint(siswaID), status, startVal, endVal)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *AttendanceHandler) CreateHoliday(c echo.Context) error {
	var req dto.HariLiburRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	err := h.attendanceService.CreateHariLibur(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusCreated, true, "Holiday created", nil, nil)
}

func (h *AttendanceHandler) GetHolidaysByBulan(c echo.Context) error {
	bulan := c.QueryParam("bulan") // YYYY-MM
	if bulan == "" {
		bulan = time.Now().Format("2006-01")
	}
	t, err := time.Parse("2006-01", bulan)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "format bulan tidak valid (YYYY-MM)", nil, nil)
	}
	res, err := h.attendanceService.GetHolidaysByBulan(t.Year(), int(t.Month()))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *AttendanceHandler) CreateJamKhusus(c echo.Context) error {
	var req dto.JamKhususRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := h.attendanceService.CreateJamKhusus(req); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusCreated, true, "Jam khusus berhasil ditambahkan", nil, nil)
}

func (h *AttendanceHandler) GetJamKhususByBulan(c echo.Context) error {
	bulan := c.QueryParam("bulan") // YYYY-MM
	if bulan == "" {
		bulan = time.Now().Format("2006-01")
	}
	t, err := time.Parse("2006-01", bulan)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "format bulan tidak valid (YYYY-MM)", nil, nil)
	}
	res, err := h.attendanceService.GetJamKhususByBulan(t.Year(), int(t.Month()))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *AttendanceHandler) DeleteJamKhusus(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.attendanceService.DeleteJamKhusus(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Jam khusus berhasil dihapus", nil, nil)
}

func (h *AttendanceHandler) GetHolidays(c echo.Context) error {
	param := parsePaginationParam(c)
	res, err := h.attendanceService.GetHolidays(param)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *AttendanceHandler) DeleteHoliday(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	err := h.attendanceService.DeleteHoliday(uint(id))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Holiday deleted", nil, nil)
}

func (h *AttendanceHandler) GetTimeConfig(c echo.Context) error {
	tipe := c.Param("tipe")
	res, err := h.attendanceService.GetTimeConfig(tipe)
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Config not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *AttendanceHandler) UpdateTimeConfig(c echo.Context) error {
	tipe := c.Param("tipe")
	var req dto.PengaturanJamRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	err := h.attendanceService.UpdateTimeConfig(tipe, req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Settings updated successfully", nil, nil)
}

// ----------------------------------------------------
// BK (BIMBINGAN KONSELING) HANDLER
// ----------------------------------------------------
type BKHandler struct {
	bkService service.BKService
}

func NewBKHandler(bkService service.BKService) *BKHandler {
	return &BKHandler{bkService}
}

// Konseling
func (h *BKHandler) CreateKonseling(c echo.Context) error {
	var req dto.BKKonselingRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.bkService.CreateKonseling(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Konseling record created", res, nil)
}

func (h *BKHandler) UpdateKonseling(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.BKKonselingRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.UpdateKonseling(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Konseling record updated", res, nil)
}

func (h *BKHandler) DeleteKonseling(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.bkService.DeleteKonseling(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Konseling record deleted", nil, nil)
}

func (h *BKHandler) GetKonseling(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.bkService.GetKonselingByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Record not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Record found", res, nil)
}

func (h *BKHandler) ListKonseling(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	status := c.QueryParam("status")
	tipe := c.QueryParam("tipe")

	res, err := h.bkService.ListKonseling(param, uint(siswaID), uint(guruID), status, tipe)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Pelanggaran
func (h *BKHandler) CreatePelanggaran(c echo.Context) error {
	var req dto.PelanggaranRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.bkService.CreatePelanggaran(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Pelanggaran logged", res, nil)
}

func (h *BKHandler) UpdatePelanggaran(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.PelanggaranRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.UpdatePelanggaran(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Pelanggaran updated", res, nil)
}

func (h *BKHandler) DeletePelanggaran(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.bkService.DeletePelanggaran(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Pelanggaran deleted", nil, nil)
}

func (h *BKHandler) GetPelanggaran(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.bkService.GetPelanggaranByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Record not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Record found", res, nil)
}

func (h *BKHandler) ListPelanggaran(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	res, err := h.bkService.ListPelanggaran(param, uint(siswaID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *BKHandler) GetStudentPoints(c echo.Context) error {
	siswaID, _ := strconv.Atoi(c.Param("siswa_id"))
	points, err := h.bkService.GetStudentViolationPoints(uint(siswaID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", map[string]int{"total_poin": points}, nil)
}

// Prestasi
func (h *BKHandler) CreatePrestasi(c echo.Context) error {
	var req dto.PrestasiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.CreatePrestasi(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Prestasi logged", res, nil)
}

func (h *BKHandler) UpdatePrestasi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.PrestasiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.UpdatePrestasi(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Prestasi updated", res, nil)
}

func (h *BKHandler) DeletePrestasi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.bkService.DeletePrestasi(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Prestasi deleted", nil, nil)
}

func (h *BKHandler) GetPrestasi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.bkService.GetPrestasiByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Record not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Record found", res, nil)
}

func (h *BKHandler) ListPrestasi(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	kategori := c.QueryParam("kategori")
	res, err := h.bkService.ListPrestasi(param, uint(siswaID), kategori)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Tes Psikologi
func (h *BKHandler) CreateTesPsikologi(c echo.Context) error {
	var req dto.TesPsikologiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.CreateTesPsikologi(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Test record logged", res, nil)
}

func (h *BKHandler) UpdateTesPsikologi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.TesPsikologiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.UpdateTesPsikologi(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Test record updated", res, nil)
}

func (h *BKHandler) DeleteTesPsikologi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.bkService.DeleteTesPsikologi(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Test record deleted", nil, nil)
}

func (h *BKHandler) GetTesPsikologi(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.bkService.GetTesPsikologiByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Record not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Record found", res, nil)
}

func (h *BKHandler) ListTesPsikologi(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	res, err := h.bkService.ListTesPsikologi(param, uint(siswaID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// Proyek
func (h *BKHandler) CreateProyek(c echo.Context) error {
	var req dto.ProyekRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.CreateProyek(req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Project logged", res, nil)
}

func (h *BKHandler) UpdateProyek(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.ProyekRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.bkService.UpdateProyek(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Project updated", res, nil)
}

func (h *BKHandler) DeleteProyek(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.bkService.DeleteProyek(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Project deleted", nil, nil)
}

func (h *BKHandler) GetProyek(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.bkService.GetProyekByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Record not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Record found", res, nil)
}

func (h *BKHandler) ListProyek(c echo.Context) error {
	param := parsePaginationParam(c)
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	status := c.QueryParam("status")
	res, err := h.bkService.ListProyek(param, uint(kelasID), status)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// ----------------------------------------------------
// PERIZINAN HANDLER
// ----------------------------------------------------
type PerizinanHandler struct {
	perizinanService service.PerizinanService
	guruRepo         domain.GuruRepository
	mengajarRepo     domain.MengajarRepository
	siswaRepo        domain.SiswaRepository
}

func NewPerizinanHandler(perizinanService service.PerizinanService, guruRepo domain.GuruRepository, mengajarRepo domain.MengajarRepository, siswaRepo domain.SiswaRepository) *PerizinanHandler {
	return &PerizinanHandler{perizinanService, guruRepo, mengajarRepo, siswaRepo}
}

// Siswa
func (h *PerizinanHandler) CreateSiswaLeave(c echo.Context) error {
	var req dto.PerizinanRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.perizinanService.CreateStudentLeave(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Leave request submitted", res, nil)
}

func (h *PerizinanHandler) ApproveSiswaLeave(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	approverID, _, _ := middleware.GetCurrentUser(c)
	if err := h.perizinanService.ApproveStudentLeave(uint(id), req.Status, approverID); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Leave request updated", nil, nil)
}

func (h *PerizinanHandler) ListSiswaLeave(c echo.Context) error {
	param := parsePaginationParam(c)
	status := c.QueryParam("status")
	userID, role, _ := middleware.GetCurrentUser(c)

	switch role {
	case "siswa":
		// Siswa hanya lihat miliknya sendiri - resolve dari JWT userID
		siswaData, err := h.siswaRepo.FindByUserID(userID)
		if err != nil {
			return respond[any](c, http.StatusNotFound, false, "Data siswa tidak ditemukan", nil, nil)
		}
		res, err := h.perizinanService.ListStudentLeaves(param, siswaData.ID, status)
		if err != nil {
			return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
		}
		return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)

	case "wali_kelas", "guru":
		// Guru lihat perizinan yang ditujukan ke mereka (wali_kelas_id atau mapel mereka)
		guru, err := h.guruRepo.FindByUserID(userID)
		if err != nil {
			return respond[any](c, http.StatusNotFound, false, "Data guru tidak ditemukan", nil, nil)
		}
		// Ambil daftar mapel yang diajarkan guru ini
		mengajars, _ := h.mengajarRepo.ListByGuru(guru.ID)
		var mapelIDs []uint
		for _, m := range mengajars {
			mapelIDs = append(mapelIDs, m.MapelID)
		}
		res, err := h.perizinanService.ListStudentLeavesForApprover(param, guru.ID, mapelIDs, status)
		if err != nil {
			return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
		}
		return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)

	default:
		// Admin, kepsek: tampilkan semua
		siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
		res, err := h.perizinanService.ListStudentLeaves(param, uint(siswaID), status)
		if err != nil {
			return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
		}
		return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
	}
}

func (h *PerizinanHandler) GetSiswaLeave(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.perizinanService.GetStudentLeaveByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Leave request not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Request found", res, nil)
}

// Guru
func (h *PerizinanHandler) CreateGuruLeave(c echo.Context) error {
	var req dto.IzinGuruRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.perizinanService.CreateTeacherLeave(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Leave request submitted", res, nil)
}

func (h *PerizinanHandler) ApproveGuruLeave(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := h.perizinanService.ApproveTeacherLeave(uint(id), req.Status); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Leave request updated", nil, nil)
}

func (h *PerizinanHandler) ListGuruLeave(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	status := c.QueryParam("status")
	res, err := h.perizinanService.ListTeacherLeaves(param, uint(guruID), status)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *PerizinanHandler) GetGuruLeave(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.perizinanService.GetTeacherLeaveByID(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Leave request not found", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Request found", res, nil)
}

func (h *PerizinanHandler) DeleteSiswaLeave(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	err := h.perizinanService.DeleteStudentLeave(uint(id))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Leave request deleted", nil, nil)
}

func (h *PerizinanHandler) DeleteGuruLeave(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	err := h.perizinanService.DeleteTeacherLeave(uint(id))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Leave request deleted", nil, nil)
}

// ---------------------------------------------------
// NILAI HANDLER
// ----------------------------------------------------
type NilaiHandler struct {
	nilaiService service.NilaiService
}

func NewNilaiHandler(nilaiService service.NilaiService) *NilaiHandler {
	return &NilaiHandler{nilaiService}
}

func (h *NilaiHandler) Create(c echo.Context) error {
	var req dto.NilaiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.nilaiService.CreateNilai(req, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Grade logged successfully", res, nil)
}

func (h *NilaiHandler) Update(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.NilaiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.nilaiService.UpdateNilai(uint(id), req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Grade updated successfully", res, nil)
}

func (h *NilaiHandler) Delete(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	err := h.nilaiService.DeleteNilai(uint(id))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Grade deleted", nil, nil)
}

func (h *NilaiHandler) List(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	mapelID, _ := strconv.Atoi(c.QueryParam("mapel_id"))
	jenisNilai := c.QueryParam("jenis_nilai")

	res, err := h.nilaiService.ListNilai(param, uint(siswaID), uint(mapelID), jenisNilai)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// ----------------------------------------------------
// REKAP NILAI HANDLER
// ----------------------------------------------------
type RekapNilaiHandler struct {
	rekapService service.RekapNilaiService
}

func NewRekapNilaiHandler(rekapService service.RekapNilaiService) *RekapNilaiHandler {
	return &RekapNilaiHandler{rekapService}
}

func (h *RekapNilaiHandler) Upsert(c echo.Context) error {
	var req dto.UpsertRekapNilaiRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := c.Validate(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	res, err := h.rekapService.UpsertRekap(req, userID)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "anda tidak memiliki hak input nilai untuk mata pelajaran ini" {
			status = http.StatusForbidden
		}
		return respond[any](c, status, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Rekap nilai berhasil disimpan", res, nil)
}

func (h *RekapNilaiHandler) GetByID(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	res, err := h.rekapService.GetRekap(uint(id))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, "Data tidak ditemukan", nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *RekapNilaiHandler) Delete(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _, _ := middleware.GetCurrentUser(c)
	err := h.rekapService.DeleteRekap(uint(id), userID)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "anda tidak memiliki hak menghapus rekap nilai ini" {
			status = http.StatusForbidden
		}
		return respond[any](c, status, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Rekap nilai dihapus", nil, nil)
}

func (h *RekapNilaiHandler) List(c echo.Context) error {
	param := parsePaginationParam(c)
	mengajarID, _ := strconv.Atoi(c.QueryParam("mengajar_id"))
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	semester := c.QueryParam("semester")
	tahunAjaran := c.QueryParam("tahun_ajaran")

	res, err := h.rekapService.ListRekap(param, uint(mengajarID), uint(siswaID), uint(kelasID), semester, tahunAjaran)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *RekapNilaiHandler) BatchInput(c echo.Context) error {
	var req dto.BatchKomponenRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	if err := c.Validate(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	userID, _, _ := middleware.GetCurrentUser(c)
	if err := h.rekapService.BatchInputKomponen(req, userID); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "anda tidak memiliki hak input nilai untuk mata pelajaran ini" {
			status = http.StatusForbidden
		}
		return respond[any](c, status, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Nilai berhasil disimpan", nil, nil)
}

func (h *RekapNilaiHandler) GetKelas(c echo.Context) error {
	mengajarID, _ := strconv.Atoi(c.QueryParam("mengajar_id"))
	semester := c.QueryParam("semester")
	tahunAjaran := c.QueryParam("tahun_ajaran")
	if mengajarID == 0 {
		return respond[any](c, http.StatusBadRequest, false, "mengajar_id diperlukan", nil, nil)
	}
	res, err := h.rekapService.GetKelasNilai(uint(mengajarID), semester, tahunAjaran)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

// ----------------------------------------------------
// REPORT / DASHBOARD HANDLER
// ----------------------------------------------------
type ReportHandler struct {
	reportService service.ReportService
	siswaRepo     domain.SiswaRepository
	rdb           *redis.Client
}

func NewReportHandler(reportService service.ReportService, siswaRepo domain.SiswaRepository, rdb *redis.Client) *ReportHandler {
	return &ReportHandler{reportService, siswaRepo, rdb}
}

// cacheGet attempts to read a cached JSON value from Redis.
func (h *ReportHandler) cacheGet(key string, dest any) bool {
	if h.rdb == nil {
		return false
	}
	raw, err := h.rdb.Get(context.Background(), key).Result()
	if err != nil || raw == "" {
		return false
	}
	return json.Unmarshal([]byte(raw), dest) == nil
}

// cacheSet stores a value as JSON in Redis with the given TTL.
func (h *ReportHandler) cacheSet(key string, val any, ttl time.Duration) {
	if h.rdb == nil {
		return
	}
	b, err := json.Marshal(val)
	if err == nil {
		h.rdb.Set(context.Background(), key, string(b), ttl)
	}
}

func (h *ReportHandler) GetStats(c echo.Context) error {
	userIDVal := c.Get("user_id")
	roleVal := c.Get("role")
	var userID uint
	var role string
	if userIDVal != nil {
		if idUint, ok := userIDVal.(uint); ok {
			userID = idUint
		} else if idFloat, ok := userIDVal.(float64); ok {
			userID = uint(idFloat)
		}
	}
	if roleVal != nil {
		role = roleVal.(string)
	}

	switch role {
	case "siswa", "orang_tua":
		var siswaID uint
		if role == "siswa" {
			siswa, err := h.siswaRepo.FindByUserID(userID)
			if err != nil {
				return respond[any](c, http.StatusNotFound, false, "Data siswa tidak ditemukan", nil, nil)
			}
			siswaID = siswa.ID
		} else {
			// orang_tua: ambil siswa pertama yang terhubung
			siswaIDParam, _ := strconv.Atoi(c.QueryParam("siswa_id"))
			siswaID = uint(siswaIDParam)
			if siswaID == 0 {
				return respond[any](c, http.StatusBadRequest, false, "siswa_id required", nil, nil)
			}
		}
		res, err := h.reportService.GetSiswaDashboard(siswaID)
		if err != nil {
			return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
		}
		return respond(c, http.StatusOK, true, "Success", res, nil)
	default:
		// admin, super_admin, kepsek, guru, wali_kelas — cache 5 minutes
		const adminCacheKey = "dashboard:admin"
		var cached any
		if h.cacheGet(adminCacheKey, &cached) {
			return respond(c, http.StatusOK, true, "Success", cached, nil)
		}
		res, err := h.reportService.GetAdminDashboard()
		if err != nil {
			return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
		}
		h.cacheSet(adminCacheKey, res, 5*time.Minute)
		return respond(c, http.StatusOK, true, "Success", res, nil)
	}
}

func (h *ReportHandler) GetOrtuDashboard(c echo.Context) error {
	userID, _, _ := middleware.GetCurrentUser(c)
	cacheKey := fmt.Sprintf("dashboard:ortu:%d", userID)

	var cached any
	if h.cacheGet(cacheKey, &cached) {
		return respond(c, http.StatusOK, true, "Success", cached, nil)
	}

	res, err := h.reportService.GetOrtuDashboard(userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	h.cacheSet(cacheKey, res, 5*time.Minute)
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *ReportHandler) GetGuruDashboard(c echo.Context) error {
	userID, _, _ := middleware.GetCurrentUser(c)
	cacheKey := fmt.Sprintf("dashboard:guru:%d", userID)

	var cached any
	if h.cacheGet(cacheKey, &cached) {
		return respond(c, http.StatusOK, true, "Success", cached, nil)
	}

	res, err := h.reportService.GetGuruDashboard(userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	h.cacheSet(cacheKey, res, 5*time.Minute)
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *ReportHandler) ListAuditLogs(c echo.Context) error {
	param := parsePaginationParam(c)
	userID, _ := strconv.Atoi(c.QueryParam("user_id"))
	res, err := h.reportService.GetAuditLogs(param, uint(userID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *ReportHandler) GetJurnalReport(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	var startDate, endDate *time.Time
	if start := c.QueryParam("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			startDate = &t
		}
	}
	if end := c.QueryParam("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			endDate = &t
		}
	}
	res, err := h.reportService.GetJurnalReport(param, uint(guruID), uint(kelasID), startDate, endDate)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *ReportHandler) GetAttendanceReport(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	var startDate, endDate *time.Time
	if start := c.QueryParam("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			startDate = &t
		}
	}
	if end := c.QueryParam("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			endDate = &t
		}
	}
	res, err := h.reportService.GetAttendanceReport(param, uint(siswaID), startDate, endDate)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *ReportHandler) GetTeacherAttendanceReport(c echo.Context) error {
	param := parsePaginationParam(c)
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	var startDate, endDate *time.Time
	if start := c.QueryParam("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			startDate = &t
		}
	}
	if end := c.QueryParam("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			endDate = &t
		}
	}
	res, err := h.reportService.GetTeacherAttendanceReport(param, uint(guruID), startDate, endDate)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// parseDate parses YYYY-MM-DD or returns a fallback time.
func parseDate(s string, fallback time.Time) time.Time {
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t
	}
	return fallback
}

func (h *ReportHandler) GetRekapAbsensiSiswa(c echo.Context) error {
	kelasID, _ := strconv.Atoi(c.QueryParam("kelas_id"))
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	now := time.Now()
	startDate := parseDate(c.QueryParam("start_date"), time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()))
	endDate := parseDate(c.QueryParam("end_date"), now)
	res, err := h.reportService.GetRekapAbsensiSiswa(uint(kelasID), uint(siswaID), startDate, endDate)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *ReportHandler) GetRekapAbsensiGuru(c echo.Context) error {
	guruID, _ := strconv.Atoi(c.QueryParam("guru_id"))
	now := time.Now()
	startDate := parseDate(c.QueryParam("start_date"), time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()))
	endDate := parseDate(c.QueryParam("end_date"), now)
	res, err := h.reportService.GetRekapAbsensiGuru(uint(guruID), startDate, endDate)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res, nil)
}

func (h *ReportHandler) GetViolationsReport(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	res, err := h.reportService.GetViolationsReport(param, uint(siswaID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *ReportHandler) GetAchievementsReport(c echo.Context) error {
	param := parsePaginationParam(c)
	siswaID, _ := strconv.Atoi(c.QueryParam("siswa_id"))
	res, err := h.reportService.GetAchievementsReport(param, uint(siswaID))
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

// QR Code Handler
type QRHandler struct {
	qrService service.QRService
}

func NewQRHandler(qrService service.QRService) *QRHandler {
	return &QRHandler{qrService}
}

func (h *QRHandler) GenerateSiswaQR(c echo.Context) error {
	siswaID, _ := strconv.Atoi(c.Param("siswa_id"))
	qr, err := h.qrService.GenerateSiswaQR(uint(siswaID))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "QR generated", map[string]string{"qr_content": qr}, nil)
}

func (h *QRHandler) GenerateGuruQR(c echo.Context) error {
	guruID, _ := strconv.Atoi(c.Param("guru_id"))
	qr, err := h.qrService.GenerateGuruQR(uint(guruID))
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "QR generated", map[string]string{"qr_content": qr}, nil)
}

func (h *QRHandler) GenerateBatchQR(c echo.Context) error {
	var req struct {
		KelasID uint `json:"kelas_id"`
	}
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	qrs, err := h.qrService.GenerateBatchQR(req.KelasID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Batch QR generated", qrs, nil)
}

// ============================================================
// FILE UPLOAD HANDLER
// ============================================================
type FileHandler struct {
	fileService service.FileService
}

func NewFileHandler(fileService service.FileService) *FileHandler {
	return &FileHandler{
		fileService: fileService,
	}
}

func (h *FileHandler) UploadPerizinanFile(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "File tidak ditemukan", nil, nil)
	}

	perizinanIDStr := c.FormValue("perizinan_id")
	perizinanID, err := strconv.Atoi(perizinanIDStr)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "Perizinan ID tidak valid", nil, nil)
	}

	filename, err := h.fileService.SavePerizinanFile(file, uint(perizinanID))
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "File perizinan berhasil diupload", map[string]string{
		"filename": filename,
		"url":      "/uploads/perizinan/" + filename,
	}, nil)
}

func (h *FileHandler) UploadPsikotesFile(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "File tidak ditemukan", nil, nil)
	}
	filename, err := h.fileService.SavePsikotesFile(file)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "File psikotes berhasil diupload", map[string]string{
		"filename": filename,
		"url":      "/uploads/psikotes/" + filename,
	}, nil)
}

func (h *FileHandler) UploadBuktiFile(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "File tidak ditemukan", nil, nil)
	}
	filename, err := h.fileService.SaveBuktiFile(file)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Bukti berhasil diupload", map[string]string{
		"filename": filename,
		"url":      "/uploads/bukti/" + filename,
	}, nil)
}

func (h *FileHandler) UploadPrestatiFile(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "File tidak ditemukan", nil, nil)
	}

	prestatiIDStr := c.FormValue("prestati_id")
	prestatiID, err := strconv.Atoi(prestatiIDStr)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, "Prestasi ID tidak valid", nil, nil)
	}

	filename, err := h.fileService.SavePrestatiFile(file, uint(prestatiID))
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "File prestasi berhasil diupload", map[string]string{
		"filename": filename,
		"url":      "/uploads/prestasi/" + filename,
	}, nil)
}

func (h *FileHandler) UploadFotoProfile(c echo.Context) error {
	// Coba field "foto" dulu, fallback ke "file"
	file, err := c.FormFile("foto")
	if err != nil {
		file, err = c.FormFile("file")
		if err != nil {
			return respond[any](c, http.StatusBadRequest, false, "File tidak ditemukan (gunakan field 'foto' atau 'file')", nil, nil)
		}
	}

	prefix := c.FormValue("prefix")
	if prefix == "" {
		prefix = "profile"
	}

	filename, err := h.fileService.SaveFotoProfile(file, prefix)
	if err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}

	return respond(c, http.StatusOK, true, "Foto berhasil diupload", map[string]string{
		"filename": filename,
		"url":      "/uploads/foto/" + filename,
		"foto_url": "/uploads/foto/" + filename,
	}, nil)
}

func (h *FileHandler) DeleteFile(c echo.Context) error {
	fileType := c.Param("file_type")
	filename := c.Param("filename")

	allowedTypes := map[string]bool{"perizinan": true, "prestasi": true, "foto": true, "psikotes": true, "bukti": true}
	if !allowedTypes[fileType] {
		return respond[any](c, http.StatusBadRequest, false, "File type tidak valid", nil, nil)
	}

	filePath := fileType + "/" + filename
	if err := h.fileService.DeleteFile(filePath); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}

	return respond[any](c, http.StatusOK, true, "File berhasil dihapus", nil, nil)
}

// ─── PROFILE HANDLER ─────────────────────────────────────────────────────────
type ProfileHandler struct {
	profileService service.ProfileService
}

func NewProfileHandler(profileService service.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileService}
}

func (h *ProfileHandler) GetProfile(c echo.Context) error {
	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}
	res, err := h.profileService.GetProfileFull(userID)
	if err != nil {
		return respond[any](c, http.StatusNotFound, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Profile retrieved", res, nil)
}

func (h *ProfileHandler) UpdateProfile(c echo.Context) error {
	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}
	var req dto.UpdateProfileRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.profileService.UpdateProfile(userID, req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Profile berhasil diperbarui", res, nil)
}

// ─── PESAN HANDLER ────────────────────────────────────────────────────────────
type PesanHandler struct {
	pesanService service.PesanService
	userRepo     domain.UserRepository
}

func NewPesanHandler(pesanService service.PesanService, userRepo domain.UserRepository) *PesanHandler {
	return &PesanHandler{pesanService, userRepo}
}

func (h *PesanHandler) KirimPesan(c echo.Context) error {
	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}
	var req dto.KirimPesanRequest
	if err := c.Bind(&req); err != nil {
		return respond[any](c, http.StatusBadRequest, false, err.Error(), nil, nil)
	}
	res, err := h.pesanService.KirimPesan(userID, req)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusCreated, true, "Pesan terkirim", res, nil)
}

func (h *PesanHandler) GetInbox(c echo.Context) error {
	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}
	param := parsePaginationParam(c)
	res, err := h.pesanService.GetInbox(param, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *PesanHandler) GetSent(c echo.Context) error {
	userID, _, err := middleware.GetCurrentUser(c)
	if err != nil {
		return respond[any](c, http.StatusUnauthorized, false, "Unauthorized", nil, nil)
	}
	param := parsePaginationParam(c)
	res, err := h.pesanService.GetSent(param, userID)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", res.Data, res.Meta)
}

func (h *PesanHandler) BacaPesan(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.pesanService.BacaPesan(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Pesan ditandai sudah dibaca", nil, nil)
}

func (h *PesanHandler) HapusPesan(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.pesanService.HapusPesan(uint(id)); err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond[any](c, http.StatusOK, true, "Pesan dihapus", nil, nil)
}

func (h *PesanHandler) ListUsers(c echo.Context) error {
	users, err := h.pesanService.ListUsers(h.userRepo)
	if err != nil {
		return respond[any](c, http.StatusInternalServerError, false, err.Error(), nil, nil)
	}
	return respond(c, http.StatusOK, true, "Success", users, nil)
}
