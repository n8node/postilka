package model

import "testing"

func TestToCatalogViewUsesPublicPreviewPaths(t *testing.T) {
	tpl := AdStudioTemplate{
		ID:                 "tpl-1",
		PreviewS3Key:       "postilka/ad-studio/previews/x.mp4",
		PreviewContentType: "video/mp4",
	}
	view := tpl.ToCatalogView()
	if view.PreviewURL != "/public/ad-studio/templates/tpl-1/preview" {
		t.Fatalf("preview url = %q", view.PreviewURL)
	}
	if view.PreviewSourceURL != "/public/ad-studio/templates/tpl-1/preview/source" {
		t.Fatalf("source url = %q", view.PreviewSourceURL)
	}

	cabinet := tpl.ToPublicView()
	if cabinet.PreviewURL != "/ad-studio/templates/tpl-1/preview" {
		t.Fatalf("cabinet preview url = %q", cabinet.PreviewURL)
	}
}

func TestVisibleAdStudioCategoriesSkipsHidden(t *testing.T) {
	got := VisibleAdStudioCategories([]string{"motion", "posters"})
	ids := make([]string, 0, len(got))
	for _, item := range got {
		ids = append(ids, item.ID)
	}
	for _, hidden := range []string{"motion", "posters"} {
		for _, id := range ids {
			if id == hidden {
				t.Fatalf("hidden category %q still visible", hidden)
			}
		}
	}
	if len(ids) != len(AdStudioCategories)-2 {
		t.Fatalf("got %d categories, want %d", len(ids), len(AdStudioCategories)-2)
	}
}
