package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidWalletAmount = errors.New("invalid wallet amount")

const maxAdminGrantCents int64 = 10_000_000 // 100 000 ₽

type AdminWalletService struct {
	wallet *repository.WalletRepository
	users  *repository.UserRepository
	notify *NotificationService
}

func NewAdminWalletService(wallet *repository.WalletRepository, users *repository.UserRepository) *AdminWalletService {
	return &AdminWalletService{wallet: wallet, users: users}
}

func (s *AdminWalletService) SetNotifier(n *NotificationService) {
	s.notify = n
}

func (s *AdminWalletService) GrantCredit(ctx context.Context, actorID, targetUserID string, amountCents int64, note string) (int64, error) {
	if amountCents <= 0 || amountCents > maxAdminGrantCents {
		return 0, ErrInvalidWalletAmount
	}

	if _, err := s.users.GetByID(ctx, targetUserID); err != nil {
		return 0, err
	}

	actor, err := s.users.GetByID(ctx, actorID)
	if err != nil {
		return 0, err
	}

	desc := fmt.Sprintf("Начисление администратором (%s): +%d ₽", actor.Email, amountCents/100)
	if trimmed := strings.TrimSpace(note); trimmed != "" {
		desc += " — " + trimmed
	}

	balance, err := s.wallet.Credit(ctx, targetUserID, amountCents, "admin_grant", "admin_user", actorID, desc)
	if err != nil {
		return 0, err
	}
	if s.notify != nil {
		s.notify.NotifyWalletAdminGrant(ctx, targetUserID, amountCents)
	}
	return balance, nil
}
