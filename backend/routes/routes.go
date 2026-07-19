package routes

import (
	"github.com/asan14/jurnal-apps-backend/config"
	"github.com/asan14/jurnal-apps-backend/internal/handler"
	"github.com/asan14/jurnal-apps-backend/internal/middleware"
	"github.com/asan14/jurnal-apps-backend/internal/repository"
	"github.com/asan14/jurnal-apps-backend/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func SetupRoutes(e *echo.Echo, db *gorm.DB, cfg *config.Config, rdb *redis.Client) {
	userRepo := repository.NewUserRepository(db)
	guruRepo := repository.NewGuruRepository(db)
	siswaRepo := repository.NewSiswaRepository(db)
	ortuRepo := repository.NewOrangTuaRepository(db)
	anakOrtuRepo := repository.NewAnakOrangTuaRepository(db)
	kelasRepo := repository.NewKelasRepository(db)
	jurusanRepo := repository.NewJurusanRepository(db)
	mapelRepo := repository.NewMapelRepository(db)
	mengajarRepo := repository.NewMengajarRepository(db)
	jurnalRepo := repository.NewJurnalRepository(db)
	absSiswaRepo := repository.NewAbsensiRepository(db)
	absGuruRepo := repository.NewAbsensiGuruRepository(db)
	liburRepo := repository.NewHariLiburRepository(db)
	jamRepo := repository.NewPengaturanJamRepository(db)
	jamKhususRepo := repository.NewJamKhususRepository(db)
	bkRepo := repository.NewBKKonselingRepository(db)
	pelRepo := repository.NewPelanggaranRepository(db)
	presRepo := repository.NewPrestasiRepository(db)
	tesRepo := repository.NewTesPsikologiRepository(db)
	proyRepo := repository.NewProyekRepository(db)
	perSiswaRepo := repository.NewPerizinanRepository(db)
	perGuruRepo := repository.NewIzinGuruRepository(db)
	pesanRepo := repository.NewPesanRepository(db)
	nilaiRepo := repository.NewNilaiRepository(db)
	auditRepo := repository.NewAuditLogRepository(db)
	kehadiranGuruRepo := repository.NewKehadiranGuruRepository(db)
	requestMundurRepo := repository.NewRequestJurnalMundurRepository(db)

	authService := service.NewAuthService(cfg, userRepo, guruRepo, siswaRepo, ortuRepo, auditRepo)
	masterService := service.NewMasterService(cfg, userRepo, jurusanRepo, kelasRepo, mapelRepo, guruRepo, siswaRepo, ortuRepo, anakOrtuRepo, mengajarRepo)
	jurnalService := service.NewJurnalService(jurnalRepo, absSiswaRepo, mengajarRepo, siswaRepo, liburRepo, jamKhususRepo, kehadiranGuruRepo, requestMundurRepo, guruRepo, pesanRepo, userRepo)
	attendanceService := service.NewAttendanceService(db, absGuruRepo, absSiswaRepo, guruRepo, siswaRepo, liburRepo, jamRepo, jamKhususRepo, jurnalRepo, auditRepo)
	bkService := service.NewBKService(bkRepo, pelRepo, presRepo, tesRepo, proyRepo, guruRepo)
	perizinanService := service.NewPerizinanService(db, perSiswaRepo, perGuruRepo, guruRepo, siswaRepo, pesanRepo, userRepo)
	nilaiService := service.NewNilaiService(nilaiRepo, guruRepo)
	reportService := service.NewReportService(db, guruRepo, siswaRepo, kelasRepo, mapelRepo, jurnalRepo, absGuruRepo, absSiswaRepo, pelRepo, presRepo, auditRepo, anakOrtuRepo)
	qrService := service.NewQRService(siswaRepo, guruRepo)
	fileService := service.NewFileService()
	profileService := service.NewProfileService(userRepo, guruRepo, siswaRepo, ortuRepo)
	pesanService := service.NewPesanService(pesanRepo, userRepo)

	// 3. Handlers
	authHandler := handler.NewAuthHandler(authService, rdb)
	masterHandler := handler.NewMasterHandler(masterService)
	jurnalHandler := handler.NewJurnalHandler(jurnalService)
	attendanceHandler := handler.NewAttendanceHandler(attendanceService)
	bkHandler := handler.NewBKHandler(bkService)
	perizinanHandler := handler.NewPerizinanHandler(perizinanService, guruRepo, mengajarRepo, siswaRepo)
	nilaiHandler := handler.NewNilaiHandler(nilaiService)
	reportHandler := handler.NewReportHandler(reportService, siswaRepo, rdb)
	qrHandler := handler.NewQRHandler(qrService)
	fileHandler := handler.NewFileHandler(fileService)
	profileHandler := handler.NewProfileHandler(profileService)
	pesanHandler := handler.NewPesanHandler(pesanService, userRepo)

	// Route Group
	api := e.Group("/api")

	// Public Routes
	authGroup := api.Group("/auth")
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/refresh", authHandler.RefreshToken)

	// Protected Routes (JWT required)
	jwtMiddleware := middleware.JWTAuthMiddleware(cfg, rdb)
	api.Use(jwtMiddleware)

	// Auth routes yang butuh JWT (di bawah middleware)
	api.POST("/auth/logout", authHandler.Logout)
	api.GET("/auth/profile", authHandler.GetProfile)
	api.POST("/auth/change-password", authHandler.ChangePassword)

	// Profile routes (semua role)
	api.GET("/profile", profileHandler.GetProfile)
	api.PUT("/profile", profileHandler.UpdateProfile)

	// Pesan / Inbox routes (semua role)
	pesanGroup := api.Group("/pesan")
	pesanGroup.GET("/inbox", pesanHandler.GetInbox)
	pesanGroup.GET("/terkirim", pesanHandler.GetSent)
	pesanGroup.GET("/users", pesanHandler.ListUsers)
	pesanGroup.POST("", pesanHandler.KirimPesan)
	pesanGroup.PUT("/:id/baca", pesanHandler.BacaPesan)
	pesanGroup.DELETE("/:id", pesanHandler.HapusPesan)

	// ====================================================
	// MASTER DATA MODULE ROUTES
	// ====================================================
	masterGroup := api.Group("/master")

	// Jurusan
	jurusanGroup := masterGroup.Group("/jurusan")
	jurusanGroup.GET("", masterHandler.ListJurusan)
	jurusanGroup.GET("/:id", masterHandler.GetJurusan)
	jurusanGroup.POST("", masterHandler.CreateJurusan, middleware.RBACMiddleware("admin"))
	jurusanGroup.PUT("/:id", masterHandler.UpdateJurusan, middleware.RBACMiddleware("admin"))
	jurusanGroup.DELETE("/:id", masterHandler.DeleteJurusan, middleware.RBACMiddleware("admin"))

	// Kelas
	kelasGroup := masterGroup.Group("/kelas")
	kelasGroup.GET("", masterHandler.ListKelas)
	kelasGroup.GET("/:id", masterHandler.GetKelas)
	kelasGroup.POST("", masterHandler.CreateKelas, middleware.RBACMiddleware("admin"))
	kelasGroup.PUT("/:id", masterHandler.UpdateKelas, middleware.RBACMiddleware("admin"))
	kelasGroup.DELETE("/:id", masterHandler.DeleteKelas, middleware.RBACMiddleware("admin"))

	// Mapel
	mapelGroup := masterGroup.Group("/mapel")
	mapelGroup.GET("", masterHandler.ListMapel)
	mapelGroup.GET("/:id", masterHandler.GetMapel)
	mapelGroup.POST("", masterHandler.CreateMapel, middleware.RBACMiddleware("admin"))
	mapelGroup.PUT("/:id", masterHandler.UpdateMapel, middleware.RBACMiddleware("admin"))
	mapelGroup.DELETE("/:id", masterHandler.DeleteMapel, middleware.RBACMiddleware("admin"))

	// Guru
	guruGroup := masterGroup.Group("/guru")
	guruGroup.GET("", masterHandler.ListGuru)
	guruGroup.GET("/:id", masterHandler.GetGuru)
	guruGroup.POST("", masterHandler.CreateGuru, middleware.RBACMiddleware("admin"))
	guruGroup.PUT("/:id", masterHandler.UpdateGuru, middleware.RBACMiddleware("admin"))
	guruGroup.DELETE("/:id", masterHandler.DeleteGuru, middleware.RBACMiddleware("admin"))
	guruGroup.POST("/:id/reset-password", masterHandler.ResetGuruPassword, middleware.RBACMiddleware("admin"))

	// Siswa
	siswaGroup := masterGroup.Group("/siswa")
	siswaGroup.GET("", masterHandler.ListSiswa)
	siswaGroup.GET("/:id", masterHandler.GetSiswa)
	siswaGroup.POST("", masterHandler.CreateSiswa, middleware.RBACMiddleware("admin"))
	siswaGroup.PUT("/:id", masterHandler.UpdateSiswa, middleware.RBACMiddleware("admin"))
	siswaGroup.DELETE("/:id", masterHandler.DeleteSiswa, middleware.RBACMiddleware("admin"))
	siswaGroup.POST("/:id/reset-password", masterHandler.ResetSiswaPassword, middleware.RBACMiddleware("admin"))
	siswaGroup.POST("/:id/buat-akun-ortu", masterHandler.BuatAkunOrtuDariSiswa, middleware.RBACMiddleware("admin"))

	// Orang Tua
	ortuGroup := masterGroup.Group("/orangtua")
	ortuGroup.GET("", masterHandler.ListOrangTua)
	ortuGroup.GET("/:id", masterHandler.GetOrangTua)
	ortuGroup.POST("", masterHandler.CreateOrangTua, middleware.RBACMiddleware("admin"))
	ortuGroup.PUT("/:id", masterHandler.UpdateOrangTua, middleware.RBACMiddleware("admin"))
	ortuGroup.DELETE("/:id", masterHandler.DeleteOrangTua, middleware.RBACMiddleware("admin"))
	ortuGroup.POST("/link", masterHandler.LinkParentAnak, middleware.RBACMiddleware("admin"))
	ortuGroup.POST("/:id/reset-password", masterHandler.ResetOrangTuaPassword, middleware.RBACMiddleware("admin"))

	// Mengajar assignments
	mengajarGroup := masterGroup.Group("/mengajar")
	mengajarGroup.GET("", masterHandler.ListMengajar)
	mengajarGroup.GET("/:id", masterHandler.GetMengajar)
	mengajarGroup.POST("", masterHandler.CreateMengajar, middleware.RBACMiddleware("admin"))
	mengajarGroup.PUT("/:id", masterHandler.UpdateMengajar, middleware.RBACMiddleware("admin"))
	mengajarGroup.DELETE("/:id", masterHandler.DeleteMengajar, middleware.RBACMiddleware("admin"))
	mengajarGroup.GET("/guru/:guru_id", masterHandler.GetMengajarByGuru)

	// ====================================================
	// JURNAL MODULE ROUTES
	// ====================================================
	jurnalGroup := api.Group("/jurnal")
	jurnalGroup.GET("", jurnalHandler.List)
	jurnalGroup.GET("/:id", jurnalHandler.GetByID)
	jurnalGroup.POST("", jurnalHandler.Create, middleware.RBACMiddleware("guru", "wali_kelas"))
	jurnalGroup.PUT("/:id", jurnalHandler.Update, middleware.RBACMiddleware("guru", "wali_kelas"))
	jurnalGroup.DELETE("/:id", jurnalHandler.Delete, middleware.RBACMiddleware("guru", "wali_kelas", "admin"))
	jurnalGroup.GET("/:id/presensi", jurnalHandler.GetPresensi)
	// Request Mundur
	jurnalGroup.GET("/request-mundur", jurnalHandler.ListRequestMundur)
	jurnalGroup.POST("/request-mundur", jurnalHandler.AjukanRequestMundur, middleware.RBACMiddleware("guru", "wali_kelas"))
	jurnalGroup.PUT("/request-mundur/:id/review", jurnalHandler.ReviewRequestMundur, middleware.RBACMiddleware("admin"))
	// Kehadiran Guru
	jurnalGroup.GET("/kehadiran-guru", jurnalHandler.ListKehadiranGuru)
	jurnalGroup.POST("/kehadiran-guru", jurnalHandler.CreateKehadiranGuru, middleware.RBACMiddleware("admin"))
	jurnalGroup.DELETE("/kehadiran-guru/:id", jurnalHandler.DeleteKehadiranGuru, middleware.RBACMiddleware("admin"))

	// ====================================================
	// ATTENDANCE MODULE ROUTES
	// ====================================================
	attGroup := api.Group("/attendance")
	attGroup.GET("/guru/:guru_id/status", attendanceHandler.GetGuruStatus)
	attGroup.POST("/self-checkin", attendanceHandler.SelfCheckIn, middleware.RBACMiddleware("guru", "wali_kelas", "guru_bk", "counselor", "kepsek"))
	attGroup.POST("/scan/teacher", attendanceHandler.ScanTeacher, middleware.RBACMiddleware("admin", "guru", "wali_kelas"))
	attGroup.POST("/scan/student", attendanceHandler.ScanStudent, middleware.RBACMiddleware("admin", "guru", "wali_kelas"))
	attGroup.GET("/guru", attendanceHandler.ListTeacher, middleware.RBACMiddleware("admin", "kepsek", "guru", "wali_kelas"))
	attGroup.GET("/siswa", attendanceHandler.ListStudent, middleware.RBACMiddleware("admin", "guru", "wali_kelas", "siswa"))

	// Holidays
	attGroup.GET("/holidays", attendanceHandler.GetHolidays)
	attGroup.GET("/holidays/bulan", attendanceHandler.GetHolidaysByBulan)
	attGroup.POST("/holidays", attendanceHandler.CreateHoliday, middleware.RBACMiddleware("admin"))
	attGroup.DELETE("/holidays/:id", attendanceHandler.DeleteHoliday, middleware.RBACMiddleware("admin"))

	// Jam Khusus
	attGroup.GET("/jam-khusus", attendanceHandler.GetJamKhususByBulan)
	attGroup.POST("/jam-khusus", attendanceHandler.CreateJamKhusus, middleware.RBACMiddleware("admin"))
	attGroup.DELETE("/jam-khusus/:id", attendanceHandler.DeleteJamKhusus, middleware.RBACMiddleware("admin"))

	// Time Config
	attGroup.GET("/config/:tipe", attendanceHandler.GetTimeConfig)
	attGroup.PUT("/config/:tipe", attendanceHandler.UpdateTimeConfig, middleware.RBACMiddleware("admin"))

	// ====================================================
	// BK MODULE ROUTES
	// ====================================================
	bkGroup := api.Group("/bk")

	// Konseling
	bkGroup.GET("/konseling", bkHandler.ListKonseling)
	bkGroup.GET("/konseling/:id", bkHandler.GetKonseling)
	bkGroup.POST("/konseling", bkHandler.CreateKonseling, middleware.RBACMiddleware("guru_bk", "counselor"))
	bkGroup.PUT("/konseling/:id", bkHandler.UpdateKonseling, middleware.RBACMiddleware("guru_bk", "counselor"))
	bkGroup.DELETE("/konseling/:id", bkHandler.DeleteKonseling, middleware.RBACMiddleware("guru_bk", "counselor"))

	// Pelanggaran
	bkGroup.GET("/pelanggaran", bkHandler.ListPelanggaran)
	bkGroup.GET("/pelanggaran/:id", bkHandler.GetPelanggaran)
	bkGroup.POST("/pelanggaran", bkHandler.CreatePelanggaran, middleware.RBACMiddleware("guru_bk", "counselor", "admin", "guru", "wali_kelas"))
	bkGroup.PUT("/pelanggaran/:id", bkHandler.UpdatePelanggaran, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.DELETE("/pelanggaran/:id", bkHandler.DeletePelanggaran, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.GET("/pelanggaran/siswa/:siswa_id/points", bkHandler.GetStudentPoints)

	// Prestasi
	bkGroup.GET("/prestasi", bkHandler.ListPrestasi)
	bkGroup.GET("/prestasi/:id", bkHandler.GetPrestasi)
	bkGroup.POST("/prestasi", bkHandler.CreatePrestasi, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.PUT("/prestasi/:id", bkHandler.UpdatePrestasi, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.DELETE("/prestasi/:id", bkHandler.DeletePrestasi, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))

	// Tes Psikologi
	bkGroup.GET("/tes-psikologi", bkHandler.ListTesPsikologi)
	bkGroup.GET("/tes-psikologi/:id", bkHandler.GetTesPsikologi)
	bkGroup.POST("/tes-psikologi", bkHandler.CreateTesPsikologi, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.PUT("/tes-psikologi/:id", bkHandler.UpdateTesPsikologi, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.DELETE("/tes-psikologi/:id", bkHandler.DeleteTesPsikologi, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))

	// Proyek
	bkGroup.GET("/proyek", bkHandler.ListProyek)
	bkGroup.GET("/proyek/:id", bkHandler.GetProyek)
	bkGroup.POST("/proyek", bkHandler.CreateProyek, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.PUT("/proyek/:id", bkHandler.UpdateProyek, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))
	bkGroup.DELETE("/proyek/:id", bkHandler.DeleteProyek, middleware.RBACMiddleware("guru_bk", "counselor", "admin"))

	// ====================================================
	// PERIZINAN MODULE ROUTES
	// ====================================================
	perizinanGroup := api.Group("/perizinan")

	// Siswa
	perizinanGroup.GET("/siswa", perizinanHandler.ListSiswaLeave)
	perizinanGroup.GET("/siswa/:id", perizinanHandler.GetSiswaLeave)
	perizinanGroup.POST("/siswa", perizinanHandler.CreateSiswaLeave, middleware.RBACMiddleware("siswa", "orang_tua"))
	perizinanGroup.POST("/siswa/:id/approve", perizinanHandler.ApproveSiswaLeave, middleware.RBACMiddleware("admin", "guru", "guru_bk", "wali_kelas", "kepsek"))
	perizinanGroup.DELETE("/siswa/:id", perizinanHandler.DeleteSiswaLeave, middleware.RBACMiddleware("admin", "siswa"))

	// Guru
	perizinanGroup.GET("/guru", perizinanHandler.ListGuruLeave)
	perizinanGroup.GET("/guru/:id", perizinanHandler.GetGuruLeave)
	perizinanGroup.POST("/guru", perizinanHandler.CreateGuruLeave, middleware.RBACMiddleware("guru", "wali_kelas", "guru_bk", "counselor"))
	perizinanGroup.POST("/guru/:id/approve", perizinanHandler.ApproveGuruLeave, middleware.RBACMiddleware("admin", "kepsek"))
	perizinanGroup.DELETE("/guru/:id", perizinanHandler.DeleteGuruLeave, middleware.RBACMiddleware("admin", "guru"))

	// ====================================================
	// GRADING (NILAI) MODULE ROUTES
	// ====================================================
	nilaiGroup := api.Group("/nilai")
	nilaiGroup.GET("", nilaiHandler.List)
	nilaiGroup.POST("", nilaiHandler.Create, middleware.RBACMiddleware("guru", "wali_kelas"))
	nilaiGroup.PUT("/:id", nilaiHandler.Update, middleware.RBACMiddleware("guru", "wali_kelas"))
	nilaiGroup.DELETE("/:id", nilaiHandler.Delete, middleware.RBACMiddleware("guru", "wali_kelas"))

	// ====================================================
	// REPORTS MODULE ROUTES
	// ====================================================
	reportsGroup := api.Group("/reports")
	reportsGroup.GET("/dashboard", reportHandler.GetStats)
	reportsGroup.GET("/dashboard/ortu", reportHandler.GetOrtuDashboard, middleware.RBACMiddleware("orang_tua"))
	reportsGroup.GET("/dashboard/guru", reportHandler.GetGuruDashboard, middleware.RBACMiddleware("guru", "wali_kelas"))
	reportsGroup.GET("/jurnal", reportHandler.GetJurnalReport, middleware.RBACMiddleware("guru", "wali_kelas", "admin"))
	reportsGroup.GET("/attendance", reportHandler.GetAttendanceReport, middleware.RBACMiddleware("siswa", "orang_tua", "admin"))
	reportsGroup.GET("/teacher-attendance", reportHandler.GetTeacherAttendanceReport, middleware.RBACMiddleware("guru", "admin"))
	reportsGroup.GET("/violations", reportHandler.GetViolationsReport, middleware.RBACMiddleware("siswa", "orang_tua", "admin", "guru_bk"))
	reportsGroup.GET("/achievements", reportHandler.GetAchievementsReport, middleware.RBACMiddleware("siswa", "orang_tua", "admin", "guru_bk"))
	reportsGroup.GET("/audit-logs", reportHandler.ListAuditLogs, middleware.RBACMiddleware("admin", "kepsek"))

	// ====================================================
	// QR CODE MODULE ROUTES
	// ====================================================
	qrGroup := api.Group("/qr")
	qrGroup.GET("/siswa/:siswa_id", qrHandler.GenerateSiswaQR, middleware.RBACMiddleware("admin", "siswa"))
	qrGroup.GET("/guru/:guru_id", qrHandler.GenerateGuruQR, middleware.RBACMiddleware("admin", "guru"))
	qrGroup.POST("/batch", qrHandler.GenerateBatchQR, middleware.RBACMiddleware("admin"))

	// ====================================================
	// FILE UPLOAD MODULE ROUTES
	// ====================================================
	uploadGroup := api.Group("/upload")
	uploadGroup.POST("/perizinan", fileHandler.UploadPerizinanFile, middleware.RBACMiddleware("admin", "siswa"))
	uploadGroup.POST("/prestasi", fileHandler.UploadPrestatiFile, middleware.RBACMiddleware("admin", "siswa"))
	uploadGroup.POST("/psikotes", fileHandler.UploadPsikotesFile, middleware.RBACMiddleware("admin", "guru_bk", "counselor"))
	uploadGroup.POST("/foto", fileHandler.UploadFotoProfile, middleware.RBACMiddleware("admin", "guru", "guru_bk", "counselor", "wali_kelas", "kepsek", "siswa", "orang_tua"))
	uploadGroup.POST("/bukti", fileHandler.UploadBuktiFile, middleware.RBACMiddleware("admin", "siswa", "guru", "wali_kelas", "guru_bk", "counselor", "kepsek", "orang_tua"))
	uploadGroup.DELETE("/:file_type/:filename", fileHandler.DeleteFile, middleware.RBACMiddleware("admin", "siswa", "guru", "wali_kelas", "guru_bk", "counselor", "kepsek"))

	// Static file serving for uploads
	e.Static("/uploads", "uploads")
}
