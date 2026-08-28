package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

const supportTicketCols = `t.id, t.user_id, t.theme_id, t.subject, t.status, t.priority, t.ticket_number, t.created_at, t.updated_at, t.telegram_chat_id, t.telegram_topic_id`

type SupportTicketRepository struct {
	pool *pgxpool.Pool
}

func NewSupportTicketRepository(pool *pgxpool.Pool) *SupportTicketRepository {
	return &SupportTicketRepository{pool: pool}
}

func (r *SupportTicketRepository) ListActiveThemes(ctx context.Context) ([]model.SupportTicketTheme, error) {
	const q = `
		SELECT id, name, slug, description, icon, sort_order, is_active, created_at, updated_at
		FROM support_ticket_themes
		WHERE is_active = true
		ORDER BY sort_order ASC, name ASC
	`
	return r.scanThemes(ctx, q)
}

func (r *SupportTicketRepository) ListAllThemes(ctx context.Context) ([]model.SupportTicketTheme, error) {
	const q = `
		SELECT id, name, slug, description, icon, sort_order, is_active, created_at, updated_at
		FROM support_ticket_themes
		ORDER BY sort_order ASC, name ASC
	`
	return r.scanThemes(ctx, q)
}

func (r *SupportTicketRepository) GetThemeByID(ctx context.Context, id string) (*model.SupportTicketTheme, error) {
	const q = `
		SELECT id, name, slug, description, icon, sort_order, is_active, created_at, updated_at
		FROM support_ticket_themes
		WHERE id = $1
	`
	row := r.pool.QueryRow(ctx, q, id)
	theme, err := scanSupportTheme(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return theme, err
}

func (r *SupportTicketRepository) GetActiveThemeByID(ctx context.Context, id string) (*model.SupportTicketTheme, error) {
	const q = `
		SELECT id, name, slug, description, icon, sort_order, is_active, created_at, updated_at
		FROM support_ticket_themes
		WHERE id = $1 AND is_active = true
	`
	row := r.pool.QueryRow(ctx, q, id)
	theme, err := scanSupportTheme(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return theme, err
}

func (r *SupportTicketRepository) CreateTheme(ctx context.Context, theme model.SupportTicketTheme) (*model.SupportTicketTheme, error) {
	const q = `
		INSERT INTO support_ticket_themes (name, slug, description, icon, sort_order, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, slug, description, icon, sort_order, is_active, created_at, updated_at
	`
	row := r.pool.QueryRow(ctx, q, theme.Name, theme.Slug, theme.Description, theme.Icon, theme.SortOrder, theme.IsActive)
	return scanSupportTheme(row)
}

func (r *SupportTicketRepository) UpdateTheme(ctx context.Context, id string, theme model.SupportTicketTheme) (*model.SupportTicketTheme, error) {
	const q = `
		UPDATE support_ticket_themes
		SET name = $2, slug = $3, description = $4, icon = $5, sort_order = $6, is_active = $7, updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, slug, description, icon, sort_order, is_active, created_at, updated_at
	`
	row := r.pool.QueryRow(ctx, q, id, theme.Name, theme.Slug, theme.Description, theme.Icon, theme.SortOrder, theme.IsActive)
	out, err := scanSupportTheme(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return out, err
}

func (r *SupportTicketRepository) DeactivateTheme(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE support_ticket_themes SET is_active = false, updated_at = NOW() WHERE id = $1
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SupportTicketRepository) CountThemeTickets(ctx context.Context, themeID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM support_tickets WHERE theme_id = $1`, themeID).Scan(&count)
	return count, err
}

func (r *SupportTicketRepository) DeleteTheme(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM support_ticket_themes WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SupportTicketRepository) ThemeExistsByNameOrSlug(ctx context.Context, name, slug, excludeID string) (bool, error) {
	q := `
		SELECT EXISTS(
			SELECT 1 FROM support_ticket_themes
			WHERE (name = $1 OR slug = $2)
	`
	args := []any{name, slug}
	if excludeID != "" {
		q += ` AND id <> $3`
		args = append(args, excludeID)
	}
	q += `)`
	var exists bool
	err := r.pool.QueryRow(ctx, q, args...).Scan(&exists)
	return exists, err
}

func (r *SupportTicketRepository) CreateTicket(ctx context.Context, userID, themeID string, subject *string, priority model.TicketPriority) (*model.SupportTicket, error) {
	if priority == "" {
		priority = model.TicketPriorityNormal
	}
	const q = `
		INSERT INTO support_tickets (user_id, theme_id, subject, status, priority)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, theme_id, subject, status, priority, ticket_number, created_at, updated_at, telegram_chat_id, telegram_topic_id
	`
	row := r.pool.QueryRow(ctx, q, userID, themeID, subject, model.TicketStatusAwaitingAdmin, string(priority))
	return scanSupportTicket(row)
}

func (r *SupportTicketRepository) AddMessage(ctx context.Context, ticketID, authorID string, role model.TicketMessageAuthor, body string) (*model.SupportTicketMessage, error) {
	const q = `
		INSERT INTO support_ticket_messages (ticket_id, author_id, author_role, body)
		VALUES ($1, $2, $3, $4)
		RETURNING id, ticket_id, author_id, author_role, body, created_at
	`
	row := r.pool.QueryRow(ctx, q, ticketID, authorID, string(role), body)
	var msg model.SupportTicketMessage
	var roleRaw string
	err := row.Scan(&msg.ID, &msg.TicketID, &msg.AuthorID, &roleRaw, &msg.Body, &msg.CreatedAt)
	if err != nil {
		return nil, err
	}
	msg.AuthorRole = model.TicketMessageAuthor(roleRaw)
	return &msg, nil
}

func (r *SupportTicketRepository) UpdateTicketStatus(ctx context.Context, ticketID string, status model.TicketStatus) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE support_tickets SET status = $2, updated_at = NOW() WHERE id = $1
	`, ticketID, string(status))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SupportTicketRepository) TouchTicket(ctx context.Context, ticketID string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, ticketID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SupportTicketRepository) ListByUser(ctx context.Context, userID string) ([]model.SupportTicket, error) {
	const q = `
		SELECT ` + supportTicketCols + `,
		       th.name, th.slug, th.description, th.icon
		FROM support_tickets t
		JOIN support_ticket_themes th ON th.id = t.theme_id
		WHERE t.user_id = $1
		ORDER BY t.updated_at DESC
	`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.SupportTicket, 0)
	for rows.Next() {
		item, err := scanSupportTicketWithTheme(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

func (r *SupportTicketRepository) ListAll(ctx context.Context) ([]model.SupportTicket, error) {
	const q = `
		SELECT ` + supportTicketCols + `,
		       th.name, th.slug, th.description, th.icon, u.email, COALESCE(u.name, '')
		FROM support_tickets t
		JOIN support_ticket_themes th ON th.id = t.theme_id
		JOIN users u ON u.id = t.user_id
		ORDER BY t.updated_at DESC
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.SupportTicket, 0)
	for rows.Next() {
		item, err := scanSupportTicketWithThemeUser(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

func (r *SupportTicketRepository) GetByIDForUser(ctx context.Context, ticketID, userID string) (*model.SupportTicket, error) {
	const q = `
		SELECT ` + supportTicketCols + `,
		       th.name, th.slug, th.description, th.icon
		FROM support_tickets t
		JOIN support_ticket_themes th ON th.id = t.theme_id
		WHERE t.id = $1 AND t.user_id = $2
	`
	row := r.pool.QueryRow(ctx, q, ticketID, userID)
	ticket, err := scanSupportTicketWithTheme(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return ticket, err
}

func (r *SupportTicketRepository) GetByID(ctx context.Context, ticketID string) (*model.SupportTicket, error) {
	const q = `
		SELECT ` + supportTicketCols + `,
		       th.name, th.slug, th.description, th.icon, u.email, COALESCE(u.name, '')
		FROM support_tickets t
		JOIN support_ticket_themes th ON th.id = t.theme_id
		JOIN users u ON u.id = t.user_id
		WHERE t.id = $1
	`
	row := r.pool.QueryRow(ctx, q, ticketID)
	ticket, err := scanSupportTicketWithThemeUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return ticket, err
}

func (r *SupportTicketRepository) GetByTelegramTopic(ctx context.Context, chatID string, topicID int) (*model.SupportTicket, error) {
	chatID = strings.TrimSpace(chatID)
	if chatID == "" || topicID <= 0 {
		return nil, ErrNotFound
	}
	const q = `
		SELECT ` + supportTicketCols + `,
		       th.name, th.slug, th.description, th.icon, u.email, COALESCE(u.name, '')
		FROM support_tickets t
		JOIN support_ticket_themes th ON th.id = t.theme_id
		JOIN users u ON u.id = t.user_id
		WHERE t.telegram_chat_id = $1 AND t.telegram_topic_id = $2
		ORDER BY t.updated_at DESC
		LIMIT 1
	`
	row := r.pool.QueryRow(ctx, q, chatID, topicID)
	ticket, err := scanSupportTicketWithThemeUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return ticket, err
}

func (r *SupportTicketRepository) SetTelegramTopic(ctx context.Context, ticketID, chatID string, topicID int) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE support_tickets
		SET telegram_chat_id = $2, telegram_topic_id = $3, updated_at = NOW()
		WHERE id = $1
	`, ticketID, strings.TrimSpace(chatID), topicID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SupportTicketRepository) ClearTelegramTopic(ctx context.Context, ticketID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE support_tickets
		SET telegram_chat_id = NULL, telegram_topic_id = NULL, updated_at = NOW()
		WHERE id = $1
	`, ticketID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SupportTicketRepository) ListMessages(ctx context.Context, ticketID string) ([]model.SupportTicketMessageView, error) {
	const q = `
		SELECT m.id, m.author_role, m.body, m.created_at,
		       COALESCE(u.name, ''), COALESCE(u.email, '')
		FROM support_ticket_messages m
		LEFT JOIN users u ON u.id = m.author_id
		WHERE m.ticket_id = $1
		ORDER BY m.created_at ASC
	`
	rows, err := r.pool.Query(ctx, q, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.SupportTicketMessageView, 0)
	for rows.Next() {
		var msg model.SupportTicketMessageView
		var role string
		if err := rows.Scan(&msg.ID, &role, &msg.Body, &msg.CreatedAt, &msg.AuthorName, &msg.AuthorEmail); err != nil {
			return nil, err
		}
		msg.AuthorRole = model.TicketMessageAuthor(role)
		msg.Attachments = []model.SupportTicketAttachment{}
		items = append(items, msg)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	atts, err := r.listAttachmentsByTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if len(atts) == 0 {
		return items, nil
	}
	byMessage := make(map[string][]model.SupportTicketAttachment)
	for _, a := range atts {
		byMessage[a.MessageID] = append(byMessage[a.MessageID], a)
	}
	for i := range items {
		if list := byMessage[items[i].ID]; len(list) > 0 {
			items[i].Attachments = list
		}
	}
	return items, nil
}

func (r *SupportTicketRepository) CountByUserStatus(ctx context.Context, userID string, status model.TicketStatus) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM support_tickets WHERE user_id = $1 AND status = $2
	`, userID, string(status)).Scan(&count)
	return count, err
}

func (r *SupportTicketRepository) CountByStatus(ctx context.Context, status model.TicketStatus) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM support_tickets WHERE status = $1
	`, string(status)).Scan(&count)
	return count, err
}

func (r *SupportTicketRepository) AttachMessages(ctx context.Context, tickets []model.SupportTicket) ([]model.SupportTicket, error) {
	out := make([]model.SupportTicket, 0, len(tickets))
	for _, t := range tickets {
		msgs, err := r.ListMessages(ctx, t.ID)
		if err != nil {
			return nil, err
		}
		t.Messages = msgs
		out = append(out, t)
	}
	return out, nil
}

func (r *SupportTicketRepository) scanThemes(ctx context.Context, q string) ([]model.SupportTicketTheme, error) {
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.SupportTicketTheme, 0)
	for rows.Next() {
		item, err := scanSupportTheme(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

type themeScanner interface {
	Scan(dest ...any) error
}

func scanSupportTheme(row themeScanner) (*model.SupportTicketTheme, error) {
	var t model.SupportTicketTheme
	err := row.Scan(&t.ID, &t.Name, &t.Slug, &t.Description, &t.Icon, &t.SortOrder, &t.IsActive, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

type ticketScanner interface {
	Scan(dest ...any) error
}

func scanSupportTicket(row ticketScanner) (*model.SupportTicket, error) {
	var t model.SupportTicket
	var status, priority string
	var chatID *string
	var topicID *int
	err := row.Scan(
		&t.ID, &t.UserID, &t.ThemeID, &t.Subject, &status, &priority, &t.TicketNumber, &t.CreatedAt, &t.UpdatedAt,
		&chatID, &topicID,
	)
	if err != nil {
		return nil, err
	}
	t.Status = model.TicketStatus(status)
	t.Priority = model.TicketPriority(priority)
	applyTelegramTopic(&t, chatID, topicID)
	return &t, nil
}

func scanSupportTicketWithTheme(row ticketScanner) (*model.SupportTicket, error) {
	var t model.SupportTicket
	var status, priority string
	var chatID *string
	var topicID *int
	var themeName, themeSlug, themeDesc, themeIcon string
	err := row.Scan(
		&t.ID, &t.UserID, &t.ThemeID, &t.Subject, &status, &priority, &t.TicketNumber, &t.CreatedAt, &t.UpdatedAt,
		&chatID, &topicID,
		&themeName, &themeSlug, &themeDesc, &themeIcon,
	)
	if err != nil {
		return nil, err
	}
	t.Status = model.TicketStatus(status)
	t.Priority = model.TicketPriority(priority)
	applyTelegramTopic(&t, chatID, topicID)
	t.Theme = &model.SupportTicketThemeSummary{Name: themeName, Slug: themeSlug, Description: themeDesc, Icon: themeIcon}
	return &t, nil
}

func scanSupportTicketWithThemeUser(row ticketScanner) (*model.SupportTicket, error) {
	var t model.SupportTicket
	var status, priority string
	var chatID *string
	var topicID *int
	var themeName, themeSlug, themeDesc, themeIcon, userEmail, userName string
	err := row.Scan(
		&t.ID, &t.UserID, &t.ThemeID, &t.Subject, &status, &priority, &t.TicketNumber, &t.CreatedAt, &t.UpdatedAt,
		&chatID, &topicID,
		&themeName, &themeSlug, &themeDesc, &themeIcon, &userEmail, &userName,
	)
	if err != nil {
		return nil, err
	}
	t.Status = model.TicketStatus(status)
	t.Priority = model.TicketPriority(priority)
	applyTelegramTopic(&t, chatID, topicID)
	t.Theme = &model.SupportTicketThemeSummary{Name: themeName, Slug: themeSlug, Description: themeDesc, Icon: themeIcon}
	t.User = &model.SupportTicketUserSummary{Email: userEmail, Name: userName}
	return &t, nil
}

func applyTelegramTopic(t *model.SupportTicket, chatID *string, topicID *int) {
	if t == nil {
		return
	}
	if chatID != nil {
		t.TelegramChatID = strings.TrimSpace(*chatID)
	}
	if topicID != nil {
		t.TelegramTopicID = *topicID
	}
}

func (r *SupportTicketRepository) InsertAttachment(ctx context.Context, att model.SupportTicketAttachment) (*model.SupportTicketAttachment, error) {
	const q = `
		INSERT INTO support_ticket_attachments (ticket_id, message_id, filename, mime_type, size_bytes, storage_key)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, ticket_id, message_id, filename, mime_type, size_bytes, storage_key, created_at
	`
	row := r.pool.QueryRow(ctx, q, att.TicketID, att.MessageID, att.Filename, att.MimeType, att.SizeBytes, att.StorageKey)
	return scanSupportAttachment(row)
}

func (r *SupportTicketRepository) GetAttachment(ctx context.Context, ticketID, attachmentID string) (*model.SupportTicketAttachment, error) {
	const q = `
		SELECT id, ticket_id, message_id, filename, mime_type, size_bytes, storage_key, created_at
		FROM support_ticket_attachments
		WHERE id = $1 AND ticket_id = $2
	`
	row := r.pool.QueryRow(ctx, q, attachmentID, ticketID)
	att, err := scanSupportAttachment(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return att, err
}

func (r *SupportTicketRepository) listAttachmentsByTicket(ctx context.Context, ticketID string) ([]model.SupportTicketAttachment, error) {
	const q = `
		SELECT id, ticket_id, message_id, filename, mime_type, size_bytes, storage_key, created_at
		FROM support_ticket_attachments
		WHERE ticket_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, q, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.SupportTicketAttachment, 0)
	for rows.Next() {
		att, err := scanSupportAttachment(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *att)
	}
	return items, rows.Err()
}

func scanSupportAttachment(row ticketScanner) (*model.SupportTicketAttachment, error) {
	var a model.SupportTicketAttachment
	var storageKey string
	err := row.Scan(&a.ID, &a.TicketID, &a.MessageID, &a.Filename, &a.MimeType, &a.SizeBytes, &storageKey, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	a.StorageKey = storageKey
	return &a, nil
}
