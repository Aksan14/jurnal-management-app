package service

import (
	"fmt"
	"net/smtp"
	"strings"

	"github.com/asan14/jurnal-apps-backend/config"
)

type EmailService interface {
	SendCredentials(toEmail, nama, username, password string) error
}

type emailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) EmailService {
	return &emailService{cfg: cfg}
}

func (s *emailService) SendCredentials(toEmail, nama, username, password string) error {
	if s.cfg.SMTPUser == "" || s.cfg.SMTPPass == "" {
		// Log only, don't fail registration if email not configured
		fmt.Printf("[EMAIL] Credentials for %s - Username: %s | Password: %s\n", toEmail, username, password)
		return nil
	}

	subject := "Akun Login JURNAL APPS"
	body := buildCredentialEmail(nama, username, password, s.cfg.AppURL)

	msg := "From: " + s.cfg.SMTPFrom + "\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		body

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)
	addr := s.cfg.SMTPHost + ":" + s.cfg.SMTPPort

	err := smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{toEmail}, []byte(msg))
	if err != nil {
		fmt.Printf("[EMAIL ERROR] Failed to send to %s: %v\n", toEmail, err)
		// Don't fail registration if email fails
		return nil
	}
	return nil
}

func buildCredentialEmail(nama, username, password, appURL string) string {
	_ = strings.TrimSpace(nama)
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">
  <div style="max-width:500px; margin:0 auto; background:#fff; border-radius:8px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color:#1d4ed8; margin-bottom:4px;">JURNAL APPS</h2>
    <p style="color:#555; margin-top:0;">Sistem Manajemen Jurnal Sekolah</p>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">
    <p>Halo, <strong>%s</strong>!</p>
    <p>Akun Anda telah berhasil dibuat. Berikut informasi login Anda:</p>
    <div style="background:#f0f4ff; border-radius:6px; padding:16px 20px; margin:20px 0;">
      <p style="margin:4px 0;"><strong>Username:</strong> <code style="background:#e0e7ff; padding:2px 6px; border-radius:4px;">%s</code></p>
      <p style="margin:4px 0;"><strong>Password:</strong> <code style="background:#e0e7ff; padding:2px 6px; border-radius:4px;">%s</code></p>
    </div>
    <p style="color:#f59e0b;"><strong>⚠️ Segera ganti password Anda setelah login pertama.</strong></p>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">
    <p style="color:#9ca3af; font-size:12px;">Email ini dikirim otomatis oleh sistem. Jangan balas email ini.</p>
  </div>
</body>
</html>`, nama, username, password)
}
