package model

import "time"

type PaymentProvider string

const PaymentProviderRobokassa PaymentProvider = "robokassa"

type RobokassaSettings struct {
	MerchantLogin string `json:"merchant_login"`
	Password1     string `json:"password1"`
	Password2     string `json:"password2"`
	TestMode      bool   `json:"test_mode"`
	Enabled       bool   `json:"enabled"`
}

type PaymentSettings struct {
	ActiveProvider      PaymentProvider   `json:"active_provider"`
	Robokassa           RobokassaSettings `json:"robokassa"`
	WalletTopupMinCents int               `json:"wallet_topup_min_cents"`
	WalletTopupMaxCents int               `json:"wallet_topup_max_cents"`
}

type PaymentSettingsRecord struct {
	Config    PaymentSettings `json:"config"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type RobokassaAdminSettings struct {
	MerchantLogin string `json:"merchant_login"`
	TestMode      bool   `json:"test_mode"`
	Enabled       bool   `json:"enabled"`
}

type PaymentAdminView struct {
	ActiveProvider         PaymentProvider        `json:"active_provider"`
	Robokassa              RobokassaAdminSettings `json:"robokassa"`
	RobokassaPassword1Set  bool                   `json:"robokassa_password1_set"`
	RobokassaPassword1Hint string                 `json:"robokassa_password1_hint,omitempty"`
	RobokassaPassword2Set  bool                   `json:"robokassa_password2_set"`
	RobokassaPassword2Hint string                 `json:"robokassa_password2_hint,omitempty"`
	RobokassaResultURL     string                 `json:"robokassa_result_url"`
	DefaultReturnURL       string                 `json:"default_return_url"`
	WalletTopupMinCents    int                    `json:"wallet_topup_min_cents"`
	WalletTopupMaxCents    int                    `json:"wallet_topup_max_cents"`
	UpdatedAt              time.Time              `json:"updated_at"`
}

type PaymentAdminUpdateRequest struct {
	ActiveProvider       PaymentProvider        `json:"active_provider"`
	Robokassa            RobokassaAdminSettings `json:"robokassa"`
	RobokassaPassword1   string                 `json:"robokassa_password1,omitempty"`
	RobokassaPassword2   string                 `json:"robokassa_password2,omitempty"`
	WalletTopupMinCents  *int                   `json:"wallet_topup_min_cents,omitempty"`
	WalletTopupMaxCents  *int                   `json:"wallet_topup_max_cents,omitempty"`
}

type PaymentTestResult struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

func DefaultPaymentSettings() PaymentSettings {
	return PaymentSettings{
		ActiveProvider:      PaymentProviderRobokassa,
		WalletTopupMinCents: 10000,
		WalletTopupMaxCents: 10000000,
	}
}
