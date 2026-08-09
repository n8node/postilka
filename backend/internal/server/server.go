package server

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

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
	authLimiter := middleware.NewRateLimiter()

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
	publicPageRepo := repository.NewPublicPageRepository(db.Pool)
	publicPageSvc := service.NewPublicPageService(publicPageRepo)
	adminUserSvc := service.NewAdminUserService(userRepo)
	adminWorkspaceSvc := service.NewAdminWorkspaceService(wsRepo, userRepo)
	smtpSettingsRepo := repository.NewSMTPSettingsRepository(db.Pool)
	smtpSettingsSvc := service.NewSMTPSettingsService(smtpSettingsRepo)
	mailSvc := service.NewMailService(smtpSettingsSvc)
	emailTemplateSettingsRepo := repository.NewEmailTemplateSettingsRepository(db.Pool)
	emailTemplateSettingsSvc := service.NewEmailTemplateSettingsService(emailTemplateSettingsRepo)
	emailRenderer := service.NewEmailRenderer()
	emailSvc := service.NewEmailService(mailSvc, emailTemplateSettingsSvc, emailRenderer)
	txEmailSvc := service.NewTransactionalEmailService(emailSvc, userRepo, planRepo, wsRepo, cfg, logger)
	emailVerificationRepo := repository.NewEmailVerificationRepository(db.Pool)
	emailVerificationSvc := service.NewEmailVerificationService(emailVerificationRepo, userRepo, emailSvc, cfg, logger)
	passwordResetRepo := repository.NewPasswordResetRepository(db.Pool)
	passwordResetSvc := service.NewPasswordResetService(passwordResetRepo, userRepo, emailSvc, cfg, logger)

	paymentSettingsRepo := repository.NewPaymentSettingsRepository(db.Pool)
	paymentSettingsSvc := service.NewPaymentSettingsService(paymentSettingsRepo, cfg)
	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	uploadFileSettingsRepo := repository.NewUploadFileSettingsRepository(db.Pool)
	uploadFileSettingsSvc := service.NewUploadFileSettingsService(uploadFileSettingsRepo)
	planCheckoutRepo := repository.NewPlanCheckoutRepository(db.Pool)
	walletRepo := repository.NewWalletRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	subscriptionSvc := service.NewSubscriptionService(subscriptionRepo, planRepo, wsRepo)
	channelRepo := repository.NewChannelRepository(db.Pool)
	quotaSvc := service.NewQuotaService(planRepo, wsRepo, subscriptionRepo, usageRepo, channelRepo)
	telegramSettingsRepo := repository.NewTelegramSettingsRepository(db.Pool)
	telegramQueueRepo := repository.NewTelegramNotificationQueueRepository(db.Pool)
	telegramSettingsSvc := service.NewTelegramSettingsService(telegramSettingsRepo)
	telegramProviderSettingsRepo := repository.NewTelegramProviderSettingsRepository(db.Pool)
	telegramProviderSettingsSvc := service.NewTelegramProviderSettingsService(telegramProviderSettingsRepo)
	youtubeProviderSettingsRepo := repository.NewYouTubeProviderSettingsRepository(db.Pool)
	youtubeProviderSettingsSvc := service.NewYouTubeProviderSettingsService(youtubeProviderSettingsRepo)
	socialProviderSettingsRepo := repository.NewSocialProviderSettingsRepository(db.Pool)
	socialProviderSettingsSvc := service.NewSocialProviderSettingsService(socialProviderSettingsRepo)
	channelOAuthSessionRepo := repository.NewChannelOAuthSessionRepository(db.Pool)
	telegramBotClient := service.NewTelegramBotClient(telegramProviderSettingsSvc, cfg.TelegramLocalProxy)
	youtubeAPIClient := service.NewYouTubeAPIClient(youtubeProviderSettingsSvc, cfg.YouTubeLocalProxy)
	service.SetYouTubeAPIClient(youtubeAPIClient)
	encKey := cfg.EncryptionKey
	if strings.TrimSpace(encKey) == "" {
		encKey = cfg.JWTSecret
	}
	secretCipher, _ := service.NewSecretCipher(encKey)
	channelSvc := service.NewChannelService(channelRepo, telegramProviderSettingsSvc, socialProviderSettingsSvc, telegramBotClient, wsSvc, quotaSvc, secretCipher)
	channelConnectSvc := service.NewChannelConnectService(
		channelRepo, channelOAuthSessionRepo, socialProviderSettingsSvc,
		telegramProviderSettingsSvc, youtubeAPIClient, wsSvc, quotaSvc, secretCipher, cfg,
	)
	channelTestSvc := service.NewChannelTestService(
		channelRepo, telegramBotClient, youtubeAPIClient, socialProviderSettingsSvc, wsSvc, secretCipher,
	)
	telegramSvc := service.NewTelegramService(telegramSettingsSvc, telegramQueueRepo, cfg.TelegramLocalProxy, logger)
	telegramSettingsSvc.BindRuntimeStatus(telegramSvc.GetRuntimeStatus)
	telegramSvc.Start()
	telegramHealthMonitor := service.NewTelegramHealthMonitor(telegramSvc, emailSvc, userRepo, cfg, logger)
	telegramHealthMonitor.Start()

	authSvc := service.NewAuthService(userRepo, wsRepo, planRepo, inviteSvc, db.Pool, authMW, emailVerificationSvc, passwordResetSvc, telegramSvc)
	emailVerificationSvc.BindTelegram(telegramSvc)

	checkoutSvc := service.NewCheckoutService(planCheckoutRepo, walletRepo, planRepo, wsRepo, userRepo, paymentSettingsSvc, subscriptionSvc, wsSvc, txEmailSvc, telegramSvc, cfg)
	billingSvc := service.NewBillingService(planRepo, wsRepo, walletRepo, planCheckoutRepo, paymentSettingsSvc, quotaSvc, subscriptionSvc, wsSvc)

	wsInviteRepo := repository.NewWorkspaceInviteRepository(db.Pool)
	wsInviteSvc := service.NewWorkspaceInviteService(wsInviteRepo, wsRepo, userRepo, wsSvc, txEmailSvc, cfg, logger)

	health := handler.NewHealthHandler(cfg, db)
	status := handler.NewStatusHandler(cfg)
	authHandler := handler.NewAuthHandler(authSvc, wsSvc, authMW, cfg)
	userHandler := handler.NewUserHandler(authSvc)
	wsInviteHandler := handler.NewWorkspaceInviteHandler(wsInviteSvc, wsSvc)
	oauthHandler := handler.NewOAuthLoginHandler(oauthSvc, wsSvc, authMW, cfg, logger)
	wsHandler := handler.NewWorkspaceHandler(wsSvc, cfg)
	fileStorageRepo := repository.NewWorkspaceFileRepository(db.Pool)
	folderStorageRepo := repository.NewWorkspaceFolderRepository(db.Pool)
	adminHandler := handler.NewAdminHandler(userRepo, adminUserSvc, planSvc, oauthSvc, adminWorkspaceSvc, fileStorageRepo, folderStorageRepo)
	inviteHandler := handler.NewInviteHandler(inviteSvc, oauthSvc)
	adminInviteHandler := handler.NewAdminInviteHandler(inviteSvc, userRepo, oauthSvc)
	smtpHandler := handler.NewSMTPSettingsHandler(smtpSettingsSvc, emailSvc)
	emailTemplateHandler := handler.NewEmailTemplateSettingsHandler(emailTemplateSettingsSvc, emailSvc)
	paymentSettingsHandler := handler.NewPaymentSettingsHandler(paymentSettingsSvc)
	storageSettingsHandler := handler.NewStorageSettingsHandler(storageSettingsSvc)
	uploadFileSettingsHandler := handler.NewUploadFileSettingsHandler(uploadFileSettingsSvc)
	telegramHandler := handler.NewTelegramSettingsHandler(telegramSettingsSvc, telegramSvc)
	telegramProviderHandler := handler.NewTelegramProviderSettingsHandler(telegramProviderSettingsSvc)
	youtubeProviderHandler := handler.NewYouTubeProviderSettingsHandler(youtubeProviderSettingsSvc)
	socialProviderHandler := handler.NewSocialProviderSettingsHandler(socialProviderSettingsSvc)
	maxPlatformBotHandler := handler.NewMAXPlatformBotHandler(socialProviderSettingsSvc, secretCipher)
	channelHandler := handler.NewChannelHandler(channelSvc, channelConnectSvc, channelTestSvc)
	channelConnectHandler := handler.NewChannelConnectHandler(channelConnectSvc, cfg)
	publicPageHandler := handler.NewPublicPageHandler(publicPageSvc)
	paymentWebhookHandler := handler.NewPaymentWebhookHandler(paymentSettingsSvc, checkoutSvc, logger)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)
	uploadSessions := service.NewUploadSessionService(cfg.JWTSecret)
	fileStorageSvc := service.NewFileStorageService(
		fileStorageRepo, folderStorageRepo, wsRepo, planRepo, wsSvc, objectStorage, uploadSessions, uploadFileSettingsSvc,
	)
	billingHandler := handler.NewBillingHandler(billingSvc, checkoutSvc, wsSvc)
	fileStorageHandler := handler.NewFileStorageHandler(fileStorageSvc)

	r.Get("/health", health.ServeHTTP)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health.ServeHTTP)
		r.Get("/status", status.ServeHTTP)

		r.Route("/auth", func(r chi.Router) {
			r.Get("/methods", inviteHandler.AuthMethods)
			r.Post("/invite/verify", inviteHandler.VerifyInvite)
			r.With(middleware.RateLimit(authLimiter, 5, time.Minute)).Post("/register", authHandler.Register)
			r.With(middleware.RateLimit(authLimiter, 10, time.Minute)).Post("/verify-email", authHandler.VerifyEmail)
			r.With(middleware.RateLimit(authLimiter, 3, time.Minute)).Post("/forgot-password", authHandler.ForgotPassword)
			r.With(middleware.RateLimit(authLimiter, 5, time.Minute)).Post("/reset-password", authHandler.ResetPassword)
			r.With(middleware.RateLimit(authLimiter, 10, time.Minute)).Post("/login", authHandler.Login)
			r.With(middleware.RateLimit(authLimiter, 3, time.Minute)).Post("/resend-verification", authHandler.ResendVerification)
			r.Post("/logout", authHandler.Logout)
			r.With(authMW.Required).Get("/me", authHandler.Me)
			r.With(authMW.Required, middleware.RateLimit(authLimiter, 3, time.Minute)).Post("/resend-verification/me", authHandler.ResendVerificationMe)

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
		r.With(authMW.Required).Patch("/user/email", userHandler.ChangeEmail)

		r.Get("/public/invites", inviteHandler.PublicSystemInvites)
		r.Get("/public/billing/plans", billingHandler.PublicListPlans)
		r.Get("/public/workspace-invites/preview", wsInviteHandler.Preview)

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
			r.Get("/workspaces/invites", wsInviteHandler.List)
			r.Post("/workspaces/invites", wsInviteHandler.Create)
			r.Post("/workspaces/invites/accept", wsInviteHandler.Accept)
			r.Patch("/workspaces/{workspaceID}", wsHandler.Update)
			r.Delete("/workspaces/{workspaceID}", wsHandler.Delete)
		})

		r.Group(func(r chi.Router) {
			r.Use(authMW.Required)
			r.Get("/channels", channelHandler.List)
			r.Get("/channels/provider-info", channelHandler.ProviderInfo)
			r.Post("/channels/telegram/discover", channelHandler.DiscoverTelegram)
			r.Post("/channels/telegram/connect", channelHandler.ConnectTelegram)
			r.Post("/channels/max/discover", channelConnectHandler.DiscoverMAX)
			r.Post("/channels/max/connect", channelConnectHandler.ConnectMAX)
			r.Get("/channels/oauth/{provider}/start", channelConnectHandler.OAuthStart)
			r.Post("/channels/oauth/{provider}/start", channelConnectHandler.OAuthStart)
			r.Get("/channels/oauth/{provider}/discover", channelConnectHandler.OAuthDiscover)
			r.Post("/channels/oauth/{provider}/connect", channelConnectHandler.OAuthConnect)
			r.Get("/channels/{id}", channelHandler.Get)
			r.Get("/channels/{id}/avatar", channelHandler.Avatar)
			r.Patch("/channels/{id}", channelHandler.Update)
			r.Post("/channels/{id}/verify", channelHandler.Verify)
			r.Post("/channels/{id}/oauth/youtube/reconnect/start", channelHandler.YouTubeReconnectStart)
			r.Post("/channels/{id}/test-message", channelHandler.SendTestMessage)
			r.Put("/channels/{id}/telegram-token", channelHandler.UpdateTelegramToken)
			r.Delete("/channels/{id}", channelHandler.Delete)
		})

		r.Get("/channels/oauth/{provider}/callback", channelConnectHandler.OAuthCallback)

		r.Group(func(r chi.Router) {
			r.Use(authMW.Required)
			r.Get("/storage", fileStorageHandler.GetStorage)
			r.Get("/storage/limits", fileStorageHandler.GetUploadLimits)
			r.Post("/files/upload/init", fileStorageHandler.UploadInit)
			r.Post("/files/upload/complete", fileStorageHandler.UploadComplete)
			r.Get("/files", fileStorageHandler.ListFiles)
			r.Post("/files/bulk", fileStorageHandler.BulkFiles)
			r.Route("/files/{id}", func(r chi.Router) {
				r.Patch("/", fileStorageHandler.PatchFile)
				r.Delete("/", fileStorageHandler.DeleteFile)
				r.Get("/download", fileStorageHandler.DownloadFile)
				r.Post("/copy", fileStorageHandler.CopyFile)
				r.Post("/transfer", fileStorageHandler.TransferFile)
			})
			r.Get("/folders", fileStorageHandler.ListFolders)
			r.Post("/folders", fileStorageHandler.CreateFolder)
			r.Post("/folders/bulk", fileStorageHandler.BulkFolders)
			r.Route("/folders/{id}", func(r chi.Router) {
				r.Patch("/", fileStorageHandler.PatchFolder)
				r.Delete("/", fileStorageHandler.DeleteFolder)
				r.Get("/breadcrumbs", fileStorageHandler.Breadcrumbs)
			})
			r.Get("/trash", fileStorageHandler.ListTrash)
			r.Post("/trash/restore", fileStorageHandler.RestoreTrash)
			r.Post("/trash/empty", fileStorageHandler.EmptyTrash)
			r.Delete("/trash/{id}", fileStorageHandler.PermanentDeleteTrashItem)
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

				r.Get("/public-pages", publicPageHandler.ListAdmin)
				r.Post("/public-pages", publicPageHandler.CreateAdmin)
				r.Get("/public-pages/{pageID}", publicPageHandler.GetAdmin)
				r.Put("/public-pages/{pageID}", publicPageHandler.UpdateAdmin)
				r.Delete("/public-pages/{pageID}", publicPageHandler.DeleteAdmin)

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
				r.Get("/storage-settings", storageSettingsHandler.GetAdmin)
				r.Put("/storage-settings", storageSettingsHandler.UpdateAdmin)
				r.Post("/storage-settings/test", storageSettingsHandler.TestConnection)
				r.Get("/settings/upload-files", uploadFileSettingsHandler.GetAdmin)
				r.Put("/settings/upload-files", uploadFileSettingsHandler.UpdateAdmin)
				r.Get("/telegram", telegramHandler.GetAdmin)
				r.Put("/telegram", telegramHandler.UpdateAdmin)
				r.Get("/telegram/notifications", telegramHandler.GetAdmin)
				r.Put("/telegram/notifications", telegramHandler.UpdateAdmin)
				r.Get("/telegram/provider", telegramProviderHandler.GetAdmin)
				r.Put("/telegram/provider", telegramProviderHandler.UpdateAdmin)
				r.Get("/youtube/provider", youtubeProviderHandler.GetAdmin)
				r.Put("/youtube/provider", youtubeProviderHandler.UpdateAdmin)
				r.Get("/social-providers", socialProviderHandler.ListAdmin)
				r.Get("/social-providers/{provider}", socialProviderHandler.GetAdmin)
				r.Put("/social-providers/{provider}", socialProviderHandler.UpdateAdmin)
				r.Get("/max-platform-bot", maxPlatformBotHandler.GetAdmin)
				r.Put("/max-platform-bot", maxPlatformBotHandler.UpdateAdmin)
				r.Get("/telegram/status", telegramHandler.GetStatus)
				r.Post("/telegram/restart", telegramHandler.Restart)
				r.Post("/telegram/test", telegramHandler.SendTest)
				r.Get("/telegram/queue", telegramHandler.ListQueue)
				r.Post("/telegram/queue/{id}/retry", telegramHandler.RetryQueueItem)
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

				r.Get("/files", adminHandler.ListFiles)
				r.Get("/files/folders", adminHandler.ListFileFolders)
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
