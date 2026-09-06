package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type TokenPackageRepository struct {
	pool *pgxpool.Pool
}

func NewTokenPackageRepository(pool *pgxpool.Pool) *TokenPackageRepository {
	return &TokenPackageRepository{pool: pool}
}

const tokenPackageColumns = `id, name, tokens, price_cents, sort_order, is_active, created_at, updated_at`

func (r *TokenPackageRepository) ListActive(ctx context.Context) ([]model.TokenPackage, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+tokenPackageColumns+`
		FROM token_packages
		WHERE is_active = true
		ORDER BY sort_order ASC, created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTokenPackages(rows)
}

func (r *TokenPackageRepository) ListAll(ctx context.Context) ([]model.TokenPackage, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+tokenPackageColumns+`
		FROM token_packages
		ORDER BY sort_order ASC, created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTokenPackages(rows)
}

func (r *TokenPackageRepository) GetByID(ctx context.Context, id string) (*model.TokenPackage, error) {
	id = normalizeTokenPackageID(id)
	const q = `SELECT ` + tokenPackageColumns + ` FROM token_packages WHERE id = $1`
	pkg, err := scanTokenPackage(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return pkg, err
}

func (r *TokenPackageRepository) Create(ctx context.Context, input model.TokenPackageUpsert) (*model.TokenPackage, error) {
	const q = `
		INSERT INTO token_packages (id, name, tokens, price_cents, sort_order, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + tokenPackageColumns
	return scanTokenPackage(r.pool.QueryRow(ctx, q,
		normalizeTokenPackageID(input.ID),
		strings.TrimSpace(input.Name),
		input.Tokens,
		input.PriceCents,
		input.SortOrder,
		input.IsActive,
	))
}

func (r *TokenPackageRepository) Update(ctx context.Context, id string, input model.TokenPackageUpsert) (*model.TokenPackage, error) {
	id = normalizeTokenPackageID(id)
	const q = `
		UPDATE token_packages
		SET name = $2, tokens = $3, price_cents = $4, sort_order = $5, is_active = $6, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + tokenPackageColumns
	pkg, err := scanTokenPackage(r.pool.QueryRow(ctx, q,
		id,
		strings.TrimSpace(input.Name),
		input.Tokens,
		input.PriceCents,
		input.SortOrder,
		input.IsActive,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return pkg, err
}

func (r *TokenPackageRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM token_packages WHERE id = $1`, normalizeTokenPackageID(id))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func normalizeTokenPackageID(id string) string {
	return strings.TrimSpace(strings.ToLower(id))
}

func scanTokenPackage(row pgx.Row) (*model.TokenPackage, error) {
	var pkg model.TokenPackage
	err := row.Scan(
		&pkg.ID, &pkg.Name, &pkg.Tokens, &pkg.PriceCents, &pkg.SortOrder, &pkg.IsActive, &pkg.CreatedAt, &pkg.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &pkg, nil
}

func scanTokenPackages(rows pgx.Rows) ([]model.TokenPackage, error) {
	out := make([]model.TokenPackage, 0)
	for rows.Next() {
		var pkg model.TokenPackage
		if err := rows.Scan(
			&pkg.ID, &pkg.Name, &pkg.Tokens, &pkg.PriceCents, &pkg.SortOrder, &pkg.IsActive, &pkg.CreatedAt, &pkg.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, pkg)
	}
	return out, rows.Err()
}

type TokenPackageCheckoutRepository struct {
	pool *pgxpool.Pool
}

func NewTokenPackageCheckoutRepository(pool *pgxpool.Pool) *TokenPackageCheckoutRepository {
	return &TokenPackageCheckoutRepository{pool: pool}
}

const tokenPackageCheckoutColumns = `id, user_id, package_id, provider, amount_cents, tokens, status, external_id, inv_id, created_at, paid_at`

func (r *TokenPackageCheckoutRepository) Create(
	ctx context.Context,
	userID, packageID, provider string,
	amountCents, tokens int,
) (*model.TokenPackageCheckout, error) {
	const q = `
		INSERT INTO token_package_checkouts (user_id, package_id, provider, amount_cents, tokens, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING ` + tokenPackageCheckoutColumns
	return scanTokenPackageCheckout(r.pool.QueryRow(ctx, q, userID, packageID, provider, amountCents, tokens))
}

func (r *TokenPackageCheckoutRepository) GetByID(ctx context.Context, id string) (*model.TokenPackageCheckout, error) {
	const q = `SELECT ` + tokenPackageCheckoutColumns + ` FROM token_package_checkouts WHERE id = $1`
	checkout, err := scanTokenPackageCheckout(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return checkout, err
}

func (r *TokenPackageCheckoutRepository) GetByInvID(ctx context.Context, invID int64) (*model.TokenPackageCheckout, error) {
	const q = `SELECT ` + tokenPackageCheckoutColumns + ` FROM token_package_checkouts WHERE inv_id = $1`
	checkout, err := scanTokenPackageCheckout(r.pool.QueryRow(ctx, q, invID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return checkout, err
}

func (r *TokenPackageCheckoutRepository) SetExternal(ctx context.Context, id, externalID string, invID *int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE token_package_checkouts SET external_id = $2, inv_id = $3 WHERE id = $1
	`, id, externalID, invID)
	return err
}

func (r *TokenPackageCheckoutRepository) MarkPaid(ctx context.Context, id string) (*model.TokenPackageCheckout, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const markQ = `
		UPDATE token_package_checkouts
		SET status = 'paid', paid_at = NOW()
		WHERE id = $1 AND status = 'pending'
		RETURNING ` + tokenPackageCheckoutColumns
	checkout, err := scanTokenPackageCheckout(tx.QueryRow(ctx, markQ, id))
	if errors.Is(err, pgx.ErrNoRows) {
		existing, getErr := r.GetByID(ctx, id)
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
		SET
			purchased_media_credits_remaining = purchased_media_credits_remaining + $2,
			purchased_media_credits_total = purchased_media_credits_total + $2,
			updated_at = NOW()
		WHERE id = $1
	`
	if _, err := tx.Exec(ctx, creditQ, checkout.UserID, checkout.Tokens); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return checkout, nil
}

func (r *TokenPackageCheckoutRepository) ListForUser(ctx context.Context, userID string, limit int) ([]model.TokenPackageCheckout, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT `+tokenPackageCheckoutColumns+`
		FROM token_package_checkouts
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.TokenPackageCheckout, 0)
	for rows.Next() {
		checkout, err := scanTokenPackageCheckout(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *checkout)
	}
	return out, rows.Err()
}

func scanTokenPackageCheckout(row pgx.Row) (*model.TokenPackageCheckout, error) {
	var checkout model.TokenPackageCheckout
	var status string
	err := row.Scan(
		&checkout.ID, &checkout.UserID, &checkout.PackageID, &checkout.Provider,
		&checkout.AmountCents, &checkout.Tokens, &status, &checkout.ExternalID, &checkout.InvID,
		&checkout.CreatedAt, &checkout.PaidAt,
	)
	if err != nil {
		return nil, err
	}
	checkout.Status = model.CheckoutStatus(status)
	return &checkout, nil
}

func (r *WalletRepository) GetPurchasedCredits(ctx context.Context, userID string) (remaining, total int, err error) {
	err = r.pool.QueryRow(ctx, `
		SELECT purchased_media_credits_remaining, purchased_media_credits_total
		FROM users WHERE id = $1
	`, userID).Scan(&remaining, &total)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, 0, ErrNotFound
	}
	return remaining, total, err
}

func (r *WalletRepository) DeductPurchasedCredits(ctx context.Context, userID string, amount int) error {
	if amount <= 0 {
		return nil
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET purchased_media_credits_remaining = purchased_media_credits_remaining - $2, updated_at = NOW()
		WHERE id = $1 AND purchased_media_credits_remaining >= $2
	`, userID, amount)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WalletRepository) DeductPurchasedCreditsOnce(ctx context.Context, userID, generationID string, amount int) error {
	if amount <= 0 {
		return nil
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	inserted, err := tx.Exec(ctx, `
		INSERT INTO ai_generation_purchased_debits (generation_id, user_id, credits)
		VALUES ($1, $2, $3) ON CONFLICT (generation_id) DO NOTHING
	`, generationID, userID, amount)
	if err != nil {
		return err
	}
	if inserted.RowsAffected() == 0 {
		return tx.Commit(ctx)
	}
	tag, err := tx.Exec(ctx, `
		UPDATE users SET purchased_media_credits_remaining = purchased_media_credits_remaining - $2, updated_at = now()
		WHERE id = $1 AND purchased_media_credits_remaining >= $2
	`, userID, amount)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrNotFound
	}
	var remaining int
	if err := tx.QueryRow(ctx, `SELECT purchased_media_credits_remaining FROM users WHERE id = $1`, userID).Scan(&remaining); err != nil {
		return err
	}
	if remaining < 0 {
		return ErrNotFound
	}
	return tx.Commit(ctx)
}
