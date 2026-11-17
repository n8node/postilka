package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"path"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrTelegramDisabled      = errors.New("telegram notifications disabled")
	ErrTelegramNotConfigured = errors.New("telegram bot not configured")
)

type RegistrationNotifyMeta struct {
	InviteCode  string
	InviteScope string
	InviteOwner string
}

func (s *TelegramService) SendTest(ctx context.Context) (bool, string) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	if !cfg.Enabled {
		return false, "Включите Telegram-уведомления в настройках"
	}
	if strings.TrimSpace(cfg.BotToken) == "" || strings.TrimSpace(cfg.ChatID) == "" {
		return false, "Укажите токен бота и ID чата"
	}
	text := "✅ Тестовое сообщение Postilka\nБот подключён и может отправлять уведомления в этот чат."
	if err := s.send(ctx, cfg, text); err != nil {
		return false, err.Error()
	}
	s.triggerHealthCheck()
	return true, "Тестовое сообщение отправлено"
}

func (s *TelegramService) NotifyRegistration(ctx context.Context, user *model.User, meta RegistrationNotifyMeta) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyRegistration {
		return
	}
	vars := map[string]string{
		"email":       user.Email,
		"name":        displayTelegramName(user.Name, user.Email),
		"inviteCode":  strings.TrimSpace(meta.InviteCode),
		"inviteScope": strings.TrimSpace(meta.InviteScope),
		"inviteOwner": strings.TrimSpace(meta.InviteOwner),
	}
	text := applyTelegramTemplate(cfg.RegistrationTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "registration")
}

func (s *TelegramService) NotifyEmailVerified(ctx context.Context, user *model.User) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyEmailVerified {
		return
	}
	vars := map[string]string{
		"email": user.Email,
		"name":  displayTelegramName(user.Name, user.Email),
	}
	text := applyTelegramTemplate(cfg.EmailVerifiedTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "email_verified")
}

func (s *TelegramService) NotifyPayment(ctx context.Context, user *model.User, plan *model.Plan, amountCents int) {
	if user == nil || plan == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyPayment {
		return
	}
	vars := map[string]string{
		"userEmail": user.Email,
		"userName":  displayTelegramName(user.Name, user.Email),
		"planName":  plan.Name,
		"amount":    FormatRubOutSum(amountCents),
		"currency":  "₽",
	}
	text := applyTelegramTemplate(cfg.PaymentTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "payment")
}

func (s *TelegramService) NotifyMediaPackage(ctx context.Context, user *model.User, packageName string, tokens, amountCents int) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyPayment {
		return
	}
	text := fmt.Sprintf("Оплата пакета медиа-кредитов\nПользователь: %s (%s)\nПакет: %s\nКредитов: %d\nСумма: %s ₽",
		displayTelegramName(user.Name, user.Email), user.Email, strings.TrimSpace(packageName), tokens, FormatRubOutSum(amountCents))
	s.dispatchAdminNotification(ctx, text, "media_package_payment")
}

func (s *TelegramService) NotifyWalletTopup(ctx context.Context, user *model.User, amountCents int, balanceCents int64) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyWalletTopup {
		return
	}
	vars := map[string]string{
		"userEmail": user.Email,
		"userName":  displayTelegramName(user.Name, user.Email),
		"amount":    FormatRubOutSum(amountCents),
		"balance":   FormatRubOutSum(int(balanceCents)),
		"currency":  "₽",
	}
	text := applyTelegramTemplate(cfg.WalletTopupTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "wallet_topup")
}

func (s *TelegramService) GenerationNotificationConfig(ctx context.Context) (model.TelegramSettings, bool) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || strings.TrimSpace(cfg.BotToken) == "" || strings.TrimSpace(cfg.ChatID) == "" {
		return model.TelegramSettings{}, false
	}
	return cfg, true
}

func (s *TelegramService) SendGenerationMessage(ctx context.Context, cfg model.TelegramSettings, text string) error {
	token, chatID := strings.TrimSpace(cfg.BotToken), strings.TrimSpace(cfg.ChatID)
	if token == "" || chatID == "" {
		return ErrTelegramNotConfigured
	}
	_, err := s.telegramAPIWithConfig(ctx, cfg, token, "sendMessage", map[string]string{"chat_id": chatID, "text": strings.TrimSpace(text)})
	return err
}

func (s *TelegramService) SendGenerationMedia(ctx context.Context, cfg model.TelegramSettings, mediaType, filename, contentType string, data []byte, caption string) error {
	if len(data) == 0 {
		return errors.New("empty generation media")
	}
	if len(data) > 50<<20 {
		return errors.New("generation media exceeds Telegram upload limit")
	}
	if mediaType == TelegramMediaPhoto && len(data) > 10<<20 {
		return errors.New("generation photo exceeds Telegram upload limit")
	}
	token, chatID := strings.TrimSpace(cfg.BotToken), strings.TrimSpace(cfg.ChatID)
	if token == "" || chatID == "" {
		return ErrTelegramNotConfigured
	}
	client := NewTelegramBotClient(nil, s.localProxy)
	_, _, err := client.SendMediaWithSettings(ctx, token, chatID, []TelegramMediaInput{{
		Type: mediaType, Data: data, Filename: filename, ContentType: contentType,
	}}, &TelegramMediaSendOptions{Caption: caption}, cfg)
	return err
}

