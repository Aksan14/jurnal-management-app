package mailer

import (
	"fmt"
	"log"
	"strconv"

	"github.com/asan14/jurnal-apps-backend/config"
	gomail "gopkg.in/gomail.v2"
)

type Mailer struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) SendCredentials(toEmail, toName, username, password, role string) error {
	if m.cfg.SMTPHost == "" || m.cfg.SMTPUser == "" {
		return fmt.Errorf("SMTP belum dikonfigurasi")
	}

	roleLabel := map[string]string{
		"guru":       "Guru",
		"wali_kelas": "Wali Kelas",
		"siswa":      "Siswa",
		"admin":      "Administrator",
	}[role]
	if roleLabel == "" {
		roleLabel = role
	}

	subject := fmt.Sprintf("Akun %s Anda di Jurnal Apps", roleLabel)
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <h2 style="color:#1e40af;margin-top:0;">Selamat Datang di Jurnal Apps</h2>
    <p>Halo <strong>%s</strong>,</p>
    <p>Akun Anda sebagai <strong>%s</strong> telah berhasil dibuat. Berikut informasi login Anda:</p>
    <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:4px 0;"><strong>Username:</strong> %s</p>
      <p style="margin:4px 0;"><strong>Password:</strong> %s</p>
    </div>
    <p>Segera ubah password Anda setelah login pertama kali.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
    <p style="color:#9ca3af;font-size:12px;">Email ini dikirim otomatis oleh sistem.</p>
  </div>
</body>
</html>`, toName, roleLabel, username, password, m.cfg.AppURL, m.cfg.AppURL)

	port, err := strconv.Atoi(m.cfg.SMTPPort)
	if err != nil {
		port = 587
	}

	// Gunakan SMTP_FROM jika ada, fallback ke SMTP_USER
	fromAddr := m.cfg.SMTPFrom
	if fromAddr == "" {
		fromAddr = m.cfg.SMTPUser
	}

	msg := gomail.NewMessage()
	msg.SetAddressHeader("From", fromAddr, "Jurnal Apps")
	msg.SetAddressHeader("Reply-To", fromAddr, "Jurnal Apps")
	msg.SetHeader("To", toEmail)
	msg.SetHeader("Subject", subject)
	msg.SetHeader("MIME-Version", "1.0")
	msg.SetHeader("X-Mailer", "Jurnal Apps Mailer")
	msg.SetBody("text/html; charset=UTF-8", body)

	dialer := gomail.NewDialer(m.cfg.SMTPHost, port, m.cfg.SMTPUser, m.cfg.SMTPPass)
	if port == 465 {
		dialer.SSL = true
	}

	if err := dialer.DialAndSend(msg); err != nil {
		log.Printf("[MAILER] Gagal kirim email ke %s: %v", toEmail, err)
		return fmt.Errorf("gagal kirim email: %v", err)
	}

	log.Printf("[MAILER] Email kredensial berhasil dikirim ke %s", toEmail)
	return nil
}

func (m *Mailer) SendPasswordReset(toEmail, toName, username, newPassword string) error {
	if m.cfg.SMTPHost == "" || m.cfg.SMTPUser == "" {
		return fmt.Errorf("SMTP belum dikonfigurasi")
	}
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <h2 style="color:#dc2626;margin-top:0;">Reset Password Akun Anda</h2>
    <p>Halo <strong>%s</strong>,</p>
    <p>Password akun Anda telah direset oleh Administrator. Berikut informasi login baru Anda:</p>
    <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:4px 0;"><strong>Username:</strong> %s</p>
      <p style="margin:4px 0;"><strong>Password Baru:</strong> <span style="font-family:monospace;font-size:16px;letter-spacing:2px;">%s</span></p>
    </div>
    <p style="color:#dc2626;"><strong>Segera login dan ubah password Anda!</strong></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
    <p style="color:#9ca3af;font-size:12px;">Email ini dikirim otomatis oleh sistem Jurnal Apps.</p>
  </div>
</body>
</html>`, toName, username, newPassword)

	port, _ := strconv.Atoi(m.cfg.SMTPPort)
	if port == 0 {
		port = 587
	}
	fromAddr := m.cfg.SMTPFrom
	if fromAddr == "" {
		fromAddr = m.cfg.SMTPUser
	}
	msg := gomail.NewMessage()
	msg.SetAddressHeader("From", fromAddr, "Jurnal Apps")
	msg.SetHeader("To", toEmail)
	msg.SetHeader("Subject", "[Jurnal Apps] Password Anda Telah Direset")
	msg.SetBody("text/html; charset=UTF-8", body)
	dialer := gomail.NewDialer(m.cfg.SMTPHost, port, m.cfg.SMTPUser, m.cfg.SMTPPass)
	if port == 465 {
		dialer.SSL = true
	}
	if err := dialer.DialAndSend(msg); err != nil {
		log.Printf("[MAILER] Gagal kirim reset password ke %s: %v", toEmail, err)
		return fmt.Errorf("gagal kirim email: %v", err)
	}
	log.Printf("[MAILER] Email reset password berhasil dikirim ke %s", toEmail)
	return nil
}
