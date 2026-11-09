package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/davidyusaku-13/posix/internal/domain"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

const userColumns = `id, username, name, role, pin_hash, password_hash, active, created_at, updated_at`

func scanUser(s scanner) (*domain.User, error) {
	var u domain.User
	var roleStr string
	var activeInt int
	err := s.Scan(
		&u.ID,
		&u.Username,
		&u.Name,
		&roleStr,
		&u.PinHash,
		&u.PasswordHash,
		&activeInt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	u.Role = domain.Role(roleStr)
	u.Active = activeInt == 1
	return &u, nil
}

func (r *UserRepository) List(ctx context.Context) ([]domain.User, error) {
	stmt := fmt.Sprintf(`SELECT %s FROM users ORDER BY id ASC`, userColumns)
	rows, err := r.db.QueryContext(ctx, stmt)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	users := make([]domain.User, 0)
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, *u)
	}
	return users, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*domain.User, error) {
	stmt := fmt.Sprintf(`SELECT %s FROM users WHERE id = ?`, userColumns)
	u, err := scanUser(r.db.QueryRowContext(ctx, stmt, id))
	if err == sql.ErrNoRows {
		return nil, domain.ErrProductNotFound // generic not found
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by id: %w", err)
	}
	return u, nil
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	stmt := fmt.Sprintf(`SELECT %s FROM users WHERE username = ?`, userColumns)
	u, err := scanUser(r.db.QueryRowContext(ctx, stmt, username))
	if err == sql.ErrNoRows {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by username: %w", err)
	}
	return u, nil
}

func (r *UserRepository) Create(ctx context.Context, u *domain.User) (*domain.User, error) {
	activeInt := 0
	if u.Active {
		activeInt = 1
	}
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO users (username, name, role, pin_hash, password_hash, active)
		VALUES (?, ?, ?, ?, ?, ?)
	`, u.Username, u.Name, string(u.Role), u.PinHash, u.PasswordHash, activeInt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

func (r *UserRepository) Update(ctx context.Context, u *domain.User) (*domain.User, error) {
	activeInt := 0
	if u.Active {
		activeInt = 1
	}
	res, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET name = ?, role = ?, pin_hash = ?, password_hash = ?, active = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, u.Name, string(u.Role), u.PinHash, u.PasswordHash, activeInt, u.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, domain.ErrProductNotFound
	}
	return r.FindByID(ctx, u.ID)
}

func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	return err
}
