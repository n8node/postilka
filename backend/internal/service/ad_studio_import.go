package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

type TrendsImageImportResult struct {
	Created        int      `json:"created"`
	PreviewFilled  int      `json:"preview_filled"`
	Skipped        int      `json:"skipped"`
	Failed         int      `json:"failed"`
	Optimized      int      `json:"optimized"`
	OriginalBytes  int64    `json:"original_bytes"`
	OptimizedBytes int64    `json:"optimized_bytes"`
	Errors         []string `json:"errors,omitempty"`
}

type TrendsVideoImportResult = TrendsImageImportResult

type syntxTrendImageMeta struct {
	ID                 string `json:"id"`
	Slug               string `json:"slug"`
	Title              string `json:"title"`
	GenerationType     string `json:"generation_type"`
	Prompt             string `json:"prompt"`
	GenerationSettings struct {
		AspectRatio string `json:"aspect_ratio"`
	} `json:"generation_settings"`
	Categories []syntxTrendCategory `json:"categories"`
	Files      struct {
		PostilkaPreview string `json:"postilka_preview"`
	} `json:"files"`
}

type syntxTrendVideoMeta struct {
	ID                 string `json:"id"`
	Slug               string `json:"slug"`
	Title              string `json:"title"`
	GenerationType     string `json:"generation_type"`
	MediaFile          string `json:"media_file"`
	Prompt             string `json:"prompt"`
	GenerationSettings struct {
		AspectRatio   string `json:"aspect_ratio"`
		VideoDuration int    `json:"video_duration"`
	} `json:"generation_settings"`
	Categories []syntxTrendCategory `json:"categories"`
}

type syntxTrendCategory struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}

type trendsImageImportItem struct {
	jsonName    string
	title       string
	category    string
	ratio       string
	prompt      string
	previewPath string
	sortOrder   int
}

type trendsVideoImportItem struct {
	jsonName  string
	title     string
	category  string
	ratio     string
	duration  int
	prompt    string
	mediaPath string
	mediaName string
	sortOrder int
}

func (s *AdStudioService) ImportUnpublishedVideoTrends(ctx context.Context, dir string, dryRun bool) (TrendsVideoImportResult, error) {
	var out TrendsVideoImportResult
	abs, err := filepath.Abs(strings.TrimSpace(dir))
	if err != nil {
		return out, fmt.Errorf("import dir: %w", err)
	}
	entries, err := os.ReadDir(abs)
	if err != nil {
		return out, fmt.Errorf("read import dir: %w", err)
	}

	jsonNames := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.EqualFold(filepath.Ext(entry.Name()), ".json") {
			jsonNames = append(jsonNames, entry.Name())
		}
	}
	sort.Strings(jsonNames)
	if len(jsonNames) == 0 {
		return out, fmt.Errorf("no json files in %s", abs)
	}

	usedTitles := map[string]bool{}
	items := make([]trendsVideoImportItem, 0, len(jsonNames))
	for _, name := range jsonNames {
		item, skip, err := parseTrendsVideoImportFile(abs, name, usedTitles)
		if err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: %s", name, err))
			continue
		}
		if skip {
			out.Skipped++
			continue
		}
		items = append(items, item)
	}

	existing, err := s.repo.List(ctx, model.AdStudioCatalogTrends, "", false)
	if err != nil {
		return out, err
	}
	byTitle := make(map[string]model.AdStudioTemplate, len(existing))
	for _, template := range existing {
		byTitle[strings.ToLower(strings.TrimSpace(template.Title))] = template
	}

	for _, item := range items {
		if err := ctx.Err(); err != nil {
			return out, err
		}
		current, found := byTitle[strings.ToLower(item.title)]
		if found {
			if strings.TrimSpace(current.PreviewS3Key) != "" {
				out.Skipped++
				continue
			}
			if dryRun {
				optimized, originalBytes, optimizedBytes, err := optimizeTrendVideoFile(item.mediaPath, item.mediaName)
				if err != nil {
					out.Failed++
					out.Errors = append(out.Errors, fmt.Sprintf("%s: optimize: %s", item.jsonName, err))
					continue
				}
				_ = optimized
				out.Optimized++
				out.OriginalBytes += originalBytes
				out.OptimizedBytes += optimizedBytes
				out.PreviewFilled++
				continue
			}
			optimized, originalBytes, optimizedBytes, err := optimizeTrendVideoFile(item.mediaPath, item.mediaName)
			if err != nil {
				out.Failed++
				out.Errors = append(out.Errors, fmt.Sprintf("%s: optimize: %s", item.jsonName, err))
				continue
			}
			if err := s.uploadTrendsImportPreviewBytes(ctx, current.ID, optimized, item.mediaName, "video/mp4"); err != nil {
				out.Failed++
				out.Errors = append(out.Errors, fmt.Sprintf("%s: preview: %s", item.jsonName, err))
				continue
			}
			out.Optimized++
			out.OriginalBytes += originalBytes
			out.OptimizedBytes += optimizedBytes
			out.PreviewFilled++
			continue
		}
		if dryRun {
			optimized, originalBytes, optimizedBytes, err := optimizeTrendVideoFile(item.mediaPath, item.mediaName)
			if err != nil {
				out.Failed++
				out.Errors = append(out.Errors, fmt.Sprintf("%s: optimize: %s", item.jsonName, err))
				continue
			}
			_ = optimized
			out.Optimized++
			out.OriginalBytes += originalBytes
			out.OptimizedBytes += optimizedBytes
			out.Created++
			continue
		}
		published := false
		requiresProduct := false
		requiresAvatar := false
		trendPrompt := true
		order := item.sortOrder
		created, err := s.CreateAdmin(ctx, model.AdStudioTemplateWriteRequest{
			Title: item.title, Catalog: model.AdStudioCatalogTrends, Category: item.category,
			GenerationMode: model.AdStudioModeReferenceToVideo, AspectRatio: item.ratio,
			Duration: item.duration, SystemPrompt: item.prompt,
			RequiresProduct: &requiresProduct, RequiresAvatar: &requiresAvatar,
			TrendPrompt: &trendPrompt, SortOrder: &order, IsPublished: &published,
		})
		if err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: create: %s", item.jsonName, err))
			continue
		}
		byTitle[strings.ToLower(item.title)] = model.AdStudioTemplate{ID: created.ID, Title: created.Title}
		optimized, originalBytes, optimizedBytes, err := optimizeTrendVideoFile(item.mediaPath, item.mediaName)
		if err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: optimize: %s", item.jsonName, err))
			continue
		}
		if err := s.uploadTrendsImportPreviewBytes(ctx, created.ID, optimized, item.mediaName, "video/mp4"); err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: preview: %s", item.jsonName, err))
			continue
		}
		out.Optimized++
		out.OriginalBytes += originalBytes
		out.OptimizedBytes += optimizedBytes
		out.Created++
	}
	return out, nil
}

