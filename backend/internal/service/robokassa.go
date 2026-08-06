package service

import (
	"crypto/md5"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const robokassaJWSCertURL = "https://docs.robokassa.ru/media/files/jwtsign.cer"

var (
	errRobokassaJWSToken       = errors.New("invalid robokassa jws token")
	errRobokassaJWSState       = errors.New("robokassa payment state is not OK")
	errRobokassaJWSVerify      = errors.New("robokassa jws signature verification failed")
	errRobokassaJWSUnsupported = errors.New("unsupported robokassa jws algorithm")
)

type RobokassaResult2Notification struct {
	Shop          string
	OpKey         string
	InvID         string
	IncSum        string
	PaymentMethod string
	State         string
}

type robokassaJWSClaims struct {
	Data struct {
		Shop          string `json:"shop"`
		OpKey         string `json:"opKey"`
		InvID         string `json:"invId"`
		PaymentMethod string `json:"paymentMethod"`
		IncSum        string `json:"incSum"`
		State         string `json:"state"`
	} `json:"data"`
}

var (
	robokassaJWSCertOnce sync.Once
	robokassaJWSCert     *x509.Certificate
	robokassaJWSCertErr  error
)

func BuildRobokassaPaymentSignature(merchantLogin, outSum, invID, password1, resultURL2 string) string {
	login := strings.TrimSpace(merchantLogin)
	sum := strings.TrimSpace(outSum)
	inv := strings.TrimSpace(invID)
	pass := strings.TrimSpace(password1)

	var base string
	if encoded := strings.TrimSpace(resultURL2); encoded != "" {
		base = strings.Join([]string{login, sum, inv, encoded, pass}, ":")
	} else {
		base = strings.Join([]string{login, sum, inv, pass}, ":")
	}
	return fmt.Sprintf("%x", md5.Sum([]byte(base)))
}

func VerifyRobokassaResultSignature(outSum, invID, signature, password2 string) bool {
	expected := strings.ToUpper(fmt.Sprintf("%x", md5.Sum([]byte(
		strings.TrimSpace(outSum)+":"+strings.TrimSpace(invID)+":"+strings.TrimSpace(password2),
	))))
	return strings.EqualFold(signature, expected)
}

func ParseRobokassaResult2Token(token string) (*RobokassaResult2Notification, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errRobokassaJWSToken
	}

	claims, err := decodeRobokassaJWSPayload(token)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(claims.Data.State) != "OK" {
		return nil, errRobokassaJWSState
	}
	if strings.TrimSpace(claims.Data.InvID) == "" {
		return nil, errRobokassaJWSToken
	}

	return &RobokassaResult2Notification{
		Shop:          strings.TrimSpace(claims.Data.Shop),
		OpKey:         strings.TrimSpace(claims.Data.OpKey),
		InvID:         strings.TrimSpace(claims.Data.InvID),
		IncSum:        strings.TrimSpace(claims.Data.IncSum),
		PaymentMethod: strings.TrimSpace(claims.Data.PaymentMethod),
		State:         strings.TrimSpace(claims.Data.State),
	}, nil
}

func decodeRobokassaJWSPayload(token string) (*robokassaJWSClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errRobokassaJWSToken
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errRobokassaJWSToken, err)
	}

	var claims robokassaJWSClaims
	if err := json.Unmarshal(payloadJSON, &claims); err != nil {
		return nil, fmt.Errorf("%w: %v", errRobokassaJWSToken, err)
	}
	return &claims, nil
}

func VerifyRobokassaResult2Token(token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return errRobokassaJWSToken
	}

	cert, err := loadRobokassaJWSCert()
	if err != nil {
		return err
	}

	pubKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return errRobokassaJWSVerify
	}

	parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("%w: %s", errRobokassaJWSUnsupported, t.Method.Alg())
		}
		return pubKey, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}))
	if err != nil {
		return fmt.Errorf("%w: %v", errRobokassaJWSVerify, err)
	}
	if !parsed.Valid {
		return errRobokassaJWSVerify
	}
	return nil
}

func loadRobokassaJWSCert() (*x509.Certificate, error) {
	robokassaJWSCertOnce.Do(func() {
		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Get(robokassaJWSCertURL)
		if err != nil {
			robokassaJWSCertErr = err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			robokassaJWSCertErr = fmt.Errorf("robokassa jws cert: status %d", resp.StatusCode)
			return
		}

		body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		if err != nil {
			robokassaJWSCertErr = err
			return
		}

		block, _ := pem.Decode(body)
		if block != nil {
			robokassaJWSCert, robokassaJWSCertErr = x509.ParseCertificate(block.Bytes)
			return
		}

		robokassaJWSCert, robokassaJWSCertErr = x509.ParseCertificate(body)
	})
	return robokassaJWSCert, robokassaJWSCertErr
}

func FormatRubOutSum(amountCents int) string {
	rub := float64(amountCents) / 100.0
	return fmt.Sprintf("%.2f", rub)
}

func VerifyRobokassaOutSum(expectedCents int, outSumStr string) error {
	got, err := parseRubToCents(outSumStr)
	if err != nil {
		return ErrInvalidInput
	}
	if got != expectedCents {
		return ErrInvalidInput
	}
	return nil
}

func parseRubToCents(outSumStr string) (int, error) {
	var rub float64
	if _, err := fmt.Sscanf(strings.TrimSpace(outSumStr), "%f", &rub); err != nil {
		return 0, err
	}
	return int(rub*100 + 0.5), nil
}
