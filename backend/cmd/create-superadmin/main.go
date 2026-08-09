package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

func main() {
	email := flag.String("email", envOr("SUPERADMIN_EMAIL", ""), "superadmin email")
	password := flag.String("password", envOr("SUPERADMIN_PASSWORD", ""), "password (required when creating a new user)")
	name := flag.String("name", envOr("SUPERADMIN_NAME", "Superadmin"), "display name for new user")
	flag.Parse()

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if databaseURL == "" {
		fail("DATABASE_URL is required")
	}
	if jwtSecret == "" {
		jwtSecret = "create-superadmin-unused-secret"
	}
	if strings.TrimSpace(*email) == "" {
		fail("email is required (-email or SUPERADMIN_EMAIL)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	db, err := repository.NewPostgres(ctx, databaseURL)
	if err != nil {
		fail("connect postgres: %v", err)
	}
	defer db.Close()

	users := repository.NewUserRepository(db.Pool)
	workspaces := repository.NewWorkspaceRepository(db.Pool)
	plans := repository.NewPlanRepository(db.Pool)
	settings := repository.NewSettingsRepository(db.Pool)
	invites := repository.NewInviteRepository(db.Pool)
	authMW := middleware.NewAuth(jwtSecret)
	inviteSvc := service.NewInviteService(invites, settings, users, db.Pool)
	authSvc := service.NewAuthService(users, workspaces, plans, inviteSvc, nil, db.Pool, authMW, nil, nil, nil)

	user, created, err := authSvc.EnsureSuperAdmin(ctx, *email, *password, *name)
	if err != nil {
		fail("ensure superadmin: %v", err)
	}

	action := "promoted"
	if created {
		action = "created"
	}
	fmt.Printf("ok: %s platform admin %s (%s)\n", action, user.Email, user.ID)
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