func parseTrendsVideoImportFile(root, name string, usedTitles map[string]bool) (trendsVideoImportItem, bool, error) {
	item := trendsVideoImportItem{}
	item.jsonName = name
	raw, err := os.ReadFile(filepath.Join(root, name))
	if err != nil {
		return item, false, err
	}
	var meta syntxTrendVideoMeta
	if err := json.Unmarshal(raw, &meta); err != nil {
		return item, false, err
	}
	if strings.ToLower(strings.TrimSpace(meta.GenerationType)) != "video" {
		return item, true, nil
	}
	if strings.TrimSpace(meta.Prompt) == "" {
		return item, false, fmt.Errorf("empty prompt")
	}
	mediaName := filepath.Base(strings.TrimSpace(meta.MediaFile))
	if mediaName == "." || mediaName == "" {
		return item, false, fmt.Errorf("media_file is required")
	}
	mediaPath := filepath.Join(root, mediaName)
	info, err := os.Stat(mediaPath)
	if err != nil || !info.Mode().IsRegular() {
		return item, false, fmt.Errorf("video not found: %s", mediaName)
	}
	category, err := trendsCategoryFromSlugs(meta.Categories)
	if err != nil {
		return item, false, err
	}
	ratio := normalizeAdStudioVideoRatio(meta.GenerationSettings.AspectRatio)
	duration := meta.GenerationSettings.VideoDuration
	if duration < 4 {
		duration = 4
	}
	if duration > 15 {
		duration = 15
	}
	title := uniqueTrendsImportTitle(meta.Title, meta.Slug, meta.ID, usedTitles)
	return trendsVideoImportItem{jsonName: name, title: title, category: category, ratio: ratio, duration: duration, prompt: strings.TrimSpace(meta.Prompt), mediaPath: mediaPath, mediaName: mediaName, sortOrder: trendsImportSortOrder(name)}, false, nil
}

func trendsCategoryFromSlugs(categories []syntxTrendCategory) (string, error) {
	for _, category := range categories {
		if model.IsAdTrendsCategory(strings.TrimSpace(category.Slug)) {
			return strings.TrimSpace(category.Slug), nil
		}
	}
	return "", fmt.Errorf("no known trends category")
}

func normalizeAdStudioVideoRatio(ratio string) string {
	switch strings.TrimSpace(ratio) {
	case "9:16", "16:9", "1:1", "4:3", "3:4", "21:9":
		return strings.TrimSpace(ratio)
	default:
		return "16:9"
	}
}

