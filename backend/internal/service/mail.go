package service

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

var (
	ErrEmailDisabled     = errors.New("email sending is disabled")
	ErrSMTPNotConfigured = errors.New("smtp is not configured")
)

type MailService struct {
	smtpSettings *SMTPSettingsService
}

func NewMailService(smtpSettings *SMTPSettingsService) *MailService {
	return &MailService{smtpSettings: smtpSettings}
}

// Probe checks SMTP reachability without sending a message.
func (m *MailService) Probe(ctx context.Context) error {
	cfg, err := m.smtpSettings.GetEffective(ctx)
	if err != nil {
		return err
	}
	if !cfg.Enabled {
		return ErrEmailDisabled
	}
	if strings.TrimSpace(cfg.Host) == "" || cfg.Port <= 0 {
		return ErrSMTPNotConfigured
	}

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	dialer := &net.Dialer{Timeout: 8 * time.Second}

	var conn net.Conn
	switch cfg.Encryption {
	case model.SMTPEncryptionSSL:
		tlsCfg := &tls.Config{ServerName: cfg.Host}
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
	default:
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return err
	}
	defer client.Close()

	if cfg.Encryption == model.SMTPEncryptionTLS {
		if err := client.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
			return err
		}
	}
	if cfg.Auth && strings.TrimSpace(cfg.Username) != "" {
		if err := client.Auth(smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)); err != nil {
			return err
		}
	}
	return client.Quit()
}

func (m *MailService) Send(ctx context.Context, to, subject, bodyHTML string) error {
	to = strings.TrimSpace(to)
	if to == "" {
		return fmt.Errorf("%w: recipient required", ErrInvalidInput)
	}
	if model.IsPlaceholderLoginEmail(to) {
		return nil
	}

	cfg, err := m.smtpSettings.GetEffective(ctx)
	if err != nil {
		return err
	}
	if !cfg.Enabled {
		return ErrEmailDisabled
	}
	if strings.TrimSpace(cfg.Host) == "" || cfg.Port <= 0 {
		return ErrSMTPNotConfigured
	}

	fromEmail := strings.TrimSpace(cfg.FromEmail)
	if fromEmail == "" {
		fromEmail = strings.TrimSpace(cfg.Username)
	}
	if fromEmail == "" {
		return fmt.Errorf("%w: sender email required", ErrSMTPNotConfigured)
	}

	fromName := strings.TrimSpace(cfg.FromName)
	var fromHeader string
	if fromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", encodeHeaderWord(fromName), fromEmail)
	} else {
		fromHeader = fromEmail
	}

	headers := []string{
		"From: " + fromHeader,
		"To: " + to,
		"Subject: " + encodeHeaderWord(subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
	}
	if cfg.ReplyToFromEmail {
		headers = append(headers, "Reply-To: "+fromEmail)
	}
	msg := strings.Join(headers, "\r\n") + "\r\n\r\n" + bodyHTML

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	var auth smtp.Auth
	if cfg.Auth && strings.TrimSpace(cfg.Username) != "" {
		auth = smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
	}

	switch cfg.Encryption {
	case model.SMTPEncryptionSSL:
		return m.sendSSL(addr, cfg.Host, auth, fromEmail, []string{to}, []byte(msg))
	case model.SMTPEncryptionTLS:
		return smtp.SendMail(addr, auth, fromEmail, []string{to}, []byte(msg))
	default:
		if cfg.AutoTLS {
			return smtp.SendMail(addr, auth, fromEmail, []string{to}, []byte(msg))
		}
		return m.sendPlain(addr, auth, fromEmail, []string{to}, []byte(msg))
	}
}

func (m *MailService) sendSSL(addr, host string, auth smtp.Auth, from string, to []string, msg []byte) error {
	tlsCfg := &tls.Config{ServerName: host}
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 30 * time.Second}, "tcp", addr, tlsCfg)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	for _, rcpt := range to {
		if err := client.Rcpt(rcpt); err != nil {
			return err
		}
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func (m *MailService) sendPlain(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	return smtp.SendMail(addr, auth, from, to, msg)
}

func encodeHeaderWord(s string) string {
	if s == "" {
		return s
	}
	needsEncode := false
	for _, r := range s {
		if r > 127 {
			needsEncode = true
			break
		}
	}
	if !needsEncode {
		return s
	}
	return fmt.Sprintf("=?UTF-8?B?%s?=", base64UTF8(s))
}

func base64UTF8(s string) string {
	const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
	b := []byte(s)
	var out strings.Builder
	for i := 0; i < len(b); i += 3 {
		var n uint32
		remain := len(b) - i
		if remain >= 3 {
			n = uint32(b[i])<<16 | uint32(b[i+1])<<8 | uint32(b[i+2])
			out.WriteByte(table[n>>18&63])
			out.WriteByte(table[n>>12&63])
			out.WriteByte(table[n>>6&63])
			out.WriteByte(table[n&63])
		} else if remain == 2 {
			n = uint32(b[i])<<16 | uint32(b[i+1])<<8
			out.WriteByte(table[n>>18&63])
			out.WriteByte(table[n>>12&63])
			out.WriteByte(table[n>>6&63])
			out.WriteString("=")
		} else {
			n = uint32(b[i]) << 16
			out.WriteByte(table[n>>18&63])
			out.WriteByte(table[n>>12&63])
			out.WriteString("==")
		}
	}
	return out.String()
}
