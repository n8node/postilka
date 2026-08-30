package service

import (
	"errors"
	"strings"
)

type socialContent struct {
	Text        string
	Title       string
	Description string
	ImageURL    string
	VideoURL    string
	MediaURL    string
	FileID      string
	ImageFileID string
	VideoFileID string
	Format      string
}

func readSocialContent(inputs map[string]interface{}) socialContent {
	text := strings.TrimSpace(getString(inputs, "text", ""))
	description := strings.TrimSpace(getString(inputs, "description", ""))
	if text == "" {
		text = description
	}
	return socialContent{
		Text:        text,
		Title:       strings.TrimSpace(getString(inputs, "titleText", "")),
		Description: description,
		ImageURL:    strings.TrimSpace(getString(inputs, "imageUrl", "")),
		VideoURL:    strings.TrimSpace(getString(inputs, "videoUrl", "")),
		MediaURL:    strings.TrimSpace(getString(inputs, "mediaUrl", "")),
		FileID:      strings.TrimSpace(getString(inputs, "fileId", "")),
		ImageFileID: strings.TrimSpace(getString(inputs, "imageFileId", "")),
		VideoFileID: strings.TrimSpace(getString(inputs, "videoFileId", "")),
		Format:      strings.TrimSpace(getString(inputs, "format", "")),
	}
}

func (c socialContent) hasText() bool {
	return c.Text != "" || c.Description != ""
}

func (c socialContent) hasImage() bool {
	return c.ImageURL != "" || c.ImageFileID != ""
}

func (c socialContent) hasVideo() bool {
	return c.VideoURL != "" || c.VideoFileID != ""
}

func (c socialContent) hasMedia() bool {
	return c.hasImage() || c.hasVideo() || c.MediaURL != "" || c.FileID != ""
}

func (c socialContent) resolvedMediaURL() string {
	if c.MediaURL != "" {
		return c.MediaURL
	}
	if c.ImageURL != "" {
		return c.ImageURL
	}
	return c.VideoURL
}

func (c socialContent) resolvedFileID() string {
	if c.FileID != "" {
		return c.FileID
	}
	if c.ImageFileID != "" {
		return c.ImageFileID
	}
	return c.VideoFileID
}

func validateSocialNodeInputs(nodeType string, inputs map[string]interface{}) error {
	c := readSocialContent(inputs)
	switch nodeType {
	case "social_telegram":
		format := c.Format
		if format == "" {
			format = "message"
		}
		if format == "video_note" || format == "short_video" {
			if !c.hasVideo() && !c.hasMedia() {
				return errors.New("для кружочка нужно видео")
			}
			return nil
		}
		if format == "story" {
			if !c.hasMedia() {
				return errors.New("для истории нужно фото или видео")
			}
			return nil
		}
		if !c.hasText() && !c.hasMedia() {
			return errors.New("укажите текст, фото или видео")
		}
		return nil
	case "social_max", "social_photochka":
		if !c.hasText() && !c.hasMedia() {
			return errors.New("укажите текст, фото или видео")
		}
		return nil
	case "social_vk":
		format := c.Format
		if format == "" {
			format = "wall_post"
		}
		if format == "clip" {
			if !c.hasVideo() && !c.hasMedia() {
				return errors.New("для клипа нужно видео")
			}
			return nil
		}
		if format == "story" {
			if !c.hasMedia() {
				return errors.New("для истории нужно фото или видео")
			}
			return nil
		}
		if !c.hasText() && !c.hasMedia() {
			return errors.New("укажите текст, фото или видео")
		}
		return nil
	case "social_youtube":
		if c.Title == "" {
			return errors.New("укажите заголовок видео")
		}
		if !c.hasVideo() && !c.hasMedia() {
			return errors.New("укажите видео")
		}
		return nil
	case "social_dzen":
		format := c.Format
		if format == "" {
			format = "brief"
		}
		if format == "video" {
			if !c.hasVideo() && !c.hasMedia() {
				return errors.New("для видео в Дзен нужно видео")
			}
			return nil
		}
		if format == "article" {
			if !c.hasText() {
				return errors.New("для статьи нужен текст")
			}
			return nil
		}
		if !c.hasText() && !c.hasMedia() {
			return errors.New("укажите текст, фото или видео")
		}
		return nil
	case "social_rutube":
		if c.Title == "" && strings.TrimSpace(getString(inputs, "title", "")) == "" {
			return errors.New("укажите заголовок видео")
		}
		if !c.hasVideo() && !c.hasMedia() {
			return errors.New("укажите видео")
		}
		return nil
	case "social_ok", "draft_approval", "human_review":
		if !c.hasText() && !c.hasMedia() {
			return errors.New("укажите текст, фото или видео")
		}
		return nil
	default:
		return nil
	}
}
