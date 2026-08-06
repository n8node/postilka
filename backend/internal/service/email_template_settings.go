package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidEmailTemplateSettings = errors.New("invalid email template settings")

var hexColorRe = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

type EmailBody struct {
	ContentHTML string
	Preheader   string
	CTALabel    string
	CTAURL      string
}

type EmailTemplateSettingsService struct {
	repo *repository.EmailTemplateSettingsRepository
}

func NewEmailTemplateSettingsService(repo *repository.EmailTemplateSettingsRepository) *EmailTemplateSettingsService {
	return &EmailTemplateSettingsService{repo: repo}
}

func (s *EmailTemplateSettingsService) GetStored(ctx context.Context) (*model.EmailTemplateSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultEmailTemplateSettings()
			return &model.EmailTemplateSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *EmailTemplateSettingsService) GetEffective(ctx context.Context) (model.EmailTemplateSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.EmailTemplateSettings{}, err
	}
	return normalizeEmailTemplateSettings(rec.Config), nil
}

func (s *EmailTemplateSettingsService) GetAdminView(ctx context.Context) (*model.EmailTemplateAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return &model.EmailTemplateAdminView{
		Settings:  normalizeEmailTemplateSettings(rec.Config),
		UpdatedAt: rec.UpdatedAt,
	}, nil
}

func (s *EmailTemplateSettingsService) Update(ctx context.Context, req model.EmailTemplateAdminUpdateRequest) (*model.EmailTemplateAdminView, error) {
	cfg := normalizeEmailTemplateSettings(req.Settings)
	if err := validateEmailTemplateSettings(cfg); err != nil {
		return nil, err
	}
	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &model.EmailTemplateAdminView{
		Settings:  updated.Config,
		UpdatedAt: updated.UpdatedAt,
	}, nil
}

func normalizeEmailTemplateSettings(cfg model.EmailTemplateSettings) model.EmailTemplateSettings {
	cfg.LogoURL = strings.TrimSpace(cfg.LogoURL)
	cfg.LogoAlt = strings.TrimSpace(cfg.LogoAlt)
	cfg.PrimaryColor = strings.TrimSpace(cfg.PrimaryColor)
	cfg.BackgroundColor = strings.TrimSpace(cfg.BackgroundColor)
	cfg.SignatureTitle = strings.TrimSpace(cfg.SignatureTitle)
	cfg.SignatureTeam = strings.TrimSpace(cfg.SignatureTeam)
	cfg.AppDownloadText = strings.TrimSpace(cfg.AppDownloadText)
	cfg.AppStoreURL = strings.TrimSpace(cfg.AppStoreURL)
	cfg.GooglePlayURL = strings.TrimSpace(cfg.GooglePlayURL)
	cfg.FooterLegalText = strings.TrimSpace(cfg.FooterLegalText)
	cfg.UnsubscribeText = strings.TrimSpace(cfg.UnsubscribeText)
	cfg.UnsubscribeURL = strings.TrimSpace(cfg.UnsubscribeURL)

	if cfg.LogoAlt == "" {
		cfg.LogoAlt = "Postilka"
	}
	if cfg.PrimaryColor == "" {
		cfg.PrimaryColor = "#2563eb"
	}
	if cfg.BackgroundColor == "" {
		cfg.BackgroundColor = "#eef1f6"
	}
	if cfg.CardRadiusPx <= 0 {
		cfg.CardRadiusPx = 20
	}
	if cfg.CardRadiusPx > 40 {
		cfg.CardRadiusPx = 40
	}

	links := make([]model.EmailFooterLink, 0, len(cfg.FooterLinks))
	for _, item := range cfg.FooterLinks {
		label := strings.TrimSpace(item.Label)
		url := strings.TrimSpace(item.URL)
		if label == "" && url == "" {
			continue
		}
		links = append(links, model.EmailFooterLink{Label: label, URL: url})
	}
	cfg.FooterLinks = links

	social := make([]model.EmailSocialLink, 0, len(cfg.SocialLinks))
	for _, item := range cfg.SocialLinks {
		label := strings.TrimSpace(item.Label)
		url := strings.TrimSpace(item.URL)
		iconURL := strings.TrimSpace(item.IconURL)
		if label == "" && url == "" && iconURL == "" {
			continue
		}
		social = append(social, model.EmailSocialLink{
			Label:   label,
			URL:     url,
			IconURL: iconURL,
		})
	}
	cfg.SocialLinks = social
	return cfg
}

func validateEmailTemplateSettings(cfg model.EmailTemplateSettings) error {
	if !hexColorRe.MatchString(cfg.PrimaryColor) {
		return fmt.Errorf("%w: invalid primary color", ErrInvalidEmailTemplateSettings)
	}
	if !hexColorRe.MatchString(cfg.BackgroundColor) {
		return fmt.Errorf("%w: invalid background color", ErrInvalidEmailTemplateSettings)
	}
	return nil
}

func DefaultTestEmailBody() EmailBody {
	return EmailBody{
		Preheader: "Проверка SMTP и оформления писем Postilka",
		ContentHTML: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:0 0 16px;font-size:16px;line-height:1.6;color:#1e293b;">Здравствуйте!</td></tr><tr><td style="padding:0 0 16px;font-size:16px;line-height:1.6;color:#1e293b;">Это <strong>тестовое письмо</strong> из админки Postilka. Если вы его получили — SMTP настроен верно, а шаблон письма отображается корректно.</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
  <tr>
    <td style="padding:8px 0;font-size:15px;line-height:1.5;color:#334155;">
      <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#2563eb;color:#ffffff;font-size:13px;margin-right:10px;">›</span>
      Планирование публикаций в VK, Telegram и других каналах
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:15px;line-height:1.5;color:#334155;">
      <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#2563eb;color:#ffffff;font-size:13px;margin-right:10px;">›</span>
      Календарь контента и статусы публикаций
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:15px;line-height:1.5;color:#334155;">
      <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#2563eb;color:#ffffff;font-size:13px;margin-right:10px;">›</span>
      AI-помощник для текстов и медиа
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:0;font-size:14px;line-height:1.6;color:#64748b;">Откройте приложение и начните планировать контент уже сегодня.</td></tr></table>`,
		CTALabel: "Открыть Postilka",
		CTAURL:   "https://postilka.ru/app",
	}
}
