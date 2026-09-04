package service

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/ai"
)

func TestKieVideoPromptOverLimit(t *testing.T) {
	t.Parallel()
	if kieVideoPromptOverLimit(strings.Repeat("a", ai.KieVideoPromptMaxChars)) {
		t.Fatal("exact 7000 chars should be allowed")
	}
	if !kieVideoPromptOverLimit(strings.Repeat("a", ai.KieVideoPromptMaxChars+1)) {
		t.Fatal("7001 chars should be rejected")
	}
	cyrillic := strings.Repeat("я", 4500)
	if utf8.RuneCountInString(cyrillic) != 4500 {
		t.Fatalf("fixture runes = %d", utf8.RuneCountInString(cyrillic))
	}
	if kieVideoPromptOverLimit(cyrillic) {
		t.Fatal("4500 runes should pass MiniMax H3 limit even if byte length exceeds 4000")
	}
}
