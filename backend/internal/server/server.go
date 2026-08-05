package server

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/handler"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type Server struct {
	cfg    *config.Config
	router chi.Router
}

func New(cfg *config.Config, db *repository.Postgres, logger *slog.Logger) *Server {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Logger)

	authMW := middleware.NewAuth(cfg.JWTSecret)

	userRepo := repository.NewUserRepository(db.Pool)
	wsRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	settingsRepo := repository.NewSettingsRepository(db.Pool)
	inviteRepo := repository.NewInviteRepository(db.Pool)
	inviteSvc := service.NewInviteService(inviteRepo, settingsRepo, userRepo, db.Pool)
	authSvc := service.NewAuthService(userRepo, wsRepo, planRepo, inviteSvc, db.Pool, authMW)
	identityRepo := repository.NewUserLoginIdentityRepository(db.Pool)
	oauthSessionRepo := repository.NewOAuthLoginSessionRepository(db.Pool)
	oauthSettingsRepo := repository.NewOAuthSettingsRepository(settingsRepo)
	oauthSvc := service.NewOAuthLoginService(
		userRepo, identityRepo, oauthSessionRepo, oauthSettingsRepo, wsRepo, planRepo, settingsRepo, db.Pool, authMW, cfg,
	)
	wsSvc := service.NewWorkspaceService(wsRepo)
	planSvc := service.NewPlanService(planRepo, wsRepo)

	health := handler.NewHealthHandler(cfg, db)
	status := handler.NewStatusHandler(cfg)
	authHandler := handler.NewAuthHandler(authSvc, wsSvc, authMW, cfg)
	oauthHandler := handler.NewOAuthLoginHandler(oauthSvc, wsSvc, authMW, cfg)
	wsHandler := handler.NewWorkspaceHandler(wsSvc, cfg)
	adminHandler := handler.NewAdminHandler(userRepo, planSvc)
	inviteHandler := handler.NewInviteHandler(inviteSvc, oauthSvc)
	adminInviteHandler := handler.NewAdminInviteHandler(inviteSvc, userRepo, oauthSvc)

	r.Get("/health", health.ServeHTTP)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health.ServeHTTP)
		r.Get("/status", status.ServeHTTP)

		r.Route("/auth", func(r chi.Router) {
			r.Get("/methods", inviteHandler.AuthMethods)
			r.Post("/invite/verify", inviteHandler.VerifyInvite)
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.With(authMW.Required).Get("/me", authHandler.Me)

			r.Get("/oauth/vk/start", oauthHandler.StartVKPublic)
			r.Get("/oauth/vk/callback", oauthHandler.VKCallback)
			r.Get("/oauth/max/start", oauthHandler.StartMAXPublic)
			r.Post("/oauth/max/webhook", oauthHandler.MAXWebhook)
			r.Get("/oauth/max/status", oauthHandler.MAXStatus)
			r.With(authMW.Required).Get("/oauth/vk/link", oauthHandler.StartVKLink)
			r.With(authMW.Required).Get("/oauth/max/link", oauthHandler.StartMAXLink)
		})

		r.With(authMW.Required).Get("/user/login-identities", oauthHandler.ListIdentities)
		r.With(authMW.Required).Delete("/user/login-identities/{provider}", oauthHandler.Unlink)

		r.Get("/public/invites", inviteHandler.PublicSystemInvites)

		r.With(authMW.Required).Get("/user/invites", inviteHandler.UserInvites)

		r.With(authMW.Required).Get("/workspaces", wsHandler.List)
		r.Route("/workspaces", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authMW.Required)
				r.Get("/me", wsHandler.Me)
				r.Post("/active", wsHandler.SetActive)
			})
		})

		r.Route("/admin", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authMW.Required, middleware.RequirePlatformAdmin(userRepo))
				r.Get("/me", adminHandler.Me)
				r.Get("/users", adminHandler.ListUsers)
				r.Put("/users/{userID}/plan", adminHandler.AssignUserPlan)

				r.Get("/plans", adminHandler.ListPlans)
				r.Post("/plans", adminHandler.CreatePlan)
				r.Get("/plans/{planID}", adminHandler.GetPlan)
				r.Put("/plans/{planID}", adminHandler.UpdatePlan)
				r.Delete("/plans/{planID}", adminHandler.DeletePlan)

				r.Get("/auth-settings", adminInviteHandler.AuthSettingsGet)
				r.Put("/auth-settings", adminInviteHandler.AuthSettingsPut)
				r.Get("/invites", adminInviteHandler.List)
				r.Post("/invites/issue", adminInviteHandler.IssueSystem)
				r.Post("/invites/revoke", adminInviteHandler.Revoke)
				r.Get("/users/{userID}/invites", adminInviteHandler.UserInvites)
				r.Post("/users/{userID}/invites", adminInviteHandler.AddUserInvites)
				r.Get("/users/{userID}/invite-relations", adminInviteHandler.UserInviteRelations)
			})
		})
	})

	return &Server{cfg: cfg, router: r}
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) Addr() string {
	return s.cfg.Addr()
}
