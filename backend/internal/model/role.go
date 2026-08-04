package model

// WorkspaceRole matches DB enum workspace_role.
type WorkspaceRole string

const (
	RoleOwner  WorkspaceRole = "owner"
	RoleAdmin  WorkspaceRole = "admin"
	RoleEditor WorkspaceRole = "editor"
	RoleViewer WorkspaceRole = "viewer"
)

// Rank returns relative privilege (higher = more access). Unknown roles rank 0.
func (r WorkspaceRole) Rank() int {
	switch r {
	case RoleViewer:
		return 1
	case RoleEditor:
		return 2
	case RoleAdmin:
		return 3
	case RoleOwner:
		return 4
	default:
		return 0
	}
}

func (r WorkspaceRole) AtLeast(min WorkspaceRole) bool {
	return r.Rank() >= min.Rank()
}
