package service

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

const localMediaRoot = "/var/lib/postilka/local-media"

type LocalMediaStore struct{ root string }

func NewLocalMediaStore() *LocalMediaStore { return &LocalMediaStore{root: localMediaRoot} }

func IsLocalMediaKey(key string) bool { return strings.HasPrefix(strings.TrimSpace(key), "local:") }

func (s *LocalMediaStore) Put(ctx context.Context, category, id, ext string, data []byte) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	category = filepath.Base(strings.TrimSpace(category))
	id = filepath.Base(strings.TrimSpace(id))
	if id == "." || id == "" {
		id = uuid.NewString()
	}
	ext = strings.ToLower(filepath.Base(strings.TrimSpace(ext)))
	if ext == "." || ext == "" {
		ext = ".bin"
	}
	dir := filepath.Join(s.root, category, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	name := uuid.NewString() + ext
	tmp, err := os.CreateTemp(dir, ".upload-*")
	if err != nil {
		return "", err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err = tmp.Write(data); err == nil {
		err = tmp.Chmod(0o644)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return "", err
	}
	final := filepath.Join(dir, name)
	if err := os.Rename(tmpName, final); err != nil {
		return "", err
	}
	return "local:" + filepath.ToSlash(filepath.Join(category, id, name)), nil
}

func (s *LocalMediaStore) Open(key string) (*os.File, os.FileInfo, error) {
	if !IsLocalMediaKey(key) {
		return nil, nil, os.ErrNotExist
	}
	rel := strings.TrimPrefix(strings.TrimSpace(key), "local:")
	clean := filepath.Clean(filepath.FromSlash(rel))
	if clean == "." || filepath.IsAbs(clean) || strings.HasPrefix(clean, ".."+string(os.PathSeparator)) || clean == ".." {
		return nil, nil, os.ErrNotExist
	}
	path := filepath.Join(s.root, clean)
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, nil, err
	}
	return f, info, nil
}

func (s *LocalMediaStore) Delete(key string) error {
	if !IsLocalMediaKey(key) {
		return nil
	}
	f, _, err := s.Open(key)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	path := f.Name()
	_ = f.Close()
	return os.Remove(path)
}

func (s *LocalMediaStore) Read(key string) ([]byte, string, error) {
	f, info, err := s.Open(key)
	if err != nil {
		return nil, "", err
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		return nil, "", err
	}
	return data, contentTypeFromLocalPath(info.Name()), nil
}

func contentTypeFromLocalPath(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	default:
		return "application/octet-stream"
	}
}

func localMediaURL(key string) string {
	return "/api/v1/local-media/" + strings.TrimPrefix(strings.TrimPrefix(key, "local:"), "/")
}

var ErrLocalMediaNotFound = fmt.Errorf("local media not found")
