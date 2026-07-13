package database

import (
	"log"

	"github.com/asan14/jurnal-apps-backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) {
	// Check if we already have users
	var count int64
	db.Model(&domain.User{}).Count(&count)
	if count > 0 {
		log.Println("Database already seeded. Skipping...")
		return
	}

	log.Println("Seeding default database data...")

	// Hash password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	pwdStr := string(hashedPassword)

	// 1. Seed Users (Hanya Admin)
	users := []domain.User{
		{Username: "admin", Email: "admin@jurnal.com", Password: pwdStr, Role: "admin"},
	}

	for i := range users {
		db.Create(&users[i])
	}

	// 2. Seed Pengaturan Jam (Konfigurasi Jam Kerja Sistem)
	pengaturanJamList := []domain.PengaturanJam{
		{Tipe: "Guru", JamMasukMulai: "06:30", JamMasukSelesai: "07:30", JamPulangMulai: "15:00", JamPulangSelesai: "17:00"},
		{Tipe: "Siswa", JamMasukMulai: "06:45", JamMasukSelesai: "07:15", JamPulangMulai: "14:30", JamPulangSelesai: "16:00"},
	}
	for i := range pengaturanJamList {
		db.Create(&pengaturanJamList[i])
	}

	log.Println("Database seeding completed successfully.")
}
