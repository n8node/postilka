package model

type HeaderButton struct {
	ID     string `json:"id"`
	Text   string `json:"text"`
	Icon   string `json:"icon,omitempty"`
	Href   string `json:"href"`
	Color  string `json:"color"`
	Radius int    `json:"radius"`
	Shadow string `json:"shadow"`
}

type HeaderButtonsView struct {
	Buttons []HeaderButton `json:"buttons"`
}
