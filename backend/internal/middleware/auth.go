package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

type Auth struct {
	jwtSecret []byte
}

func NewAuth(jwtSecret string) *Auth {
	return &Auth{jwtSecret: []byte(jwtSecret)}
}

type claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func (a *Auth) Required(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" {
			writeUnauthorized(w)
			return
		}
		c, err := a.parse(token)
		if err != nil {
			writeUnauthorized(w)
			return
		}
		ctx := context.WithValue(r.Context(), UserIDKey, c.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *Auth) parse(token string) (*claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &claims{}, func(t *jwt.Token) (any, error) {
		return a.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*claims)
	if !ok || !parsed.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return c, nil
}

func (a *Auth) IssueToken(userID string, ttl time.Duration) (string, error) {
	now := time.Now()
	c := &claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(a.jwtSecret)
}

const accessTokenCookie = "access_token"

func (a *Auth) SetTokenCookie(w http.ResponseWriter, token string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     accessTokenCookie,
		Value:    token,
		Path:     "/",
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (a *Auth) ClearTokenCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     accessTokenCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func extractToken(r *http.Request) string {
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	if c, err := r.Cookie(accessTokenCookie); err == nil {
		return c.Value
	}
	return ""
}

func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(UserIDKey).(string)
	return id, ok
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":"Не авторизован"}`))
}
