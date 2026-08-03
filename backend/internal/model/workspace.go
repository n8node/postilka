package model

import "time"

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	OwnerID   string    `json:"owner_id"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