func (s *TelegramService) SendGenerationReference(ctx context.Context, cfg model.TelegramSettings, job model.AIGenerationJob, text string) error {
	if s.generationUploads == nil || s.generationStorage == nil || job.WorkspaceID == "" {
		return errors.New("generation reference storage is not configured")
	}
	for _, id := range generationReferenceIDs(job) {
		upload, err := s.generationUploads.GetByID(ctx, id, job.UserID, job.WorkspaceID)
		if err != nil {
			continue
		}
		contentType := upload.ContentType
		mediaType := telegramMediaType(contentType, "")
		body, storedContentType, err := s.generationStorage.GetObject(ctx, upload.S3Key)
		if err != nil {
			return err
		}
		defer body.Close()
		if contentType == "" || contentType == "application/octet-stream" {
			contentType = storedContentType
			mediaType = telegramMediaType(contentType, "")
		}
		maxBytes := int64(50 << 20)
		if mediaType == TelegramMediaPhoto {
			maxBytes = 10 << 20
		}
		data, err := io.ReadAll(io.LimitReader(body, maxBytes+1))
		if err != nil {
			return err
		}
		if int64(len(data)) > maxBytes {
			return errors.New("generation reference exceeds Telegram upload limit")
		}
		return s.SendGenerationMedia(ctx, cfg, mediaType, "reference"+mediaExtension(contentType), contentType, data, text)
	}
	return repository.ErrNotFound
}

func (s *TelegramService) NotifyGenerationFailedWithUsers(ctx context.Context, job model.AIGenerationJob, failure string, users *repository.UserRepository) {
	cfg, ok := s.GenerationNotificationConfig(ctx)
	if !ok || !cfg.NotifyGenerationFailed || users == nil {
		return
	}
	user, err := users.GetByID(ctx, job.UserID)
	if err != nil {
		s.logger.Warn("failed generation notification user unavailable", "job_id", job.ID, "err", err)
		return
	}
	vars := generationTemplateVars(job, user.Email, failure)
	vars["reference"] = "Нет"
	if jobHasReference(job) {
		vars["reference"] = "Прикреплён отдельным файлом ниже"
	}
	text := applyTelegramTemplate(cfg.GenerationFailedTemplate, vars)
	if jobHasReference(job) {
		if err := s.SendGenerationReference(ctx, cfg, job, text); err == nil {
			return
		} else {
			s.logger.Warn("failed to attach generation reference", "job_id", job.ID, "err", err)
			vars["reference"] = "Файл референса не удалось получить"
			text = applyTelegramTemplate(cfg.GenerationFailedTemplate, vars)
			if err := s.SendGenerationMessage(ctx, cfg, text); err == nil {
				return
			} else {
				s.logger.Warn("failed generation Telegram notification", "job_id", job.ID, "err", err)
				return
			}
		}
	}
	if err := s.SendGenerationMessage(ctx, cfg, text); err != nil {
		s.logger.Warn("failed generation Telegram notification", "job_id", job.ID, "err", err)
	}
}

func (s *TelegramService) NotifyGenerationSucceeded(ctx context.Context, job model.AIGenerationJob, generation model.AIGeneration, users *repository.UserRepository, storage *ObjectStorage) {
	cfg, ok := s.GenerationNotificationConfig(ctx)
	if !ok || !cfg.NotifyGenerationSucceeded || users == nil || storage == nil {
		return
	}
	user, err := users.GetByID(ctx, job.UserID)
	if err != nil {
		s.logger.Warn("successful generation notification user unavailable", "job_id", job.ID, "err", err)
		return
	}
	maxBytes := int64(50 << 20)
	body, storedContentType, err := storage.GetObject(ctx, generation.ResultS3Key)
	if err != nil {
		s.logger.Warn("successful generation media read failed", "job_id", job.ID, "err", err)
		return
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, maxBytes+1))
	if err != nil {
		s.logger.Warn("successful generation media read failed", "job_id", job.ID, "err", err)
		return
	}
	contentType := strings.TrimSpace(strings.Split(generation.ResultContentType, ";")[0])
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = strings.TrimSpace(strings.Split(storedContentType, ";")[0])
	}
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = mime.TypeByExtension(path.Ext(generation.ResultS3Key))
	}
	if strings.HasPrefix(strings.ToLower(contentType), "image/") {
		maxBytes = 10 << 20
	} else {
		maxBytes = 50 << 20
	}
	if !strings.HasPrefix(strings.ToLower(contentType), "image/") && !strings.HasPrefix(strings.ToLower(contentType), "video/") {
		s.logger.Warn("successful generation media type unsupported", "job_id", job.ID, "content_type", contentType)
		return
	}
	if int64(len(data)) > maxBytes {
		s.logger.Warn("successful generation media exceeds Telegram upload limit", "job_id", job.ID, "bytes", len(data))
		return
	}
	mediaType := telegramMediaType(contentType, job.Mode)
	filename := path.Base(generation.ResultS3Key)
	if filename == "." || filename == "/" || filename == "" {
		filename = "generation"
	}
	text := applyTelegramTemplate(cfg.GenerationSucceededTemplate, generationTemplateVars(job, user.Email, ""))
	if err := s.SendGenerationMedia(ctx, cfg, mediaType, filename, contentType, data, text); err != nil {
		s.logger.Warn("successful generation Telegram notification", "job_id", job.ID, "err", err)
	}
}

