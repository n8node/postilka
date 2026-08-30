package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	maxProviderLogoUpload = 5 << 20
	providerLogoMaxSide   = 512
)

var (
	ErrProviderLogoInvalid = errors.New("provider logo invalid")
	ErrProviderLogoNotFound = errors.New("provider logo not found")
)

type ProviderLogoService struct {
	repo  *repository.ProviderLogoRepository
	store *ObjectStorage
}

func NewProviderLogoService(repo *repository.ProviderLogoRepository, store *ObjectStorage) *ProviderLogoService {
	return &ProviderLogoService{repo: repo, store: store}
}

func (s *ProviderLogoService) ListViews(ctx context.Context) ([]model.ProviderLogoView, error) {
	items, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.ProviderLogoView, 0, len(items))
	for _, item := range items {
		out = append(out, model.ProviderLogoView{
			Provider:  item.Provider,
			LogoURL:   model.ProviderLogoAPIPathVersioned(item.Provider, item.UpdatedAt),
			UpdatedAt: item.UpdatedAt,
		})
	}
	return out, nil
}

func (s *ProviderLogoService) AttachToProviderInfo(ctx context.Context, info *model.ChannelProviderInfo) {
	if info == nil {
		return
	}
	urls := s.apiURLMap(ctx)
	info.TelegramLogoURL = urls[model.ProviderLogoTelegram]
	info.TelegramBusinessLogoURL = urls[model.ProviderLogoTelegramBusiness]
	info.PhotochkaLogoURL = urls[model.ProviderLogoPhotochka]
	info.WordPressLogoURL = urls[model.ProviderLogoWordPress]
	for i := range info.Providers {
		info.Providers[i].LogoURL = urls[model.ProviderLogoKey(info.Providers[i].Provider)]
	}
}

func (s *ProviderLogoService) apiURLMap(ctx context.Context) map[model.ProviderLogoKey]string {
	out := map[model.ProviderLogoKey]string{}
	items, err := s.repo.List(ctx)
	if err != nil {
		return out
	}
	for _, item := range items {
		out[item.Provider] = model.ProviderLogoAPIPathVersioned(item.Provider, item.UpdatedAt)
	}
	return out
}

func (s *ProviderLogoService) Upload(
	ctx context.Context,
	provider model.ProviderLogoKey,
	file multipart.File,
	header *multipart.FileHeader,
) (*model.ProviderLogoView, error) {
	if file == nil || header == nil {
		return nil, ErrProviderLogoInvalid
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxProviderLogoUpload+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || len(data) > maxProviderLogoUpload {
		return nil, ErrProviderLogoInvalid
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	if contentType != "image/png" && http.DetectContentType(data) != "image/png" {
		return nil, ErrProviderLogoInvalid
	}

	normalized, err := normalizeProviderLogoPNG(data)
	if err != nil {
		return nil, err
	}

	prev, err := s.repo.Get(ctx, provider)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	key := fmt.Sprintf("postilka/provider-logos/%s/%s.png", provider, uuid.NewString())
	if err := s.store.PutObject(ctx, key, "image/png", normalized); err != nil {
		return nil, err
	}
	rec, err := s.repo.Upsert(ctx, provider, key)
	if err != nil {
		_ = s.store.DeleteObject(ctx, key)
		return nil, err
	}
	if prev != nil && prev.S3Key != "" && prev.S3Key != key {
		_ = s.store.DeleteObject(ctx, prev.S3Key)
	}
	return &model.ProviderLogoView{
		Provider:  rec.Provider,
		LogoURL:   model.ProviderLogoAPIPathVersioned(rec.Provider, rec.UpdatedAt),
		UpdatedAt: rec.UpdatedAt,
	}, nil
}

func (s *ProviderLogoService) Delete(ctx context.Context, provider model.ProviderLogoKey) error {
	key, err := s.repo.Delete(ctx, provider)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrProviderLogoNotFound
		}
		return err
	}
	if key != "" {
		_ = s.store.DeleteObject(ctx, key)
	}
	return nil
}

func (s *ProviderLogoService) Fetch(ctx context.Context, provider model.ProviderLogoKey) ([]byte, string, error) {
	rec, err := s.repo.Get(ctx, provider)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, "", ErrProviderLogoNotFound
		}
		return nil, "", err
	}
	body, contentType, err := s.store.GetObject(ctx, rec.S3Key)
	if err != nil {
		return nil, "", ErrProviderLogoNotFound
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, maxProviderLogoUpload+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 {
		return nil, "", ErrProviderLogoNotFound
	}
	if contentType == "" {
		contentType = "image/png"
	}
	return data, contentType, nil
}

func normalizeProviderLogoPNG(data []byte) ([]byte, error) {
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, ErrProviderLogoInvalid
	}
	square := cropCenterSquare(img)
	side := square.Bounds().Dx()
	if side > providerLogoMaxSide {
		square = resizeNearest(square, providerLogoMaxSide)
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, square); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func cropCenterSquare(src image.Image) image.Image {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return src
	}
	side := w
	if h < w {
		side = h
	}
	x0 := b.Min.X + (w-side)/2
	y0 := b.Min.Y + (h-side)/2
	rect := image.Rect(0, 0, side, side)
	dst := image.NewNRGBA(rect)
	draw.Draw(dst, rect, src, image.Pt(x0, y0), draw.Src)
	return dst
}

func resizeNearest(src image.Image, size int) *image.NRGBA {
	dst := image.NewNRGBA(image.Rect(0, 0, size, size))
	b := src.Bounds()
	sw, sh := b.Dx(), b.Dy()
	if sw <= 0 || sh <= 0 {
		return dst
	}
	for y := 0; y < size; y++ {
		sy := b.Min.Y + y*sh/size
		for x := 0; x < size; x++ {
			sx := b.Min.X + x*sw/size
			dst.Set(x, y, src.At(sx, sy))
		}
	}
	return dst
}
