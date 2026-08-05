package service

import (
	"context"
	"crypto/rand"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	InviteCodePrefix           = "Postilka_"
	InviteRandomLength         = 12
	DefaultInvitesOnRegister   = 3
	SettingInviteRegistration  = "auth.invite_registration_enabled"
)

var (
	ErrInvalidInviteCode   = errors.New("invalid invite code")
	ErrInviteNotActive     = errors.New("invite not active")
	ErrInviteAlreadyUsed   = errors.New("invite already consumed")
	ErrInviteRequired      = errors.New("invite required")
)

var inviteCodeRegex = regexp.MustCompile(`^Postilka_[A-Z0-9]{8,64}$`)
var inviteAlphabet = []byte("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

type InviteService struct {
	invites  *repository.InviteRepository
	settings *repository.SettingsRepository
	users    *repository.UserRepository
	pool     pgxPoolBeginner
}

type pgxPoolBeginner interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

func NewInviteService(
	invites *repository.InviteRepository,
	settings *repository.SettingsRepository,
	users *repository.UserRepository,
	pool pgxPoolBeginner,
) *InviteService {
	return &InviteService{invites: invites, settings: settings, users: users, pool: pool}
}

func NormalizeInviteCode(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	lowerPrefix := strings.ToLower(InviteCodePrefix)
	if strings.HasPrefix(strings.ToLower(value), lowerPrefix) {
		suffix := strings.ToUpper(value[len(InviteCodePrefix):])
		return InviteCodePrefix + suffix
	}
	return value
}

func IsInviteCodeFormatValid(code string) bool {
	return inviteCodeRegex.MatchString(code)
}

func (s *InviteService) IsRegistrationEnabled(ctx context.Context) (bool, error) {
	return s.settings.IsInviteRegistrationEnabled(ctx)
}

func (s *InviteService) SetRegistrationEnabled(ctx context.Context, enabled bool) error {
	return s.settings.SetInviteRegistrationEnabled(ctx, enabled)
}

func (s *InviteService) VerifyInvite(ctx context.Context, rawCode string) (string, error) {
	enabled, err := s.IsRegistrationEnabled(ctx)
	if err != nil {
		return "", err
	}
	if !enabled {
		return "", nil
	}

	code := NormalizeInviteCode(rawCode)
	if !IsInviteCodeFormatValid(code) {
		return "", ErrInvalidInviteCode
	}

	invite, err := s.invites.FindActiveByCode(ctx, code)
	if errors.Is(err, repository.ErrNotFound) {
		return "", ErrInviteNotActive
	}
	if err != nil {
		return "", err
	}
	_ = invite
	return code, nil
}

func (s *InviteService) GenerateInviteCode() (string, error) {
	bytes := make([]byte, InviteRandomLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	var b strings.Builder
	b.WriteString(InviteCodePrefix)
	for i := 0; i < InviteRandomLength; i++ {
		b.WriteByte(inviteAlphabet[int(bytes[i])%len(inviteAlphabet)])
	}
	return b.String(), nil
}

func (s *InviteService) generateUniqueCodes(count int) ([]string, error) {
	codes := make([]string, 0, count)
	for len(codes) < count {
		code, err := s.GenerateInviteCode()
		if err != nil {
			return nil, err
		}
		codes = append(codes, code)
	}
	return codes, nil
}

func (s *InviteService) IssueSystemInvites(ctx context.Context, count int, createdByUserID string) ([]model.RegistrationInvite, error) {
	if count < 1 || count > 200 {
		return nil, ErrInvalidInput
	}
	codes, err := s.generateUniqueCodes(count)
	if err != nil {
		return nil, err
	}
	var createdBy *string
	if createdByUserID != "" {
		createdBy = &createdByUserID
	}
	return s.invites.CreateBatch(ctx, model.InviteScopeSystem, count, nil, createdBy, codes)
}

func (s *InviteService) IssueUserInvites(ctx context.Context, ownerUserID string, count int, createdByUserID string) ([]model.RegistrationInvite, error) {
	if count < 1 || count > 100 {
		return nil, ErrInvalidInput
	}
	if _, err := s.users.GetByID(ctx, ownerUserID); err != nil {
		return nil, err
	}
	codes, err := s.generateUniqueCodes(count)
	if err != nil {
		return nil, err
	}
	owner := ownerUserID
	var createdBy *string
	if createdByUserID != "" {
		createdBy = &createdByUserID
	}
	return s.invites.CreateBatch(ctx, model.InviteScopeUser, count, &owner, createdBy, codes)
}

func (s *InviteService) ConsumeInviteTx(ctx context.Context, tx pgx.Tx, rawCode, usedByUserID string) (string, error) {
	code := NormalizeInviteCode(rawCode)
	if !IsInviteCodeFormatValid(code) {
		return "", ErrInvalidInviteCode
	}

	invite, err := s.invites.FindActiveByCodeTx(ctx, tx, code)
	if errors.Is(err, repository.ErrNotFound) {
		return "", ErrInviteNotActive
	}
	if err != nil {
		return "", err
	}

	if err := s.invites.ConsumeActiveTx(ctx, tx, invite.ID, usedByUserID); err != nil {
		if errors.Is(err, repository.ErrInviteAlreadyConsumed) {
			return "", ErrInviteAlreadyUsed
		}
		return "", err
	}
	return invite.ID, nil
}

func (s *InviteService) GrantRegistrationInvitesTx(ctx context.Context, tx pgx.Tx, ownerUserID string) error {
	codes, err := s.generateUniqueCodes(DefaultInvitesOnRegister)
	if err != nil {
		return err
	}
	owner := ownerUserID
	_, err = s.invites.CreateBatchTx(ctx, tx, model.InviteScopeUser, DefaultInvitesOnRegister, &owner, &owner, codes)
	return err
}

func (s *InviteService) RevokeInvite(ctx context.Context, inviteID string) error {
	return s.invites.Revoke(ctx, inviteID)
}

func (s *InviteService) ListForAdmin(ctx context.Context, f repository.ListInvitesFilter) ([]model.AdminInviteListItem, int, error) {
	return s.invites.ListForAdmin(ctx, f)
}

func (s *InviteService) ListRelations(ctx context.Context) ([]model.InviteRelation, error) {
	return s.invites.ListRelations(ctx, 500)
}

func (s *InviteService) ListForUser(ctx context.Context, userID string) ([]model.UserInviteItem, error) {
	return s.invites.ListByOwner(ctx, userID)
}

func (s *InviteService) GetUserRelations(ctx context.Context, userID string) (*model.UserInviteRelations, error) {
	return s.invites.GetInviteRelationsForUser(ctx, userID)
}

func (s *InviteService) AdminStats(ctx context.Context) (map[string]int, error) {
	total, active, used, err := s.invites.CountStats(ctx)
	if err != nil {
		return nil, err
	}
	relations, err := s.invites.ListRelations(ctx, 500)
	if err != nil {
		return nil, err
	}
	inviters := map[string]struct{}{}
	for _, rel := range relations {
		if rel.Inviter != nil {
			inviters[rel.Inviter.ID] = struct{}{}
		}
	}
	return map[string]int{
		"total":           total,
		"active":          active,
		"used":            used,
		"total_relations": len(relations),
		"unique_inviters": len(inviters),
	}, nil
}

func (s *InviteService) ListPublicSystem(ctx context.Context) ([]model.PublicInviteItem, error) {
	invites, err := s.invites.ListPublicSystem(ctx, 200)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	out := make([]model.PublicInviteItem, 0, len(invites))
	for _, inv := range invites {
		status := model.EffectiveInviteStatus(inv.Status, inv.ExpiresAt, now)
		out = append(out, model.PublicInviteItem{
			ID:       inv.ID,
			Code:     inv.Code,
			Status:   status,
			IsActive: status == model.InviteStatusActive,
		})
	}
	return out, nil
}
