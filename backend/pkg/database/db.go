package database

import (
	"fmt"
	"log"
	"time"

	"github.com/asan14/jurnal-apps-backend/config"
	"github.com/asan14/jurnal-apps-backend/internal/domain"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	var db *gorm.DB
	var err error

	// Retry database connection
	for i := 0; i < 5; i++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database. Retry in 5 seconds... (%d/5)", i+1)
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		log.Fatalf("Fatal error connecting to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Fatal error getting DB instance: %v", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Database connection successfully established")

	// Automigrate tables
	err = db.AutoMigrate(
		&domain.User{},
		&domain.Jurusan{},
		&domain.Guru{},
		&domain.Kelas{},
		&domain.Mapel{},
		&domain.Mengajar{},
		&domain.Jurnal{},
		&domain.KehadiranGuru{},
		&domain.RequestJurnalMundur{},
		&domain.Absensi{},
		&domain.AbsensiGuru{},
		&domain.HariLibur{},
		&domain.JamKhusus{},
		&domain.PengaturanJam{},
		&domain.BKKonseling{},
		&domain.Pelanggaran{},
		&domain.Prestasi{},
		&domain.TesPsikologi{},
		&domain.Proyek{},
		&domain.Perizinan{},
		&domain.IzinGuru{},
		&domain.Nilai{},
		&domain.OrangTua{},
		&domain.AnakOrangTua{},
		&domain.Notifikasi{},
		&domain.AuditLog{},
		&domain.Pesan{},
	)
	if err != nil {
		log.Fatalf("Failed to run automigration: %v", err)
	}

	log.Println("Database migration completed successfully")

	// Run Seed Data
	SeedData(db)

	return db
}
