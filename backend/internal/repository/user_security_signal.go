package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
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

func (r *UserSecuritySignalRepository) ListRiskProfiles(ctx context.Context, limit, offset int) ([]model.AntiFraudUserProfile, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM user_security_signals`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		WITH stats AS (
			SELECT s.user_id,
			 COUNT(*)::int AS events,
			 COUNT(DISTINCT NULLIF(s.device_hash, ''))::int AS devices,
			 COUNT(DISTINCT NULLIF(s.ip_hash, ''))::int AS ips,
			 MAX(s.created_at) AS last_activity,
			 COUNT(DISTINCT other.user_id)::int AS related
		FROM user_security_signals s
		LEFT JOIN user_security_signals other ON other.user_id <> s.user_id
		  AND ((s.device_hash IS NOT NULL AND s.device_hash = other.device_hash)
		    OR (s.ip_hash IS NOT NULL AND s.ip_hash = other.ip_hash))
		GROUP BY s.user_id
		)
		SELECT u.id, u.email, u.name, u.is_blocked, u.is_platform_admin, u.created_at,
		       st.related, st.last_activity,
		       COALESCE(d.decision, ''), COALESCE(d.reason, ''), d.decided_at,
		       CASE WHEN st.related >= 3 THEN 50 WHEN st.related >= 1 THEN 25 ELSE 0 END
		       + CASE WHEN st.devices > 1 THEN 10 ELSE 0 END
		       + CASE WHEN st.ips > 3 THEN 10 ELSE 0 END AS risk_score
		FROM stats st JOIN users u ON u.id = st.user_id AND u.is_platform_admin = FALSE
		LEFT JOIN anti_fraud_user_decisions d ON d.user_id = u.id
		ORDER BY risk_score DESC, st.last_activity DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]model.AntiFraudUserProfile, 0, limit)
	for rows.Next() {
		var item model.AntiFraudUserProfile
		var lastActivity, decisionAt *time.Time
		if err := rows.Scan(&item.UserID, &item.Email, &item.Name, &item.IsBlocked, &item.IsPlatformAdmin, &item.CreatedAt, &item.RelatedAccounts, &lastActivity, &item.Decision, &item.DecisionReason, &decisionAt, &item.RiskScore); err != nil {
			return nil, 0, err
		}
		item.LastActivityAt, item.DecisionAt = lastActivity, decisionAt
		item.RiskLevel = "low"
		if item.RiskScore >= 80 {
			item.RiskLevel = "critical"
		} else if item.RiskScore >= 60 {
			item.RiskLevel = "high"
		} else if item.RiskScore >= 30 {
			item.RiskLevel = "medium"
		}
		item.Signals = []string{}
		if item.RelatedAccounts > 0 {
			item.Signals = append(item.Signals, "shared_identity_signal")
		}
		if item.RiskScore >= 60 {
			item.Signals = append(item.Signals, "high_risk_score")
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *UserSecuritySignalRepository) SetDecision(ctx context.Context, actorID, userID, decision, reason string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO anti_fraud_user_decisions (user_id, decision, reason, decided_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET decision = EXCLUDED.decision, reason = EXCLUDED.reason, decided_by = EXCLUDED.decided_by, decided_at = NOW()
	`, userID, decision, reason, actorID)
	return err
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
