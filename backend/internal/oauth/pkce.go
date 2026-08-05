package oauth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

func RandomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func CodeVerifier() (string, error) {
	return RandomToken(32)
}

func CodeChallenge(codeVerifier string) string {
	sum := sha256.Sum256([]byte(codeVerifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func StateToken() (string, error) {
	token, err := RandomToken(32)
	if err != nil {
		return "", err
	}
	if len(token) < 32 {
		return "", fmt.Errorf("state token too short")
	}
	return token, nil
}
