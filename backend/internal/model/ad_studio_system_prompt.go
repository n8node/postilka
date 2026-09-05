package model

import "time"

type AdStudioSystemPrompt struct {
	ID          int       `db:"id" json:"id"`
	Mode        string    `db:"mode" json:"mode"`
	Scenario    string    `db:"scenario" json:"scenario"`
	PromptText  string    `db:"prompt_text" json:"prompt_text"`
	IsActive    bool      `db:"is_active" json:"is_active"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

func (p AdStudioSystemPrompt) TableName() string {
	return "ad_studio_system_prompts"
}

// AdStudioSystemPromptWriteRequest is used for creating/updating prompts
 type AdStudioSystemPromptWriteRequest struct {
	Mode       string `json:"mode"`
	Scenario   string `json:"scenario"`
	PromptText string `json:"prompt_text"`
	IsActive   *bool  `json:"is_active,omitempty"`
}
