package service

import "testing"

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
