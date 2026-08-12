package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

func (s *PostService) DeleteTelegramStory(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != model.PostStatusPublished {
		return nil, fmt.Errorf("%w: удалить можно только опубликованную историю", ErrInvalidPost)
	}
	if err := s.publication.DeleteTelegramStory(ctx, post); err != nil {
		return nil, err
	}
	return s.posts.Get(ctx, ws.ID, postID)
}

func (s *PostService) SyncTelegramStory(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if strings.ToLower(strings.TrimSpace(post.Content.Format)) != "story" {
		return nil, fmt.Errorf("%w: это не история Telegram", ErrInvalidPost)
	}
	if post.Status != model.PostStatusPublished {
		return nil, fmt.Errorf("%w: синхронизировать можно только опубликованную историю", ErrInvalidPost)
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return nil, err
	}
	if err := s.publication.EditTelegramStory(ctx, post); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrPublishFailed, err.Error())
	}
	return s.posts.Get(ctx, ws.ID, postID)
}
