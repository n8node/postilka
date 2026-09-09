package model

import (
	"strconv"
	"time"
)

const AuthScreenMaxSlides = 4

type AuthScreenSlide struct {
	Slot            int       `json:"slot"`
	Enabled         bool      `json:"enabled"`
	Tag             string    `json:"tag"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	MediaKind       string    `json:"media_kind"`
	MediaURL        string    `json:"media_url,omitempty"`
	DurationSeconds int       `json:"duration_seconds"`
	UpdatedAt       time.Time `json:"updated_at"`
	MediaS3Key      string    `json:"-"`
	MediaType       string    `json:"-"`
}

type AuthScreenSettings struct {
	LogoURL   string            `json:"logo_url,omitempty"`
	Slides    []AuthScreenSlide `json:"slides"`
	UpdatedAt time.Time         `json:"updated_at"`
}

type AuthScreenSlideUpdate struct {
	Enabled         bool   `json:"enabled"`
	Tag             string `json:"tag"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	DurationSeconds int    `json:"duration_seconds"`
}

type AuthScreenAdminView struct {
	Settings AuthScreenSettings `json:"settings"`
}

func AuthScreenLogoAPIPath(updatedAt time.Time) string {
	path := "/auth/screen/logo"
	if updatedAt.IsZero() {
		return path
	}
	return path + "?v=" + strconv.FormatInt(updatedAt.UnixMilli(), 10)
}

func AuthScreenSlideMediaAPIPath(slot int, updatedAt time.Time) string {
	path := "/auth/screen/slides/" + strconv.Itoa(slot) + "/media"
	if updatedAt.IsZero() {
		return path
	}
	return path + "?v=" + strconv.FormatInt(updatedAt.UnixMilli(), 10)
}
