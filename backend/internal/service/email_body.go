package service

import "html"

// Shared row builders for transactional emails. Content is injected into the
// renderer's inner table; do not wrap with <table> here.
func emailGreetingRow(name string) string {
	displayName := html.EscapeString(name)
	return `<tr><td style="padding:0 0 16px;font-size:16px;line-height:1.6;color:#1e293b;">Здравствуйте, ` + displayName + `!</td></tr>`
}

func emailParagraphRow(text string) string {
	return `<tr><td style="padding:0 0 20px;font-size:16px;line-height:1.6;color:#1e293b;">` + text + `</td></tr>`
}

func emailLinkBoxRow(url string) string {
	escaped := html.EscapeString(url)
	return `<tr><td style="padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;word-break:break-all;"><a href="` + escaped + `" style="color:#2563eb;font-size:14px;line-height:1.6;text-decoration:underline;">` + escaped + `</a></td></tr>`
}

func emailNoteRow(text string) string {
	return `<tr><td style="padding:0;font-size:14px;line-height:1.6;color:#64748b;">` + text + `</td></tr>`
}
