package service

import "testing"

func TestSupportAttachmentAllowed(t *testing.T) {
	if !supportAttachmentAllowed("shot.png", "image/png") {
		t.Fatal("png should be allowed")
	}
	if !supportAttachmentAllowed("trace.log", "text/plain") {
		t.Fatal("log should be allowed")
	}
	if supportAttachmentAllowed("run.exe", "application/x-msdownload") {
		t.Fatal("exe should be rejected")
	}
}

func TestSanitizeSupportFilename(t *testing.T) {
	got := sanitizeSupportFilename(`..\..\secret.txt`)
	if got != "secret.txt" {
		t.Fatalf("got %q", got)
	}
}
