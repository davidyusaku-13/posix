package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/davidyusaku-13/posix/internal/domain"
	"github.com/davidyusaku-13/posix/internal/repository"
)

type NotificationRepo struct {
	db *sql.DB
}

var _ repository.NotificationRepository = (*NotificationRepo)(nil)

func NewNotificationRepository(db *sql.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

func (r *NotificationRepo) GetConfig(ctx context.Context) (*domain.NotificationConfig, error) {
	query := `
		SELECT owner_phone, enabled, notify_low_stock, cooldown_minutes, updated_at
		FROM notification_settings
		WHERE id = 1
	`
	var cfg domain.NotificationConfig
	var enabledInt, notifyLowStockInt int
	var updatedAtStr string

	err := r.db.QueryRowContext(ctx, query).Scan(
		&cfg.OwnerPhone,
		&enabledInt,
		&notifyLowStockInt,
		&cfg.CooldownMinutes,
		&updatedAtStr,
	)
	if err == sql.ErrNoRows {
		// Insert default row if not present
		_, err = r.db.ExecContext(ctx, `INSERT OR IGNORE INTO notification_settings (id, owner_phone, enabled, notify_low_stock, cooldown_minutes) VALUES (1, '', 0, 1, 60)`)
		if err != nil {
			return nil, fmt.Errorf("failed to create default notification settings: %w", err)
		}
		return &domain.NotificationConfig{
			OwnerPhone:      "",
			Enabled:         false,
			NotifyLowStock:  true,
			CooldownMinutes: 60,
			UpdatedAt:       time.Now(),
		}, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to get notification settings: %w", err)
	}

	cfg.Enabled = enabledInt == 1
	cfg.NotifyLowStock = notifyLowStockInt == 1
	cfg.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAtStr)
	return &cfg, nil
}

func (r *NotificationRepo) UpdateConfig(ctx context.Context, input domain.UpdateNotificationConfigInput) (*domain.NotificationConfig, error) {
	current, err := r.GetConfig(ctx)
	if err != nil {
		return nil, err
	}

	if input.OwnerPhone != nil {
		current.OwnerPhone = *input.OwnerPhone
	}
	if input.Enabled != nil {
		current.Enabled = *input.Enabled
	}
	if input.NotifyLowStock != nil {
		current.NotifyLowStock = *input.NotifyLowStock
	}
	if input.CooldownMinutes != nil {
		current.CooldownMinutes = *input.CooldownMinutes
	}

	enabledInt := 0
	if current.Enabled {
		enabledInt = 1
	}
	notifyLowStockInt := 0
	if current.NotifyLowStock {
		notifyLowStockInt = 1
	}

	query := `
		UPDATE notification_settings
		SET owner_phone = ?, enabled = ?, notify_low_stock = ?, cooldown_minutes = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`
	_, err = r.db.ExecContext(ctx, query, current.OwnerPhone, enabledInt, notifyLowStockInt, current.CooldownMinutes)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification settings: %w", err)
	}

	return r.GetConfig(ctx)
}

func (r *NotificationRepo) LogNotification(ctx context.Context, log *domain.NotificationLog, productID int64) error {
	query := `
		INSERT INTO notification_logs (channel, recipient, event_type, product_id, payload, status, error_message, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`
	res, err := r.db.ExecContext(ctx, query,
		log.Channel,
		log.Recipient,
		log.EventType,
		productID,
		log.Payload,
		log.Status,
		log.ErrorMessage,
	)
	if err != nil {
		return fmt.Errorf("failed to insert notification log: %w", err)
	}

	id, err := res.LastInsertId()
	if err == nil {
		log.ID = id
	}
	return nil
}

func (r *NotificationRepo) ListLogs(ctx context.Context, limit int) ([]domain.NotificationLog, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, channel, recipient, event_type, payload, status, error_message, created_at
		FROM notification_logs
		ORDER BY created_at DESC
		LIMIT ?
	`
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list notification logs: %w", err)
	}
	defer rows.Close()

	var logs []domain.NotificationLog
	for rows.Next() {
		var l domain.NotificationLog
		err := rows.Scan(
			&l.ID,
			&l.Channel,
			&l.Recipient,
			&l.EventType,
			&l.Payload,
			&l.Status,
			&l.ErrorMessage,
			&l.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (r *NotificationRepo) GetLastSentAt(ctx context.Context, eventType string, productID int64) (*time.Time, error) {
	query := `
		SELECT created_at
		FROM notification_logs
		WHERE event_type = ? AND product_id = ? AND status = 'sent'
		ORDER BY created_at DESC
		LIMIT 1
	`
	var t time.Time
	err := r.db.QueryRowContext(ctx, query, eventType, productID).Scan(&t)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to query last sent notification: %w", err)
	}

	return &t, nil
}