func (s *AdStudioService) ImportUnpublishedImageTrends(ctx context.Context, dir string, dryRun bool) (TrendsImageImportResult, error) {
	var out TrendsImageImportResult
	root := strings.TrimSpace(dir)
	if root == "" {
		return out, fmt.Errorf("import dir is required")
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return out, fmt.Errorf("import dir: %w", err)
	}
	entries, err := os.ReadDir(abs)
	if err != nil {
		return out, fmt.Errorf("read import dir: %w", err)
	}

	jsonNames := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() || !strings.EqualFold(filepath.Ext(e.Name()), ".json") {
			continue
		}
		jsonNames = append(jsonNames, e.Name())
	}
	sort.Strings(jsonNames)
	if len(jsonNames) == 0 {
		return out, fmt.Errorf("no json files in %s", abs)
	}

	usedTitles := map[string]bool{}
	items := make([]trendsImageImportItem, 0, len(jsonNames))
	for _, name := range jsonNames {
		item, skip, err := parseTrendsImageImportFile(abs, name, usedTitles)
		if err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: %s", name, err.Error()))
			continue
		}
		if skip {
			out.Skipped++
			continue
		}
		items = append(items, item)
	}

	existing, err := s.repo.List(ctx, model.AdStudioCatalogTrends, "", false)
	if err != nil {
		return out, err
	}
	byTitle := make(map[string]model.AdStudioTemplate, len(existing))
	maxOrder := 0
	for _, t := range existing {
		byTitle[strings.ToLower(strings.TrimSpace(t.Title))] = t
		if t.SortOrder > maxOrder {
			maxOrder = t.SortOrder
		}
	}
	nextOrder := maxOrder + 10

	for _, item := range items {
		if err := ctx.Err(); err != nil {
			return out, err
		}
		current, found := byTitle[strings.ToLower(item.title)]
		if found {
			if strings.TrimSpace(current.PreviewS3Key) != "" {
				out.Skipped++
				continue
			}
			if dryRun {
				out.PreviewFilled++
				continue
			}
			if err := s.uploadTrendsImportPreview(ctx, current.ID, item.previewPath, filepath.Base(item.previewPath), ""); err != nil {
				out.Failed++
				out.Errors = append(out.Errors, fmt.Sprintf("%s: preview: %s", item.jsonName, err.Error()))
				continue
			}
			out.PreviewFilled++
			continue
		}
		if dryRun {
			out.Created++
			continue
		}
		published := false
		requiresProduct := false
		requiresAvatar := false
		order := item.sortOrder
		if order <= 0 {
			order = nextOrder
			nextOrder += 10
		}
		created, err := s.CreateAdmin(ctx, model.AdStudioTemplateWriteRequest{
			Title:           item.title,
			Catalog:         model.AdStudioCatalogTrends,
			Category:        item.category,
			GenerationMode:  model.AdStudioModeTextToImage,
			AspectRatio:     item.ratio,
			SystemPrompt:    item.prompt,
			RequiresProduct: &requiresProduct,
			RequiresAvatar:  &requiresAvatar,
			SortOrder:       &order,
			IsPublished:     &published,
		})
		if err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: create: %s", item.jsonName, err.Error()))
			continue
		}
		byTitle[strings.ToLower(item.title)] = model.AdStudioTemplate{ID: created.ID, Title: created.Title}
		if err := s.uploadTrendsImportPreview(ctx, created.ID, item.previewPath, filepath.Base(item.previewPath), ""); err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: preview: %s", item.jsonName, err.Error()))
			continue
		}
		out.Created++
	}
	return out, nil
}

func (s *AdStudioService) uploadTrendsImportPreview(ctx context.Context, id, path, filename, contentType string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if filename == "" {
		filename = filepath.Base(path)
	}
	_, err = s.UploadPreviewFromBytes(ctx, id, data, filename, contentType)
	return err
}

func (s *AdStudioService) uploadTrendsImportPreviewBytes(ctx context.Context, id string, data []byte, filename, contentType string) error {
	_, err := s.UploadPreviewFromBytes(ctx, id, data, filename, contentType)
	return err
}

func optimizeTrendVideoFile(path, filename string) ([]byte, int64, int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, 0, 0, err
	}
	optimized, err := transcodeTrendVideoTo960(data, filename)
	if err != nil {
		return nil, int64(len(data)), 0, err
	}
	return optimized, int64(len(data)), int64(len(optimized)), nil
}

