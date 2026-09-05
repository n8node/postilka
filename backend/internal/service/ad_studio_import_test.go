package service

import (
	"strings"
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestNormalizeAdStudioImageRatio(t *testing.T) {
	cases := map[string]string{
		"3:4":   "3:4",
		"2:3":   "2:3",
		"4:3":   "4:3",
		"4:5":   "4:5",
		"9:16":  "9:16",
		"16:9":  "16:9",
		"1:1":   "1:1",
		"3:2":   "3:2",
		"":      "1:1",
		"auto":  "1:1",
		" 3:4 ": "3:4",
	}
	for in, want := range cases {
		if got := normalizeAdStudioImageRatio(in); got != want {
			t.Fatalf("normalizeAdStudioImageRatio(%q)=%q want %q", in, got, want)
		}
	}
}

func TestUniqueTrendsImportTitle(t *testing.T) {
	used := map[string]bool{}
	first := uniqueTrendsImportTitle("Black & White", "bw-one", "id-1", used)
	second := uniqueTrendsImportTitle("Black & White", "bw-two", "id-2", used)
	if first != "Black & White" {
		t.Fatalf("first title = %q", first)
	}
	if second != "Black & White (bw-two)" {
		t.Fatalf("second title = %q", second)
	}
	third := uniqueTrendsImportTitle("Black & White", "bw-two", "id-3", used)
	if third != "Black & White (2)" {
		t.Fatalf("third title = %q", third)
	}
}

func TestTrendsCategoryFromSyntx(t *testing.T) {
	got, err := trendsCategoryFromSyntx(syntxTrendImageMeta{
		Categories: []syntxTrendCategory{{Slug: "realistic"}, {Slug: "unknown"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got != "realistic" {
		t.Fatalf("category = %q", got)
	}
	if _, err := trendsCategoryFromSyntx(syntxTrendImageMeta{}); err == nil {
		t.Fatal("empty categories should fail")
	}
}

func TestTrendsImportSortOrder(t *testing.T) {
	if got := trendsImportSortOrder("061_climbing_01a0156b.json"); got != 61 {
		t.Fatalf("sort = %d", got)
	}
}

func TestComposeAdStudioPromptUsesSelectedReferences(t *testing.T) {
	base := model.AdStudioTemplate{GenerationMode: model.AdStudioModeCombine}

	cases := []struct {
		name           string
		template       model.AdStudioTemplate
		mustContain    string
		mustNotContain string
	}{
		{
			name:        "product only",
			template:    func() model.AdStudioTemplate { base.RequiresProduct = true; return base }(),
			mustContain: "Image 2 is the PRODUCT reference",
			mustNotContain: "MODEL reference",
		},
		{
			name:        "model only",
			template:    func() model.AdStudioTemplate { base.RequiresProduct = false; base.RequiresAvatar = true; return base }(),
			mustContain: "Image 2 is the MODEL reference",
			mustNotContain: "PRODUCT reference",
		},
		{
			name:        "product and model",
			template:    func() model.AdStudioTemplate { base.RequiresProduct = true; base.RequiresAvatar = true; return base }(),
			mustContain: "image 3 is the MODEL reference",
			mustNotContain: "There are no additional",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := composeAdStudioPrompt(tc.template, model.AdStudioModeCombine, "")
			if !strings.Contains(got, tc.mustContain) {
				t.Fatalf("prompt does not contain %q: %s", tc.mustContain, got)
			}
						if strings.Contains(got, tc.mustNotContain) {
				t.Fatalf("prompt unexpectedly contains %q: %s", tc.mustNotContain, got)
			}
		})
	}
}


