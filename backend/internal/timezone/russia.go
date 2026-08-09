package timezone

import (
	"fmt"
	"strings"
	"time"
)

// Zone is an IANA timezone used in the Russian Federation.
type Zone struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// RussiaZones lists all IANA timezones covering Russian regions (west to east).
var RussiaZones = []Zone{
	{ID: "Europe/Kaliningrad", Label: "Калининград (UTC+2)"},
	{ID: "Europe/Moscow", Label: "Москва, Санкт-Петербург (UTC+3)"},
	{ID: "Europe/Kirov", Label: "Киров (UTC+3)"},
	{ID: "Europe/Volgograd", Label: "Волгоград (UTC+3)"},
	{ID: "Europe/Simferopol", Label: "Симферополь (UTC+3)"},
	{ID: "Europe/Astrakhan", Label: "Астрахань (UTC+4)"},
	{ID: "Europe/Saratov", Label: "Саратов (UTC+4)"},
	{ID: "Europe/Ulyanovsk", Label: "Ульяновск (UTC+4)"},
	{ID: "Europe/Samara", Label: "Самара, Ижевск (UTC+4)"},
	{ID: "Asia/Yekaterinburg", Label: "Екатеринбург, Пермь (UTC+5)"},
	{ID: "Asia/Omsk", Label: "Омск (UTC+6)"},
	{ID: "Asia/Novosibirsk", Label: "Новосибирск (UTC+7)"},
	{ID: "Asia/Barnaul", Label: "Барнаул (UTC+7)"},
	{ID: "Asia/Tomsk", Label: "Томск (UTC+7)"},
	{ID: "Asia/Novokuznetsk", Label: "Новокузнецк (UTC+7)"},
	{ID: "Asia/Krasnoyarsk", Label: "Красноярск (UTC+7)"},
	{ID: "Asia/Irkutsk", Label: "Иркутск (UTC+8)"},
	{ID: "Asia/Chita", Label: "Чита (UTC+9)"},
	{ID: "Asia/Yakutsk", Label: "Якутск (UTC+9)"},
	{ID: "Asia/Khandyga", Label: "Хандыга (UTC+9)"},
	{ID: "Asia/Vladivostok", Label: "Владивосток, Хабаровск (UTC+10)"},
	{ID: "Asia/Ust-Nera", Label: "Усть-Нера (UTC+10)"},
	{ID: "Asia/Magadan", Label: "Магадан (UTC+11)"},
	{ID: "Asia/Sakhalin", Label: "Сахалин (UTC+11)"},
	{ID: "Asia/Srednekolymsk", Label: "Среднеколымск (UTC+11)"},
	{ID: "Asia/Kamchatka", Label: "Камчатка (UTC+12)"},
	{ID: "Asia/Anadyr", Label: "Анадырь (UTC+12)"},
}

var allowed = func() map[string]struct{} {
	m := make(map[string]struct{}, len(RussiaZones))
	for _, z := range RussiaZones {
		m[z.ID] = struct{}{}
	}
	return m
}()

// Default is the fallback timezone for new users and invalid stored values.
const Default = "Europe/Moscow"

// ErrInvalidTimezone is returned when the timezone is not in RussiaZones.
var ErrInvalidTimezone = fmt.Errorf("invalid timezone")

// IsAllowed reports whether tz is a supported Russian IANA timezone.
func IsAllowed(tz string) bool {
	_, ok := allowed[strings.TrimSpace(tz)]
	return ok
}

// Validate returns nil when tz is allowed.
func Validate(tz string) error {
	if !IsAllowed(tz) {
		return ErrInvalidTimezone
	}
	return nil
}

// Normalize returns tz when allowed, otherwise Default.
func Normalize(tz string) string {
	tz = strings.TrimSpace(tz)
	if IsAllowed(tz) {
		return tz
	}
	return Default
}

// ParsePublishAt interprets publish_at in the user's timezone.
// Accepts RFC3339 or local datetime "2006-01-02T15:04" / "2006-01-02 15:04".
func ParsePublishAt(raw, userTZ string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}

	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		utc := t.UTC()
		return &utc, nil
	}

	loc, err := time.LoadLocation(Normalize(userTZ))
	if err != nil {
		return nil, fmt.Errorf("timezone: %w", err)
	}

	for _, layout := range []string{"2006-01-02T15:04", "2006-01-02 15:04", "2006-01-02T15:04:05"} {
		if t, err := time.ParseInLocation(layout, raw, loc); err == nil {
			utc := t.UTC()
			return &utc, nil
		}
	}

	return nil, fmt.Errorf("publish_at: укажите дату в формате RFC3339 или YYYY-MM-DDTHH:MM")
}