func transcodeTrendVideoTo960(data []byte, filename string) ([]byte, error) {
	dir, err := os.MkdirTemp("", "postilka-trend-video-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		ext = ".mp4"
	}
	inPath := filepath.Join(dir, "input"+ext)
	outPath := filepath.Join(dir, "output.mp4")
	if err := os.WriteFile(inPath, data, 0o600); err != nil {
		return nil, err
	}
	cmd := exec.Command("ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
		"-i", inPath, "-map", "0:v:0", "-map", "0:a:0?",
		"-vf", "scale=960:960:force_original_aspect_ratio=decrease,fps=30",
		"-c:v", "libx264", "-preset", "medium", "-crf", "29",
		"-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
		"-movflags", "+faststart", outPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg: %w: %s", err, strings.TrimSpace(string(output)))
	}
	optimized, err := os.ReadFile(outPath)
	if err != nil {
		return nil, err
	}
	if len(optimized) == 0 {
		return nil, fmt.Errorf("ffmpeg returned empty file")
	}
	return optimized, nil
}

func parseTrendsImageImportFile(root, name string, usedTitles map[string]bool) (trendsImageImportItem, bool, error) {
	raw, err := os.ReadFile(filepath.Join(root, name))
	if err != nil {
		return trendsImageImportItem{}, false, err
	}
	var meta syntxTrendImageMeta
	if err := json.Unmarshal(raw, &meta); err != nil {
		return trendsImageImportItem{}, false, err
	}
	kind := strings.ToLower(strings.TrimSpace(meta.GenerationType))
	if kind != "" && kind != "image" {
		return trendsImageImportItem{}, true, nil
	}
	prompt := strings.TrimSpace(meta.Prompt)
	if prompt == "" {
		return trendsImageImportItem{}, false, fmt.Errorf("empty prompt")
	}
	previewRel := strings.TrimSpace(meta.Files.PostilkaPreview)
	if previewRel == "" {
		previewRel = filepath.Join("postilka-preview", strings.TrimSuffix(name, filepath.Ext(name))+".webp")
	}
	previewPath := filepath.Join(root, filepath.FromSlash(previewRel))
	if _, err := os.Stat(previewPath); err != nil {
		return trendsImageImportItem{}, false, fmt.Errorf("preview not found: %s", previewRel)
	}
	category, err := trendsCategoryFromSyntx(meta)
	if err != nil {
		return trendsImageImportItem{}, false, err
	}
	ratio := strings.TrimSpace(meta.GenerationSettings.AspectRatio)
	if ratio == "" {
		ratio = defaultAdStudioRatio(category, model.AdStudioMediaImage)
	} else {
		ratio = normalizeAdStudioImageRatio(ratio)
	}
	title := uniqueTrendsImportTitle(meta.Title, meta.Slug, meta.ID, usedTitles)
	return trendsImageImportItem{
		jsonName:    name,
		title:       title,
		ratio:       ratio,
		prompt:      prompt,
		category:    category,
		previewPath: previewPath,
		sortOrder:   trendsImportSortOrder(name),
	}, false, nil
}

func trendsCategoryFromSyntx(meta syntxTrendImageMeta) (string, error) {
	for _, c := range meta.Categories {
		slug := strings.TrimSpace(c.Slug)
		if model.IsAdTrendsCategory(slug) {
			return slug, nil
		}
	}
	return "", fmt.Errorf("no known trends category")
}

func trendsImportSortOrder(name string) int {
	n := 0
	for _, r := range name {
		if r < '0' || r > '9' {
			break
		}
		n = n*10 + int(r-'0')
	}
	return n
}

func uniqueTrendsImportTitle(title, slug, id string, used map[string]bool) string {
	base := strings.TrimSpace(title)
	if base == "" {
		base = strings.TrimSpace(slug)
	}
	if base == "" {
		base = strings.TrimSpace(id)
	}
	if base == "" {
		base = "Untitled"
	}
	candidate := truncateRunes(base, 200)
	if !used[strings.ToLower(candidate)] {
		used[strings.ToLower(candidate)] = true
		return candidate
	}
	suffix := strings.TrimSpace(slug)
	if suffix == "" {
		suffix = strings.TrimSpace(id)
	}
	if suffix != "" {
		candidate = truncateRunes(base+" ("+suffix+")", 200)
		if !used[strings.ToLower(candidate)] {
			used[strings.ToLower(candidate)] = true
			return candidate
		}
	}
	for i := 2; i < 1000; i++ {
		candidate = truncateRunes(fmt.Sprintf("%s (%d)", base, i), 200)
		if !used[strings.ToLower(candidate)] {
			used[strings.ToLower(candidate)] = true
			return candidate
		}
	}
	used[strings.ToLower(candidate)] = true
	return candidate
}
