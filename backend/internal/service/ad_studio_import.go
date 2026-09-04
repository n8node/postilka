package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

type TrendsImageImportResult struct {
	Created       int      `json:"created"`
	PreviewFilled int      `json:"preview_filled"`
	Skipped       int      `json:"skipped"`
	Failed        int      `json:"failed"`
	Errors        []string `json:"errors,omitempty"`
}

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
			if err := s.uploadTrendsImportPreview(ctx, current.ID, item.previewPath); err != nil {
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
		order := nextOrder
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
		nextOrder += 10
		byTitle[strings.ToLower(item.title)] = model.AdStudioTemplate{ID: created.ID, Title: created.Title}
		if err := s.uploadTrendsImportPreview(ctx, created.ID, item.previewPath); err != nil {
			out.Failed++
			out.Errors = append(out.Errors, fmt.Sprintf("%s: preview: %s", item.jsonName, err.Error()))
			continue
		}
		out.Created++
	}
	return out, nil
}

func (s *AdStudioService) uploadTrendsImportPreview(ctx context.Context, id, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	_, err = s.UploadPreviewFromBytes(ctx, id, data, filepath.Base(path), "")
	return err
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
