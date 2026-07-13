package service

import (
	"crypto/md5"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type FileService interface {
	SavePerizinanFile(file *multipart.FileHeader, perizinanID uint) (string, error)
	SavePrestatiFile(file *multipart.FileHeader, prestatiID uint) (string, error)
	SavePsikotesFile(file *multipart.FileHeader) (string, error)
	SaveBuktiFile(file *multipart.FileHeader) (string, error)
	SaveFotoProfile(file *multipart.FileHeader, prefix string) (string, error)
	DeleteFile(filepath string) error
	GetFilePath(fileType string, filename string) string
}

type fileService struct {
	uploadDir string
}

func NewFileService() FileService {
	uploadDir := "uploads"
	os.MkdirAll(filepath.Join(uploadDir, "perizinan"), 0755)
	os.MkdirAll(filepath.Join(uploadDir, "prestasi"), 0755)
	os.MkdirAll(filepath.Join(uploadDir, "foto"), 0755)
	os.MkdirAll(filepath.Join(uploadDir, "psikotes"), 0755)
	os.MkdirAll(filepath.Join(uploadDir, "bukti"), 0755)

	return &fileService{
		uploadDir: uploadDir,
	}
}

func (s *fileService) SavePerizinanFile(file *multipart.FileHeader, perizinanID uint) (string, error) {
	return s.saveFile(file, "perizinan", perizinanID)
}

func (s *fileService) SavePrestatiFile(file *multipart.FileHeader, prestatiID uint) (string, error) {
	return s.saveFile(file, "prestasi", prestatiID)
}

func (s *fileService) SavePsikotesFile(file *multipart.FileHeader) (string, error) {
	return s.saveFile(file, "psikotes", uint(time.Now().UnixNano()%1000000))
}

func (s *fileService) SaveBuktiFile(file *multipart.FileHeader) (string, error) {
	return s.saveFile(file, "bukti", uint(time.Now().UnixNano()%1000000))
}

func (s *fileService) SaveFotoProfile(file *multipart.FileHeader, prefix string) (string, error) {
	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		return "", fmt.Errorf("ukuran file melebihi batas 5MB")
	}
	// Validate image extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowedExts[ext] {
		return "", fmt.Errorf("format file tidak didukung, gunakan JPG/PNG/WEBP")
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, src); err != nil {
		return "", err
	}
	src.Seek(0, 0)

	filename := fmt.Sprintf("%s_%d_%s%s", prefix, time.Now().UnixNano(), fmt.Sprintf("%x", hash.Sum(nil))[:8], ext)
	filePath := filepath.Join(s.uploadDir, "foto", filename)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}
	return filename, nil
}

func (s *fileService) saveFile(file *multipart.FileHeader, fileType string, id uint) (string, error) {
	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		return "", fmt.Errorf("file size exceeds 10MB limit")
	}

	// Validate file extension
	ext := filepath.Ext(file.Filename)
	allowedExts := map[string]bool{
		".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".doc": true, ".docx": true,
	}
	if !allowedExts[strings.ToLower(ext)] {
		return "", fmt.Errorf("file extension not allowed")
	}

	// Generate unique filename
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, src); err != nil {
		return "", err
	}
	src.Seek(0, 0)

	filename := fmt.Sprintf("%d_%d_%s%s", id, time.Now().UnixNano(), fmt.Sprintf("%x", hash.Sum(nil))[:8], ext)
	filePath := filepath.Join(s.uploadDir, fileType, filename)

	// Create file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}

	return filename, nil
}

func (s *fileService) DeleteFile(filePath string) error {
	fullPath := filepath.Join(s.uploadDir, filePath)
	return os.Remove(fullPath)
}

func (s *fileService) GetFilePath(fileType string, filename string) string {
	return filepath.Join(s.uploadDir, fileType, filename)
}
