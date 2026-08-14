package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	notificationDedupHours = 24
	walletLowThresholdCents  = int64(10000)
)

type NotificationInput struct {
	UserID      string
	WorkspaceID *string
	Type        model.NotificationType
	Category    model.NotificationCategory
	Title       string
	Body        string
	Payload     map[string]any
	Href        string
}

type NotificationService struct {
	repo     *repository.NotificationRepository
	ws       *repository.WorkspaceRepository
	quota    *QuotaService
	plans    *repository.PlanRepository
	channels *repository.ChannelRepository
	subs     *repository.SubscriptionRepository
	files    *repository.WorkspaceFileRepository
	folders  *repository.WorkspaceFolderRepository
	wallet   *repository.WalletRepository
	log      *slog.Logger
}

func NewNotificationService(
	repo *repository.NotificationRepository,
	ws *repository.WorkspaceRepository,
	quota *QuotaService,
	plans *repository.PlanRepository,
	channels *repository.ChannelRepository,
	subs *repository.SubscriptionRepository,
	files *repository.WorkspaceFileRepository,
	folders *repository.WorkspaceFolderRepository,
	wallet *repository.WalletRepository,
	logger *slog.Logger,
) *NotificationService {
	return &NotificationService{
		repo: repo, ws: ws, quota: quota, plans: plans, channels: channels,
		subs: subs, files: files, folders: folders, wallet: wallet, log: logger,
	}
}

func (s *NotificationService) List(
	ctx context.Context,
	userID string,
	filter repository.NotificationListFilter,
) (*model.NotificationList, error) {
	items, total, err := s.repo.List(ctx, userID, filter)
	if err != nil {
		return nil, err
	}
	unread, err := s.repo.CountUnread(ctx, userID, filter.WorkspaceID)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []model.Notification{}
	}
	return &model.NotificationList{Items: items, Total: total, UnreadCount: unread}, nil
}

func (s *NotificationService) MarkRead(ctx context.Context, userID, id string) error {
	n, err := s.repo.MarkRead(ctx, userID, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func (s *NotificationService) MarkAllRead(ctx context.Context, userID, workspaceID string) (int64, error) {
	return s.repo.MarkAllRead(ctx, userID, workspaceID)
}

func (s *NotificationService) DeleteAll(ctx context.Context, userID, workspaceID string) (int64, error) {
	return s.repo.DeleteAll(ctx, userID, workspaceID)
}

func (s *NotificationService) GetPrefs(ctx context.Context, userID string) (model.NotificationPreferences, error) {
	return s.repo.GetPrefs(ctx, userID)
}

func (s *NotificationService) UpdatePrefs(ctx context.Context, userID string, prefs model.NotificationPreferences) (model.NotificationPreferences, error) {
	return s.repo.UpdatePrefs(ctx, userID, prefs)
}

func (s *NotificationService) Create(ctx context.Context, in NotificationInput) {
	if s == nil || strings.TrimSpace(in.UserID) == "" || strings.TrimSpace(in.Title) == "" {
		return
	}
	prefs, err := s.repo.GetPrefs(ctx, in.UserID)
	if err != nil {
		s.warn("notification prefs", err)
		prefs = model.DefaultNotificationPreferences()
	}
	if !prefs.Enabled(model.NotificationPrefKeyForType(in.Type)) {
		return
	}
	category := in.Category
	if category == "" {
		category = model.NotificationInfo
	}
	_, err = s.repo.Create(ctx, &model.Notification{
		UserID:      in.UserID,
		WorkspaceID: in.WorkspaceID,
		Type:        in.Type,
		Category:    category,
		Title:       in.Title,
		Body:        in.Body,
		Payload:     in.Payload,
		Href:        in.Href,
	})
	if err != nil {
		s.warn("create notification", err)
	}
}

func (s *NotificationService) CreateForUsers(ctx context.Context, userIDs []string, in NotificationInput) {
	seen := map[string]struct{}{}
	for _, id := range userIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		in.UserID = id
		s.Create(ctx, in)
	}
}

func (s *NotificationService) CreateForWorkspace(ctx context.Context, workspaceID string, roles []string, in NotificationInput) {
	if s == nil || workspaceID == "" {
		return
	}
	wsID := workspaceID
	in.WorkspaceID = &wsID
	ids, err := s.ws.ListMemberUserIDs(ctx, workspaceID, roles)
	if err != nil {
		s.warn("list workspace members", err)
		return
	}
	s.CreateForUsers(ctx, ids, in)
}

func (s *NotificationService) CreateDeduped(
	ctx context.Context,
	in NotificationInput,
	payloadKey, payloadVal string,
	within time.Duration,
) {
	if s == nil || in.UserID == "" {
		return
	}
	if within <= 0 {
		within = notificationDedupHours * time.Hour
	}
	recent, err := s.repo.HasRecent(ctx, in.UserID, in.Type, payloadKey, payloadVal, time.Now().Add(-within))
	if err != nil {
		s.warn("notification dedup", err)
		return
	}
	if recent {
		return
	}
	s.Create(ctx, in)
}

func (s *NotificationService) CreateForWorkspaceDeduped(
	ctx context.Context,
	workspaceID string,
	roles []string,
	in NotificationInput,
	payloadKey, payloadVal string,
	within time.Duration,
) {
	if s == nil || workspaceID == "" {
		return
	}
	wsID := workspaceID
	in.WorkspaceID = &wsID
	ids, err := s.ws.ListMemberUserIDs(ctx, workspaceID, roles)
	if err != nil {
		s.warn("list workspace members", err)
		return
	}
	for _, id := range ids {
		copyIn := in
		copyIn.UserID = id
		s.CreateDeduped(ctx, copyIn, payloadKey, payloadVal, within)
	}
}

func editorRoles() []string {
	return []string{string(model.RoleOwner), string(model.RoleAdmin), string(model.RoleEditor)}
}

func adminRoles() []string {
	return []string{string(model.RoleOwner), string(model.RoleAdmin)}
}

func ptrString(s string) *string {
	if s == "" {
		return nil
	}
	v := s
	return &v
}

func (s *NotificationService) warn(msg string, err error) {
	if s.log != nil {
		s.log.Warn(msg, "error", err)
	}
}
