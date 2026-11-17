package service

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"net"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/repository"
)

const deviceIDCookie = "device_id"

type UserSecuritySignalService struct {
	repo *repository.UserSecuritySignalRepository
	key  []byte
}

func NewUserSecuritySignalService(repo *repository.UserSecuritySignalRepository, key string) *UserSecuritySignalService {
	return &UserSecuritySignalService{repo: repo, key: []byte(key)}
}

func (s *UserSecuritySignalService) RecordRequest(r *http.Request, userID, eventType string) {
	if s == nil || s.repo == nil || len(s.key) == 0 {
		return
	}
	deviceID := ""
	if cookie, err := r.Cookie(deviceIDCookie); err == nil {
		deviceID = strings.TrimSpace(cookie.Value)
	}
	ipHash := s.fingerprint(clientIP(r))
	deviceHash := s.fingerprint(deviceID)
	if err := s.repo.Record(r.Context(), userID, eventType, ipHash, deviceHash); err != nil {
		return
	}
}

func (s *UserSecuritySignalService) RecordEvent(r *http.Request, userID, eventType string) {
	s.RecordRequest(r, userID, eventType)
}

func (s *UserSecuritySignalService) EnsureDeviceCookie(w http.ResponseWriter, r *http.Request, secure bool) {
	if cookie, err := r.Cookie(deviceIDCookie); err == nil {
		if decoded, decodeErr := base64.RawURLEncoding.DecodeString(cookie.Value); decodeErr == nil && len(decoded) == 32 {
			return
		}
	}
	value, err := randomDeviceID(32)
	if err != nil {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name: deviceIDCookie, Value: value, Path: "/", MaxAge: 365 * 24 * 60 * 60,
		Secure: secure, HttpOnly: true, SameSite: http.SameSiteLaxMode,
	})
}

func randomDeviceID(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func (s *UserSecuritySignalService) fingerprint(value string) string {
	if value == "" || len(s.key) == 0 {
		return ""
	}
	mac := hmac.New(sha256.New, s.key)
	_, _ = mac.Write([]byte(value))
	return hex.EncodeToString(mac.Sum(nil))
}

func clientIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	ip := net.ParseIP(strings.TrimSpace(r.RemoteAddr))
	if ip == nil {
		return ""
	}
	return ip.String()
}
