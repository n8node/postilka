package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type WalletRepository struct {
	pool *pgxpool.Pool
}

func NewWalletRepository(pool *pgxpool.Pool) *WalletRepository {
	return &WalletRepository{pool: pool}
}

func (r *WalletRepository) GetBalance(ctx context.Context, userID string) (int64, error) {
	var balance int64
	err := r.pool.QueryRow(ctx, `
		SELECT wallet_balance_cents FROM users WHERE id = $1
	`, userID).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	return balance, err
}

func (r *WalletRepository) CreateTopup(ctx context.Context, userID, provider string, amountCents int) (*model.WalletTopup, error) {
	const q = `
		INSERT INTO wallet_topups (user_id, provider, amount_cents, status)
		VALUES ($1, $2, $3, 'pending')
		RETURNING id, user_id, provider, amount_cents, status, external_id, inv_id, created_at, paid_at
	`
	return r.scanTopup(r.pool.QueryRow(ctx, q, userID, provider, amountCents))
}

func (r *WalletRepository) NextInvID(ctx context.Context) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `SELECT nextval('billing_inv_id_seq')`).Scan(&id)
	return id, err
}

func (r *WalletRepository) SetTopupExternal(ctx context.Context, id, externalID string, invID *int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE wallet_topups SET external_id = $2, inv_id = $3 WHERE id = $1
	`, id, externalID, invID)
	return err
}

func (r *WalletRepository) GetTopupByID(ctx context.Context, id string) (*model.WalletTopup, error) {
	const q = `
		SELECT id, user_id, provider, amount_cents, status, external_id, inv_id, created_at, paid_at
		FROM wallet_topups WHERE id = $1
	`
	t, err := r.scanTopup(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *WalletRepository) GetTopupByInvID(ctx context.Context, invID int64) (*model.WalletTopup, error) {
	const q = `
		SELECT id, user_id, provider, amount_cents, status, external_id, inv_id, created_at, paid_at
		FROM wallet_topups WHERE inv_id = $1
	`
	t, err := r.scanTopup(r.pool.QueryRow(ctx, q, invID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *WalletRepository) MarkTopupPaid(ctx context.Context, id string) (*model.WalletTopup, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const markQ = `
		UPDATE wallet_topups
		SET status = 'paid', paid_at = NOW()
		WHERE id = $1 AND status = 'pending'
		RETURNING id, user_id, provider, amount_cents, status, external_id, inv_id, created_at, paid_at
	`
	topup, err := r.scanTopup(tx.QueryRow(ctx, markQ, id))
	if errors.Is(err, pgx.ErrNoRows) {
		existing, getErr := r.GetTopupByID(ctx, id)
		if getErr != nil {
			return nil, getErr
		}
		if existing.Status == model.CheckoutStatusPaid {
			return existing, nil
		}
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	const creditQ = `
		UPDATE users
		SET wallet_balance_cents = wallet_balance_cents + $2, updated_at = NOW()
		WHERE id = $1
		RETURNING wallet_balance_cents
	`
	var newBalance int64
	if err := tx.QueryRow(ctx, creditQ, topup.UserID, topup.AmountCents).Scan(&newBalance); err != nil {
		return nil, err
	}

	refType := "wallet_topup"
	const ledgerQ = `
		INSERT INTO wallet_ledger (user_id, amount_cents, entry_type, reference_type, reference_id, description)
		VALUES ($1, $2, 'topup', $3, $4, $5)
	`
	desc := fmt.Sprintf("Пополнение кошелька +%d ₽", topup.AmountCents/100)
	if _, err := tx.Exec(ctx, ledgerQ, topup.UserID, topup.AmountCents, refType, topup.ID, desc); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return topup, nil
}

func (r *WalletRepository) Credit(ctx context.Context, userID string, amountCents int64, entryType, refType, refID, description string) (int64, error) {
	if amountCents <= 0 {
		return 0, fmt.Errorf("credit amount must be positive")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	const creditQ = `
		UPDATE users
		SET wallet_balance_cents = wallet_balance_cents + $2, updated_at = NOW()
		WHERE id = $1
		RETURNING wallet_balance_cents
	`
	var newBalance int64
	if err := tx.QueryRow(ctx, creditQ, userID, amountCents).Scan(&newBalance); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO wallet_ledger (user_id, amount_cents, entry_type, reference_type, reference_id, description)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, '')::uuid, $6)
	`, userID, amountCents, entryType, refType, refID, description); err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return newBalance, nil
}

func (r *WalletRepository) Debit(ctx context.Context, userID string, amountCents int64, entryType, refType, refID, description string) error {
	if amountCents <= 0 {
		return fmt.Errorf("debit amount must be positive")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var balance int64
	if err := tx.QueryRow(ctx, `
		SELECT wallet_balance_cents FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&balance); err != nil {
		return err
	}
	if balance < amountCents {
		return ErrInsufficientWallet
	}

	if _, err := tx.Exec(ctx, `
		UPDATE users SET wallet_balance_cents = wallet_balance_cents - $2, updated_at = NOW()
		WHERE id = $1
	`, userID, amountCents); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO wallet_ledger (user_id, amount_cents, entry_type, reference_type, reference_id, description)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, '')::uuid, $6)
	`, userID, -amountCents, entryType, refType, refID, description); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *WalletRepository) ListLedger(ctx context.Context, userID string, limit int) ([]model.WalletLedgerEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, amount_cents, entry_type, reference_type, reference_id, description, created_at
		FROM wallet_ledger
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WalletLedgerEntry, 0)
	for rows.Next() {
		var e model.WalletLedgerEntry
		if err := rows.Scan(
			&e.ID, &e.UserID, &e.AmountCents, &e.EntryType,
			&e.ReferenceType, &e.ReferenceID, &e.Description, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *WalletRepository) ListTopups(ctx context.Context, userID string, limit int) ([]model.WalletTopup, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, provider, amount_cents, status, external_id, inv_id, created_at, paid_at
		FROM wallet_topups
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WalletTopup, 0)
	for rows.Next() {
		t, err := r.scanTopup(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *WalletRepository) scanTopup(row pgx.Row) (*model.WalletTopup, error) {
	var t model.WalletTopup
	err := row.Scan(
		&t.ID, &t.UserID, &t.Provider, &t.AmountCents, &t.Status,
		&t.ExternalID, &t.InvID, &t.CreatedAt, &t.PaidAt,
	)
	return &t, err
}

var ErrInsufficientWallet = errors.New("insufficient wallet balance")