func generationTemplateVars(job model.AIGenerationJob, email, failure string) map[string]string {
	if strings.TrimSpace(failure) == "" {
		failure = strings.TrimSpace(job.FailMessage)
	}
	if strings.TrimSpace(failure) == "" {
		failure = strings.TrimSpace(job.LastError)
	}
	if strings.TrimSpace(failure) == "" {
		failure = "Не указана"
	}
	createdAt := job.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now()
	}
	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		loc = time.Local
	}
	return map[string]string{
		"dateTime":  createdAt.In(loc).Format("02.01.2006 15:04:05"),
		"userEmail": strings.TrimSpace(email),
		"prompt":    strings.TrimSpace(job.Prompt),
		"error":     strings.TrimSpace(failure),
	}
}

func jobHasReference(job model.AIGenerationJob) bool {
	return len(generationReferenceIDs(job)) > 0
}

func generationReferenceIDs(job model.AIGenerationJob) []string {
	ids := make([]string, 0, 2+len(job.CombineUploadIDs)+len(job.ReferenceUploadIDs)+len(job.ReferenceVideoUploadIDs)+len(job.ReferenceAudioUploadIDs))
	for _, id := range append([]string{job.SourceUploadID, job.LastFrameUploadID}, append(append(job.CombineUploadIDs, job.ReferenceUploadIDs...), append(job.ReferenceVideoUploadIDs, job.ReferenceAudioUploadIDs...)...)...) {
		if strings.TrimSpace(id) != "" {
			ids = append(ids, strings.TrimSpace(id))
		}
	}
	return ids
}

func telegramMediaType(contentType, mode string) string {
	if model.IsVideoGenerationMode(mode) || strings.HasPrefix(strings.ToLower(contentType), "video/") {
		return TelegramMediaVideo
	}
	return TelegramMediaPhoto
}

func mediaExtension(contentType string) string {
	if ext, err := mime.ExtensionsByType(strings.TrimSpace(strings.Split(contentType, ";")[0])); err == nil && len(ext) > 0 {
		return ext[0]
	}
	return ".bin"
}

func (s *TelegramService) dispatchAdminNotification(ctx context.Context, text, kind string) {
	if strings.TrimSpace(text) == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cfg, cfgErr := s.settings.GetEffective(ctx)
		if cfgErr != nil {
			slog.Warn("telegram settings unavailable", "kind", kind, "err", cfgErr)
			return
		}
		proxy := s.localProxy
		if cfg.ProxyEnabled && cfg.ProxyActiveURL != "" {
			proxy = cfg.ProxyActiveURL
		}
		if err := s.enqueueTelegramNotification(ctx, kind, text, cfg.ChatID, proxy, map[string]any{"kind": kind}); err != nil {
			slog.Warn("telegram queue enqueue failed", "kind", kind, "err", err)
		}
	}()
}

func (s *TelegramService) send(ctx context.Context, cfg model.TelegramSettings, text string) error {
	token := strings.TrimSpace(cfg.BotToken)
	chatID := strings.TrimSpace(cfg.ChatID)
	if token == "" || chatID == "" {
		return ErrTelegramNotConfigured
	}
	if strings.TrimSpace(text) == "" {
		return errors.New("empty message")
	}
	return s.telegramSendMessage(ctx, token, chatID, text)
}

// SendDigestMessage posts an HTML ops digest into a forum topic, bypassing the notification queue.
func (s *TelegramService) SendDigestMessage(ctx context.Context, chatID, text string, topicID int) error {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return err
	}
	token := strings.TrimSpace(cfg.BotToken)
	chatID = strings.TrimSpace(chatID)
	if token == "" || chatID == "" {
		return ErrTelegramNotConfigured
	}
	if strings.TrimSpace(text) == "" {
		return errors.New("empty message")
	}
	return s.telegramSendThreadHTML(ctx, token, chatID, text, topicID)
}

func applyTelegramTemplate(tpl string, vars map[string]string) string {
	out := tpl
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{"+k+"}", v)
	}
	lines := strings.Split(out, "\n")
	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		if strings.Contains(line, "{") && strings.Contains(line, "}") {
			continue
		}
		filtered = append(filtered, line)
	}
	return strings.TrimSpace(strings.Join(filtered, "\n"))
}

func displayTelegramName(name, email string) string {
	name = strings.TrimSpace(name)
	if name != "" {
		return name
	}
	email = strings.TrimSpace(email)
	if at := strings.Index(email, "@"); at > 0 {
		return email[:at]
	}
	return email
}
