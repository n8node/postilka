package model

import "testing"

func TestWorkspaceRoleAtLeast(t *testing.T) {
	cases := []struct {
		role WorkspaceRole
		min  WorkspaceRole
		ok   bool
	}{
		{RoleOwner, RoleAdmin, true},
		{RoleAdmin, RoleEditor, true},
		{RoleEditor, RoleViewer, true},
		{RoleViewer, RoleEditor, false},
		{RoleEditor, RoleAdmin, false},
		{RoleAdmin, RoleOwner, false},
		{RoleViewer, RoleViewer, true},
	}
	for _, tc := range cases {
		if got := tc.role.AtLeast(tc.min); got != tc.ok {
			t.Fatalf("%s.AtLeast(%s)=%v want %v", tc.role, tc.min, got, tc.ok)
		}
	}
}
