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
	identityRepo := repository.NewUserLoginIdentityRepository(db.Pool)
	oauthSessionRepo := repository.NewOAuthLoginSessionRepository(db.Pool)
	oauthSettingsRepo := repository.NewOAuthSettingsRepository(settingsRepo)
	oauthSvc := service.NewOAuthLoginService(
		userRepo, identityRepo, oauthSessionRepo, oauthSettingsRepo, wsRepo, planRepo, settingsRepo, db.Pool, authMW, cfg,
	)
	wsSvc := service.NewWorkspaceService(wsRepo, planRepo)
	planSvc := service.NewPlanService(planRepo, wsRepo)
	adminUserSvc := service.NewAdminUserService(userRepo)
	adminWorkspaceSvc := service.NewAdminWorkspaceService(wsRepo, userRepo)
	smtpSettingsRepo := repository.NewSMTPSettingsRepository(db.Pool)
	smtpSettingsSvc := service.NewSMTPSettingsService(smtpSettingsRepo)
	mailSvc := service.NewMailService(smtpSettingsSvc)
	emailTemplateSettingsRepo := repository.NewEmailTemplateSettingsRepository(db.Pool)
	emailTemplateSettingsSvc := service.NewEmailTemplateSettingsService(emailTemplateSettingsRepo)
	emailRenderer := service.NewEmailRenderer()
	emailSvc := service.NewEmailService(mailSvc, emailTemplateSettingsSvc, emailRenderer)
	emailVerificationRepo := repository.NewEmailVerificationRepository(db.Pool)
	emailVerificationSvc := service.NewEmailVerificationService(emailVerificationRepo, userRepo, emailSvc, cfg, logger)
	passwordResetRepo := repository.NewPasswordResetRepository(db.Pool)
	passwordResetSvc := service.NewPasswordResetService(passwordResetRepo, userRepo, emailSvc, cfg, logger)
	authSvc := service.NewAuthService(userRepo, wsRepo, planRepo, inviteSvc, db.Pool, authMW, emailVerificationSvc, passwordResetSvc)

	paymentSettingsRepo := repository.NewPaymentSettingsRepository(db.Pool)
	paymentSettingsSvc := service.NewPaymentSettingsService(paymentSettingsRepo, cfg)
	planCheckoutRepo := repository.NewPlanCheckoutRepository(db.Pool)
	walletRepo := repository.NewWalletRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	subscriptionSvc := service.NewSubscriptionService(subscriptionRepo, planRepo, wsRepo)
	quotaSvc := service.NewQuotaService(planRepo, wsRepo, subscriptionRepo, usageRepo)
	checkoutSvc := service.NewCheckoutService(planCheckoutRepo, walletRepo, planRepo, wsRepo, userRepo, paymentSettingsSvc, subscriptionSvc, wsSvc, cfg)
	billingSvc := service.NewBillingService(planRepo, wsRepo, walletRepo, planCheckoutRepo, paymentSettingsSvc, quotaSvc, subscriptionSvc, wsSvc)

	health := handler.NewHealthHandler(cfg, db)
	status := handler.NewStatusHandler(cfg)
	authHandler := handler.NewAuthHandler(authSvc, wsSvc, authMW, cfg)
	oauthHandler := handler.NewOAuthLoginHandler(oauthSvc, wsSvc, authMW, cfg, logger)
	wsHandler := handler.NewWorkspaceHandler(wsSvc, cfg)
	adminHandler := handler.NewAdminHandler(userRepo, adminUserSvc, planSvc, oauthSvc, adminWorkspaceSvc)
	inviteHandler := handler.NewInviteHandler(inviteSvc, oauthSvc)
	adminInviteHandler := handler.NewAdminInviteHandler(inviteSvc, userRepo, oauthSvc)
	smtpHandler := handler.NewSMTPSettingsHandler(smtpSettingsSvc, emailSvc)
	emailTemplateHandler := handler.NewEmailTemplateSettingsHandler(emailTemplateSettingsSvc, emailSvc)
	paymentSettingsHandler := handler.NewPaymentSettingsHandler(paymentSettingsSvc)
	paymentWebhookHandler := handler.NewPaymentWebhookHandler(paymentSettingsSvc, checkoutSvc, logger)
	billingHandler := handler.NewBillingHandler(billingSvc, checkoutSvc, wsSvc)

	r.Get("/health", health.ServeHTTP)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health.ServeHTTP)
		r.Get("/status", status.ServeHTTP)

		r.Route("/auth", func(r chi.Router) {
			r.Get("/methods", inviteHandler.AuthMethods)
			r.Post("/invite/verify", inviteHandler.VerifyInvite)
			r.Post("/register", authHandler.Register)
			r.Post("/verify-email", authHandler.VerifyEmail)
			r.Post("/forgot-password", authHandler.ForgotPassword)
			r.Post("/reset-password", authHandler.ResetPassword)
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.With(authMW.Required).Get("/me", authHandler.Me)

			r.Get("/oauth/vk/start", oauthHandler.StartVKPublic)
			r.Get("/oauth/vk/callback", oauthHandler.VKCallback)
			r.Get("/oauth/max/start", oauthHandler.StartMAXPublic)
			r.Post("/oauth/max/webhook", oauthHandler.MAXWebhook)
			r.Get("/oauth/max/complete", oauthHandler.MAXComplete)
			r.Get("/oauth/max/status", oauthHandler.MAXStatus)
			r.With(authMW.Required).Get("/oauth/vk/link", oauthHandler.StartVKLink)
			r.With(authMW.Required).Get("/oauth/max/link", oauthHandler.StartMAXLink)
		})

		r.With(authMW.Required).Get("/user/login-identities", oauthHandler.ListIdentities)
		r.With(authMW.Required).Delete("/user/login-identities/{provider}", oauthHandler.Unlink)

		r.Get("/public/invites", inviteHandler.PublicSystemInvites)
		r.Get("/public/billing/plans", billingHandler.PublicListPlans)

		r.Route("/webhooks", func(r chi.Router) {
			r.Get("/robokassa/result", paymentWebhookHandler.RobokassaResult)
			r.Post("/robokassa/result", paymentWebhookHandler.RobokassaResult)
			r.Post("/robokassa/result2", paymentWebhookHandler.RobokassaResult2)
		})

		r.With(authMW.Required).Get("/user/invites", inviteHandler.UserInvites)

		r.Route("/billing", func(r chi.Router) {
			r.Use(authMW.Required)
			r.Get("/overview", billingHandler.Overview)
			r.Get("/plans", billingHandler.ListPlans)
			r.Get("/subscribe/preview", billingHandler.SubscribePreview)
			r.Post("/checkout/subscribe", billingHandler.SubscribeCheckout)
			r.Put("/subscription/auto-renew", billingHandler.SetAutoRenew)
			r.Post("/wallet/topup", billingHandler.WalletTopup)
			r.Post("/switch-free", billingHandler.SwitchFree)
			r.Get("/payments", billingHandler.PaymentHistory)
			r.Get("/wallet/ledger", billingHandler.WalletLedger)
		})

		r.Group(func(r chi.Router) {
			r.Use(authMW.Required)
			r.Get("/workspaces", wsHandler.List)
			r.Post("/workspaces", wsHandler.Create)
			r.Get("/workspaces/me", wsHandler.Me)
			r.Post("/workspaces/active", wsHandler.SetActive)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authMW.Required, middleware.RequirePlatformAdmin(userRepo))
				r.Get("/me", adminHandler.Me)
				r.Get("/users", adminHandler.ListUsers)
				r.Put("/users/{userID}/plan", adminHandler.AssignUserPlan)
				r.Put("/users/{userID}/blocked", adminHandler.SetUserBlocked)
				r.Delete("/users/{userID}", adminHandler.DeleteUser)

				r.Get("/plans", adminHandler.ListPlans)
				r.Post("/plans", adminHandler.CreatePlan)
				r.Get("/plans/{planID}", adminHandler.GetPlan)
				r.Put("/plans/{planID}", adminHandler.UpdatePlan)
				r.Delete("/plans/{planID}", adminHandler.DeletePlan)

				r.Get("/auth-settings", adminInviteHandler.AuthSettingsGet)
				r.Put("/auth-settings", adminInviteHandler.AuthSettingsPut)
				r.Get("/email-smtp", smtpHandler.GetAdmin)
				r.Put("/email-smtp", smtpHandler.UpdateAdmin)
				r.Post("/email-smtp/test", smtpHandler.SendTest)
				r.Get("/email-templates", emailTemplateHandler.GetAdmin)
				r.Put("/email-templates", emailTemplateHandler.UpdateAdmin)
				r.Get("/email-templates/preview", emailTemplateHandler.Preview)
				r.Post("/email-templates/test", emailTemplateHandler.SendTest)
				r.Get("/payment-settings", paymentSettingsHandler.GetAdmin)
				r.Put("/payment-settings", paymentSettingsHandler.UpdateAdmin)
				r.Post("/payment-settings/test", paymentSettingsHandler.TestConnection)
				r.Get("/invites", adminInviteHandler.List)
				r.Post("/invites/issue", adminInviteHandler.IssueSystem)
				r.Post("/invites/revoke", adminInviteHandler.Revoke)
				r.Get("/users/{userID}/invites", adminInviteHandler.UserInvites)
				r.Post("/users/{userID}/invites", adminInviteHandler.AddUserInvites)
				r.Get("/users/{userID}/invite-relations", adminInviteHandler.UserInviteRelations)
				r.Get("/users/{userID}/login-identities", adminHandler.ListUserLoginIdentities)
				r.Get("/users/{userID}/workspaces", adminHandler.ListUserWorkspaces)

				r.Get("/workspaces", adminHandler.ListWorkspaces)
				r.Delete("/workspaces", adminHandler.DeleteAllWorkspaces)
				r.Get("/workspaces/{workspaceID}", adminHandler.GetWorkspace)
				r.Delete("/workspaces/{workspaceID}", adminHandler.DeleteWorkspace)
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
