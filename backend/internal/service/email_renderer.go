package service

import (
	"html"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

type EmailRenderer struct{}

func NewEmailRenderer() *EmailRenderer {
	return &EmailRenderer{}
}

func (r *EmailRenderer) Render(cfg model.EmailTemplateSettings, body EmailBody) string {
	cfg = normalizeEmailTemplateSettings(cfg)
	primary := html.EscapeString(cfg.PrimaryColor)
	bg := html.EscapeString(cfg.BackgroundColor)
	radius := strconv.Itoa(cfg.CardRadiusPx)
	content := normalizeEmailContentHTML(injectPrimaryColor(body.ContentHTML, cfg.PrimaryColor))

	var b strings.Builder
	b.WriteString("<!DOCTYPE html><html lang=\"ru\"><head><meta charset=\"UTF-8\">")
	b.WriteString("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
	b.WriteString("<title>Postilka</title></head>")
	b.WriteString("<body style=\"margin:0;padding:0;background-color:")
	b.WriteString(bg)
	b.WriteString(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;\">")

	if pre := strings.TrimSpace(body.Preheader); pre != "" {
		b.WriteString("<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;\">")
		b.WriteString(html.EscapeString(pre))
		b.WriteString("</div>")
	}

	b.WriteString("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:")
	b.WriteString(bg)
	b.WriteString(";\"><tr><td align=\"center\" style=\"padding:32px 16px;\">")

	b.WriteString("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"max-width:600px;\">")

	// Logo
	b.WriteString("<tr><td align=\"center\" style=\"padding:0 0 20px;\">")
	if cfg.LogoURL != "" {
		b.WriteString("<img src=\"")
		b.WriteString(html.EscapeString(cfg.LogoURL))
		b.WriteString("\" alt=\"")
		b.WriteString(html.EscapeString(cfg.LogoAlt))
		b.WriteString("\" height=\"40\" style=\"display:block;height:40px;max-width:220px;border:0;outline:none;\">")
	} else {
		b.WriteString("<span style=\"font-size:22px;font-weight:700;letter-spacing:0.04em;color:")
		b.WriteString(primary)
		b.WriteString(";\">")
		b.WriteString(html.EscapeString(strings.ToUpper(cfg.LogoAlt)))
		b.WriteString("</span>")
	}
	b.WriteString("</td></tr>")

	// Main card
	b.WriteString("<tr><td style=\"background:#ffffff;border-radius:")
	b.WriteString(radius)
	b.WriteString("px;padding:28px 28px 32px;box-shadow:0 2px 8px rgba(15,23,42,0.06);\">")
	b.WriteString("&#8203;<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">")
	if content != "" {
		b.WriteString(content)
	}
	b.WriteString("</table>")

	ctaLabel := strings.TrimSpace(body.CTALabel)
	ctaURL := strings.TrimSpace(body.CTAURL)
	if ctaLabel != "" && ctaURL != "" {
		b.WriteString("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"margin-top:28px;\"><tr><td align=\"center\">")
		b.WriteString("<a href=\"")
		b.WriteString(html.EscapeString(ctaURL))
		b.WriteString("\" style=\"display:inline-block;min-width:220px;padding:14px 28px;background-color:")
		b.WriteString(primary)
		b.WriteString(";color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;line-height:1.2;border-radius:999px;text-align:center;\">")
		b.WriteString(html.EscapeString(ctaLabel))
		b.WriteString("</a></td></tr></table>")
	}
	b.WriteString("</td></tr>")

	// Footer
	b.WriteString("<tr><td align=\"center\" style=\"padding:28px 12px 8px;\">")

	if cfg.SignatureTitle != "" {
		b.WriteString("<p style=\"margin:0 0 6px;font-size:16px;font-weight:700;color:#0f172a;\">")
		b.WriteString(html.EscapeString(cfg.SignatureTitle))
		b.WriteString("</p>")
	}
	if cfg.SignatureTeam != "" {
		b.WriteString("<p style=\"margin:0 0 18px;font-size:14px;color:#475569;\">")
		b.WriteString(html.EscapeString(cfg.SignatureTeam))
		b.WriteString("</p>")
	}

	if len(cfg.FooterLinks) > 0 {
		b.WriteString("<p style=\"margin:0 0 18px;font-size:14px;line-height:1.8;\">")
		for i, link := range cfg.FooterLinks {
			if i > 0 {
				b.WriteString("<span style=\"color:#cbd5e1;\">&nbsp;&nbsp;|&nbsp;&nbsp;</span>")
			}
			if link.URL != "" {
				b.WriteString("<a href=\"")
				b.WriteString(html.EscapeString(link.URL))
				b.WriteString("\" style=\"color:")
				b.WriteString(primary)
				b.WriteString(";text-decoration:none;\">")
				b.WriteString(html.EscapeString(link.Label))
				b.WriteString("</a>")
			} else {
				b.WriteString(html.EscapeString(link.Label))
			}
		}
		b.WriteString("</p>")
	}

	if cfg.AppDownloadText != "" && (cfg.AppStoreURL != "" || cfg.GooglePlayURL != "") {
		b.WriteString("<p style=\"margin:0 0 12px;font-size:14px;color:#475569;\">")
		b.WriteString(html.EscapeString(cfg.AppDownloadText))
		b.WriteString("</p><p style=\"margin:0 0 18px;\">")
		if cfg.AppStoreURL != "" {
			b.WriteString("<a href=\"")
			b.WriteString(html.EscapeString(cfg.AppStoreURL))
			b.WriteString("\" style=\"display:inline-block;margin:0 6px 6px 0;padding:8px 14px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-size:12px;font-weight:600;\">App Store</a>")
		}
		if cfg.GooglePlayURL != "" {
			b.WriteString("<a href=\"")
			b.WriteString(html.EscapeString(cfg.GooglePlayURL))
			b.WriteString("\" style=\"display:inline-block;margin:0 6px 6px 0;padding:8px 14px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-size:12px;font-weight:600;\">Google Play</a>")
		}
		b.WriteString("</p>")
	}

	if len(cfg.SocialLinks) > 0 {
		b.WriteString("<p style=\"margin:0 0 18px;\">")
		for _, social := range cfg.SocialLinks {
			if social.URL == "" {
				continue
			}
			b.WriteString("<a href=\"")
			b.WriteString(html.EscapeString(social.URL))
			b.WriteString("\" title=\"")
			b.WriteString(html.EscapeString(social.Label))
			b.WriteString("\" style=\"display:inline-block;width:34px;height:34px;line-height:34px;margin:0 4px;text-align:center;border-radius:50%;background:#e2e8f0;text-decoration:none;vertical-align:middle;\">")
			if social.IconURL != "" {
				b.WriteString("<img src=\"")
				b.WriteString(html.EscapeString(social.IconURL))
				b.WriteString("\" alt=\"")
				b.WriteString(html.EscapeString(social.Label))
				b.WriteString("\" width=\"18\" height=\"18\" style=\"display:inline-block;width:18px;height:18px;border:0;vertical-align:middle;\">")
			} else {
				b.WriteString("<span style=\"font-size:11px;font-weight:700;color:#64748b;\">")
				b.WriteString(html.EscapeString(initials(social.Label)))
				b.WriteString("</span>")
			}
			b.WriteString("</a>")
		}
		b.WriteString("</p>")
	}

	if cfg.FooterLegalText != "" {
		b.WriteString("<p style=\"margin:0 0 12px;font-size:12px;line-height:1.6;color:#94a3b8;max-width:480px;\">")
		b.WriteString(html.EscapeString(cfg.FooterLegalText))
		b.WriteString("</p>")
	}
	if cfg.UnsubscribeText != "" && cfg.UnsubscribeURL != "" {
		b.WriteString("<p style=\"margin:0;font-size:12px;\"><a href=\"")
		b.WriteString(html.EscapeString(cfg.UnsubscribeURL))
		b.WriteString("\" style=\"color:")
		b.WriteString(primary)
		b.WriteString(";text-decoration:underline;\">")
		b.WriteString(html.EscapeString(cfg.UnsubscribeText))
		b.WriteString("</a></p>")
	}

	b.WriteString("</td></tr></table></td></tr></table></body></html>")
	return b.String()
}

func injectPrimaryColor(content, primaryColor string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	// Replace default blue in test content when admin picks another primary color.
	return strings.ReplaceAll(content, "#2563eb", primaryColor)
}

func normalizeEmailContentHTML(content string) string {
	return stripOuterEmailTable(strings.TrimSpace(content))
}

func stripOuterEmailTable(content string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	if strings.HasPrefix(content, "<!--") {
		if idx := strings.Index(content, ">"); idx >= 0 {
			content = strings.TrimSpace(content[idx+1:])
		}
	}
	lower := strings.ToLower(content)
	if strings.HasPrefix(lower, "<table") {
		start := strings.Index(content, ">")
		end := strings.LastIndex(lower, "</table>")
		if start >= 0 && end > start {
			content = strings.TrimSpace(content[start+1 : end])
		}
	}
	return content
}

func initials(label string) string {
	label = strings.TrimSpace(label)
	if label == "" {
		return "•"
	}
	runes := []rune(label)
	if len(runes) >= 2 {
		return strings.ToUpper(string(runes[:2]))
	}
	return strings.ToUpper(string(runes[0]))
}
