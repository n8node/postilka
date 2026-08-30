package service

import (
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	reHelpScript    = regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`)
	reHelpStyle     = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`)
	reHelpIframe    = regexp.MustCompile(`(?is)<iframe[^>]*>.*?</iframe>`)
	reHelpObject    = regexp.MustCompile(`(?is)<object[^>]*>.*?</object>`)
	reHelpEventAttr = regexp.MustCompile(`(?i)\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)`)
	reHelpJSURL     = regexp.MustCompile(`(?i)(javascript|vbscript|data):`)
	reHelpTags      = regexp.MustCompile(`(?is)</?([a-z0-9]+)([^>]*)>`)
	reHelpAttr      = regexp.MustCompile(`(?i)([a-z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))`)
	reHelpTextTags  = regexp.MustCompile(`(?is)<[^>]+>`)
)

var helpAllowedTags = map[string]map[string]bool{
	"p":          {},
	"br":         {},
	"div":        {},
	"h2":         {},
	"h3":         {},
	"h4":         {},
	"ul":         {},
	"ol":         {},
	"li":         {},
	"strong":     {},
	"b":          {},
	"em":         {},
	"i":          {},
	"u":          {},
	"blockquote": {},
	"hr":         {},
	"span":       {},
	"a":          {"href": true, "target": true, "rel": true, "title": true},
	"img":        {"src": true, "alt": true, "title": true},
}

func SanitizeHelpHTML(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	if utf8.RuneCountInString(s) > 200_000 {
		s = string([]rune(s)[:200_000])
	}
	s = reHelpScript.ReplaceAllString(s, "")
	s = reHelpStyle.ReplaceAllString(s, "")
	s = reHelpIframe.ReplaceAllString(s, "")
	s = reHelpObject.ReplaceAllString(s, "")
	s = reHelpEventAttr.ReplaceAllString(s, "")
	s = reHelpTags.ReplaceAllStringFunc(s, sanitizeHelpTag)
	return strings.TrimSpace(s)
}

func sanitizeHelpTag(tag string) string {
	m := reHelpTags.FindStringSubmatch(tag)
	if len(m) < 3 {
		return ""
	}
	name := strings.ToLower(m[1])
	allowed, ok := helpAllowedTags[name]
	if !ok {
		return ""
	}
	closing := strings.HasPrefix(strings.TrimSpace(tag), "</")
	if closing {
		return "</" + name + ">"
	}
	selfClose := name == "br" || name == "hr" || name == "img"
	attrs := ""
	for _, am := range reHelpAttr.FindAllStringSubmatch(m[2], -1) {
		key := strings.ToLower(am[1])
		if !allowed[key] {
			continue
		}
		val := am[3]
		if val == "" {
			val = am[4]
		}
		if val == "" {
			val = am[5]
		}
		if !helpAttrAllowed(name, key, val) {
			continue
		}
		attrs += ` ` + key + `="` + htmlAttrEscape(val) + `"`
		if name == "a" && key == "href" && !strings.Contains(attrs, ` rel=`) {
			attrs += ` rel="noopener noreferrer"`
		}
	}
	if selfClose {
		return "<" + name + attrs + " />"
	}
	return "<" + name + attrs + ">"
}

func helpAttrAllowed(tag, key, val string) bool {
	v := strings.TrimSpace(val)
	if reHelpJSURL.MatchString(v) {
		return false
	}
	if tag == "a" && key == "href" {
		return helpSafeURL(v, false)
	}
	if tag == "img" && key == "src" {
		return helpSafeURL(v, true)
	}
	if tag == "a" && key == "target" {
		return v == "_blank" || v == "_self"
	}
	return utf8.RuneCountInString(v) <= 2000
}

func helpSafeURL(raw string, image bool) bool {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return false
	}
	if strings.HasPrefix(raw, "/app/api/v1/help/images/") || strings.HasPrefix(raw, "/api/v1/help/images/") {
		return true
	}
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	switch strings.ToLower(u.Scheme) {
	case "http", "https":
		return u.Host != ""
	default:
		if image {
			return false
		}
		return raw[0] == '/' && !strings.HasPrefix(raw, "//")
	}
}

func htmlAttrEscape(s string) string {
	s = strings.ReplaceAll(s, `&`, "&amp;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	s = strings.ReplaceAll(s, `<`, "&lt;")
	s = strings.ReplaceAll(s, `>`, "&gt;")
	return s
}

func HelpExcerptFromHTML(html string, maxRunes int) string {
	text := strings.TrimSpace(reHelpTextTags.ReplaceAllString(html, " "))
	text = strings.Join(strings.Fields(text), " ")
	if maxRunes <= 0 {
		maxRunes = 180
	}
	if utf8.RuneCountInString(text) <= maxRunes {
		return text
	}
	return string([]rune(text)[:maxRunes]) + "…"
}
