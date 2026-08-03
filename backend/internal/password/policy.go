package password

import (
	"errors"
	"regexp"
	"unicode/utf8"
)

var ErrPolicy = errors.New("password does not meet requirements")

var (
	hasLower   = regexp.MustCompile(`[a-z]`)
	hasUpper   = regexp.MustCompile(`[A-Z]`)
	hasDigit   = regexp.MustCompile(`[0-9]`)
	hasSpecial = regexp.MustCompile(`[^a-zA-Z0-9]`)
)

func Validate(password string) error {
	if utf8.RuneCountInString(password) < 8 {
		return ErrPolicy
	}
	if !hasLower.MatchString(password) {
		return ErrPolicy
	}
	if !hasUpper.MatchString(password) {
		return ErrPolicy
	}
	if !hasDigit.MatchString(password) {
		return ErrPolicy
	}
	if !hasSpecial.MatchString(password) {
		return ErrPolicy
	}
	return nil
}
