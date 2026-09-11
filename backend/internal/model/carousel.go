package model

import "time"

type CarouselFile struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	MimeType string `json:"mime_type"`
}

type CarouselSlide struct {
	Role            string        `json:"role"`
	Headline        string        `json:"headline"`
	Body            string        `json:"body"`
	File            CarouselFile  `json:"file"`
	BackgroundFile  *CarouselFile `json:"background_file,omitempty"`
	GenerationJobID string        `json:"generation_job_id,omitempty"`
	GenerationCost  int           `json:"generation_credit_cost,omitempty"`
}

type Carousel struct {
	ID                string          `json:"id"`
	WorkspaceID       string          `json:"workspace_id"`
	CreatedBy         *string         `json:"created_by,omitempty"`
	Title             string          `json:"title"`
	Topic             string          `json:"topic"`
	Caption           string          `json:"caption"`
	Slides            []CarouselSlide `json:"slides"`
	GenerationCredits int             `json:"generation_credits"`
	TextCredits       int             `json:"text_credits"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type SaveCarouselRequest struct {
	Title             string          `json:"title"`
	Topic             string          `json:"topic"`
	Caption           string          `json:"caption"`
	Slides            []CarouselSlide `json:"slides"`
	GenerationCredits int             `json:"generation_credits"`
	TextCredits       int             `json:"text_credits"`
}
