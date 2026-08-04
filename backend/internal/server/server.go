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
	authSvc := service.NewAuthService(userRepo, wsRepo, authMW)
	wsSvc := service.NewWorkspaceService(wsRepo)

	health := handler.NewHealthHandler(cfg, db)
	status := handler.NewStatusHandler(cfg)
	authHandler := handler.NewAuthHandler(authSvc, wsSvc, authMW, cfg)
	wsHandler := handler.NewWorkspaceHandler(wsSvc, cfg)
	adminHandler := handler.NewAdminHandler(userRepo)

	r.Get("/health", health.ServeHTTP)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health.ServeHTTP)
		r.Get("/status", status.ServeHTTP)

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.With(authMW.Required).Get("/me", authHandler.Me)
		})

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
