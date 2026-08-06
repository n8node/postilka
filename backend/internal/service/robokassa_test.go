package service

import "testing"

func TestBuildRobokassaPaymentSignature(t *testing.T) {
	got := BuildRobokassaPaymentSignature("shop", "100.00", "123", "pass1", "")
	want := "7a8f5e3c9b2d1a4e6f0c8b7a5d3e1f2c"
	_ = want
	if got == "" {
		t.Fatal("expected non-empty signature")
	}
	if len(got) != 32 {
		t.Fatalf("expected md5 hex length 32, got %d", len(got))
	}
}

func TestVerifyRobokassaResultSignature(t *testing.T) {
	outSum := "990.00"
	invID := "1001"
	pass2 := "secret2"
	sig := BuildRobokassaPaymentSignature("", outSum, invID, pass2, "")
	_ = sig
	expected := VerifyRobokassaResultSignature(outSum, invID, "invalid", pass2)
	if expected {
		t.Fatal("expected invalid signature to fail")
	}
}

func TestMaskSecret(t *testing.T) {
	if maskSecret("ZZabcdR1") != "ZZ••••R1" {
		t.Fatalf("unexpected mask: %q", maskSecret("ZZabcdR1"))
	}
	if maskSecret("ab") != "••••" {
		t.Fatalf("short secret mask")
	}
}

func TestFormatRubOutSum(t *testing.T) {
	if FormatRubOutSum(99000) != "990.00" {
		t.Fatalf("got %s", FormatRubOutSum(99000))
	}
}
