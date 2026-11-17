package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserSecuritySignal struct {
	ID              int64     `json:"id"`
	UserID          string    `json:"user_id"`
	EventType       string    `json:"event_type"`
	IPHash          string    `json:"ip_hash,omitempty"`
	DeviceHash      string    `json:"device_hash,omitempty"`
	RelatedAccounts int       `json:"related_accounts"`
	CreatedAt       time.Time `json:"created_at"`
}

type RelatedSecurityAccount struct {
	UserID       string    `json:"user_id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
	SharedIP     bool      `json:"shared_ip"`
	SharedDevice bool      `json:"shared_device"`
	SignalCount  int       `json:"signal_count"`
}

type UserSecuritySignalRepository struct {
	pool *pgxpool.Pool
}

func NewUserSecuritySignalRepository(pool *pgxpool.Pool) *UserSecuritySignalRepository {
	return &UserSecuritySignalRepository{pool: pool}
}

func (r *UserSecuritySignalRepository) Record(ctx context.Context, userID, eventType, ipHash, deviceHash string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_security_signals (user_id, event_type, ip_hash, device_hash)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''))
	`, userID, eventType, ipHash, deviceHash)
	return err
}

func (r *UserSecuritySignalRepository) ListForUser(ctx context.Context, userID string) ([]UserSecuritySignal, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, event_type, COALESCE(ip_hash, ''), COALESCE(device_hash, ''), created_at
		FROM user_security_signals
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]UserSecuritySignal, 0)
	for rows.Next() {
		var item UserSecuritySignal
		if err := rows.Scan(&item.ID, &item.UserID, &item.EventType, &item.IPHash, &item.DeviceHash, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *UserSecuritySignalRepository) RelatedAccounts(ctx context.Context, userID string) ([]RelatedSecurityAccount, error) {
	rows, err := r.pool.Query(ctx, `
		WITH target AS (
			SELECT DISTINCT ip_hash, device_hash
			FROM user_security_signals
			WHERE user_id = $1
		), matches AS (
			SELECT s.user_id,
			       BOOL_OR(s.ip_hash IS NOT NULL AND s.ip_hash = t.ip_hash) AS shared_ip,
			       BOOL_OR(s.device_hash IS NOT NULL AND s.device_hash = t.device_hash) AS shared_device,
			       COUNT(*)::int AS signal_count
		FROM user_security_signals s
		JOIN target t ON (s.ip_hash IS NOT NULL AND s.ip_hash = t.ip_hash)
		             OR (s.device_hash IS NOT NULL AND s.device_hash = t.device_hash)
		WHERE s.user_id <> $1
		GROUP BY s.user_id
	)
	SELECT u.id, u.email, u.name, u.created_at, m.shared_ip, m.shared_device, m.signal_count
	FROM matches m
	JOIN users u ON u.id = m.user_id
	ORDER BY m.shared_device DESC, m.shared_ip DESC, m.signal_count DESC, u.created_at DESC
	LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]RelatedSecurityAccount, 0)
	for rows.Next() {
		var item RelatedSecurityAccount
		if err := rows.Scan(&item.UserID, &item.Email, &item.Name, &item.CreatedAt, &item.SharedIP, &item.SharedDevice, &item.SignalCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
