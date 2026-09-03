package service

import (
	"context"
	"errors"

	"github.com/postilka/postilka/internal/model"
)

type EmailService struct {
	mail      *MailService
	templates *EmailTemplateSettingsService
	renderer  *EmailRenderer
}

func NewEmailService(mail *MailService, templates *EmailTemplateSettingsService, renderer *EmailRenderer) *EmailService {
	return &EmailService{
		mail:      mail,
		templates: templates,
		renderer:  renderer,
	}
}

func (e *EmailService) Render(ctx context.Context, body EmailBody) (string, error) {
	cfg, err := e.templates.GetEffective(ctx)
	if err != nil {
		return "", err
	}
	return e.renderer.Render(cfg, body), nil
}

func (e *EmailService) Send(ctx context.Context, to, subject string, body EmailBody) error {
	if !model.IsDeliverableEmail(to) {
		return nil
	}
	html, err := e.Render(ctx, body)
	if err != nil {
		return err
	}
	return e.mail.Send(ctx, to, subject, html)
}

func (e *EmailService) SendTest(ctx context.Context, to string) error {
	return e.Send(ctx, to, "Postilka — тестовое письмо", DefaultTestEmailBody())
}

func MapEmailSendError(err error) string {
	if err == nil {
		return ""
	}
	if errors.Is(err, ErrEmailDisabled) {
		return "Включите отправку email в настройках"
	}
	if errors.Is(err, ErrSMTPNotConfigured) {
		return "Заполните host, порт и учётные данные SMTP"
	}
	return err.Error()
}
