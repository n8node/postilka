package model

type OpsCheckStatus string

const (
	OpsCheckOK   OpsCheckStatus = "ok"
	OpsCheckWarn OpsCheckStatus = "warn"
	OpsCheckFail OpsCheckStatus = "fail"
	OpsCheckSkip OpsCheckStatus = "skip"
)

type OpsCheck struct {
	Key    string         `json:"key"`
	Label  string         `json:"label"`
	Group  string         `json:"group"`
	Status OpsCheckStatus `json:"status"`
	Detail string         `json:"detail,omitempty"`
}

const (
	OpsGroupSystem = "system"
	OpsGroupSocial = "social"
)
