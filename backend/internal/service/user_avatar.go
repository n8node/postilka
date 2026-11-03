package service

import (
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrUserAvatarInvalid  = errors.New("user avatar invalid")
	ErrUserAvatarNotFound = errors.New("user avatar not found")
)

const maxUserAvatarSize = 5 << 20

type UserAvatarService struct {
	users *repository.UserRepository
	store *ObjectStorage
	local *LocalMediaStore
}

func NewUserAvatarService(users *repository.UserRepository, store *ObjectStorage, local *LocalMediaStore) *UserAvatarService {
	return &UserAvatarService{users: users, store: store, local: local}
}

func (s *UserAvatarService) Upload(
	ctx context.Context,
	userID string,
	file multipart.File,
	header *multipart.FileHeader,
) (*model.User, error) {
	if file == nil || header == nil {
		return nil, ErrUserAvatarInvalid
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxUserAvatarSize+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || len(data) > maxUserAvatarSize {
		return nil, ErrUserAvatarInvalid
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	switch contentType {
	case "image/jpeg", "image/png", "image/webp":
	default:
		return nil, ErrUserAvatarInvalid
	}

	ext := path.Ext(header.Filename)
	if ext == "" {
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}

	prevKey, err := s.users.GetAvatarS3Key(ctx, userID)
	if err != nil {
		return nil, err
	}

	key, err := s.local.Put(ctx, "user-avatars", userID, ext, data)
	if err != nil {
		return nil, err
	}

	user, err := s.users.UpdateAvatarS3Key(ctx, userID, &key)
	if err != nil {
		_ = s.local.Delete(key)
		return nil, err
	}

	if prevKey != "" && prevKey != key {
		_ = s.local.Delete(prevKey)
		if !IsLocalMediaKey(prevKey) {
			_ = s.store.DeleteObject(ctx, prevKey)
		}
	}
	return user, nil
}

func (s *UserAvatarService) Delete(ctx context.Context, userID string) (*model.User, error) {
	prevKey, err := s.users.GetAvatarS3Key(ctx, userID)
	if err != nil {
		return nil, err
	}

	user, err := s.users.UpdateAvatarS3Key(ctx, userID, nil)
	if err != nil {
		return nil, err
	}

	if prevKey != "" {
		_ = s.local.Delete(prevKey)
		if !IsLocalMediaKey(prevKey) {
			_ = s.store.DeleteObject(ctx, prevKey)
		}
	}
	return user, nil
}

func (s *UserAvatarService) Fetch(ctx context.Context, userID string) ([]byte, string, error) {
	key, err := s.users.GetAvatarS3Key(ctx, userID)
	if err != nil {
		return nil, "", err
	}
	if key == "" {
		return nil, "", ErrUserAvatarNotFound
	}

	var body io.ReadCloser
	var contentType string
	if IsLocalMediaKey(key) {
		f, info, openErr := s.local.Open(key)
		if openErr != nil {
			return nil, "", ErrUserAvatarNotFound
		}
		body = f
		contentType = contentTypeFromLocalPath(info.Name())
	} else {
		body, contentType, err = s.store.GetObject(ctx, key)
	}
	if err != nil {
		return nil, "", ErrUserAvatarNotFound
	}
	defer body.Close()

	data, err := io.ReadAll(io.LimitReader(body, maxUserAvatarSize+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 {
		return nil, "", ErrUserAvatarNotFound
	}
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	return data, contentType, nil
}
