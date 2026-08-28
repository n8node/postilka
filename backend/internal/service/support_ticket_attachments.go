package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/model"
)

const (
	maxSupportAttachmentSize = 10 << 20
	maxSupportAttachments    = 5
)

var (
	ErrSupportAttachment     = fmt.Errorf("%w: attachment", ErrInvalidSupportInput)
	ErrSupportStorageMissing = fmt.Errorf("%w: хранилище файлов не настроено", ErrInvalidSupportInput)
)

type SupportUpload struct {
	Filename string
	MimeType string
	Data     []byte
}

func (s *SupportTicketService) validateUploads(files []SupportUpload) error {
	if len(files) == 0 {
		return nil
	}
	if len(files) > maxSupportAttachments {
		return fmt.Errorf("%w: не больше %d файлов", ErrSupportAttachment, maxSupportAttachments)
	}
	for _, file := range files {
		if _, err := prepareSupportUpload(file); err != nil {
			return err
		}
	}
	return nil
}

func (s *SupportTicketService) decorateTicket(ticket *model.SupportTicket, admin bool) {
	if ticket == nil {
		return
	}
	prefix := "/support/tickets/"
	if admin {
		prefix = "/admin/support/tickets/"
	}
	for i := range ticket.Messages {
		for j := range ticket.Messages[i].Attachments {
			att := &ticket.Messages[i].Attachments[j]
			att.URL = prefix + ticket.ID + "/attachments/" + att.ID
		}
	}
}

func (s *SupportTicketService) saveUploads(ctx context.Context, ticketID, messageID string, files []SupportUpload) error {
	if len(files) == 0 {
		return nil
	}
	if len(files) > maxSupportAttachments {
		return fmt.Errorf("%w: не больше %d файлов", ErrSupportAttachment, maxSupportAttachments)
	}
	if s.store == nil {
		return ErrSupportStorageMissing
	}
	uploaded := make([]string, 0, len(files))
	for _, file := range files {
		att, err := prepareSupportUpload(file)
		if err != nil {
			for _, key := range uploaded {
				_ = s.store.DeleteObject(ctx, key)
			}
			return err
		}
		key := fmt.Sprintf("postilka/support/%s/%s/%s%s", ticketID, messageID, uuid.NewString(), att.ext)
		if err := s.store.PutObject(ctx, key, att.mime, file.Data); err != nil {
			for _, prev := range uploaded {
				_ = s.store.DeleteObject(ctx, prev)
			}
			if errors.Is(err, ErrStorageNotConfigured) {
				return ErrSupportStorageMissing
			}
			return fmt.Errorf("%w: не удалось сохранить файл", ErrSupportAttachment)
		}
		uploaded = append(uploaded, key)
		if _, err := s.tickets.InsertAttachment(ctx, model.SupportTicketAttachment{
			TicketID:   ticketID,
			MessageID:  messageID,
			Filename:   att.filename,
			MimeType:   att.mime,
			SizeBytes:  int64(len(file.Data)),
			StorageKey: key,
		}); err != nil {
			for _, prev := range uploaded {
				_ = s.store.DeleteObject(ctx, prev)
			}
			return err
		}
	}
	return nil
}

type preparedSupportUpload struct {
	filename string
	mime     string
	ext      string
}

func prepareSupportUpload(file SupportUpload) (preparedSupportUpload, error) {
	if len(file.Data) == 0 {
		return preparedSupportUpload{}, fmt.Errorf("%w: пустой файл", ErrSupportAttachment)
	}
	if len(file.Data) > maxSupportAttachmentSize {
		return preparedSupportUpload{}, fmt.Errorf("%w: файл больше 10 МБ", ErrSupportAttachment)
	}
	filename := sanitizeSupportFilename(file.Filename)
	mime := strings.TrimSpace(strings.Split(file.MimeType, ";")[0])
	if mime == "" {
		mime = http.DetectContentType(file.Data)
	}
	if !supportAttachmentAllowed(filename, mime) {
		return preparedSupportUpload{}, fmt.Errorf("%w: тип файла не поддерживается", ErrSupportAttachment)
	}
	ext := path.Ext(filename)
	if ext == "" {
		ext = supportExtForMime(mime)
	}
	return preparedSupportUpload{filename: filename, mime: mime, ext: ext}, nil
}

func sanitizeSupportFilename(raw string) string {
	name := path.Base(strings.ReplaceAll(strings.TrimSpace(raw), "\\", "/"))
	name = strings.TrimSpace(name)
	if name == "" || name == "." || name == "/" {
		name = "file"
	}
	if utf8.RuneCountInString(name) > 180 {
		runes := []rune(name)
		name = string(runes[:180])
	}
	return name
}

func supportAttachmentAllowed(filename, mime string) bool {
	mime = strings.ToLower(strings.TrimSpace(mime))
	if strings.HasPrefix(mime, "image/") {
		switch mime {
		case "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif":
			return true
		}
	}
	switch mime {
	case "application/pdf", "text/plain", "text/csv", "text/markdown", "application/json",
		"application/zip", "application/x-zip-compressed",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return true
	}
	ext := strings.ToLower(path.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".csv", ".md", ".json",
		".zip", ".log", ".go", ".ts", ".tsx", ".js", ".py", ".yml", ".yaml", ".xml", ".html", ".css",
		".doc", ".docx":
		return true
	}
	return false
}

func supportExtForMime(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "application/pdf":
		return ".pdf"
	case "text/plain":
		return ".txt"
	default:
		return ""
	}
}

func (s *SupportTicketService) GetUserAttachment(ctx context.Context, ticketID, attachmentID, userID string) (*model.SupportTicketAttachment, io.ReadCloser, string, error) {
	if _, err := s.tickets.GetByIDForUser(ctx, ticketID, userID); err != nil {
		return nil, nil, "", err
	}
	return s.openAttachment(ctx, ticketID, attachmentID)
}

func (s *SupportTicketService) GetAdminAttachment(ctx context.Context, ticketID, attachmentID string) (*model.SupportTicketAttachment, io.ReadCloser, string, error) {
	if _, err := s.tickets.GetByID(ctx, ticketID); err != nil {
		return nil, nil, "", err
	}
	return s.openAttachment(ctx, ticketID, attachmentID)
}

func (s *SupportTicketService) openAttachment(ctx context.Context, ticketID, attachmentID string) (*model.SupportTicketAttachment, io.ReadCloser, string, error) {
	att, err := s.tickets.GetAttachment(ctx, ticketID, attachmentID)
	if err != nil {
		return nil, nil, "", err
	}
	if s.store == nil {
		return nil, nil, "", ErrSupportStorageMissing
	}
	body, contentType, err := s.store.GetObject(ctx, att.StorageKey)
	if err != nil {
		return nil, nil, "", err
	}
	if contentType == "" {
		contentType = att.MimeType
	}
	return att, body, contentType, nil
}
