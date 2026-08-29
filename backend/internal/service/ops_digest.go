package service

import (
	"context"
	"errors"
	"html"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/photochka"
	"github.com/postilka/postilka/internal/repository"
)

const (
	opsDigestProbeTimeout     = 8 * time.Second
	opsDigestCollectTimeout   = 50 * time.Second
	opsWorkerHeartbeatStale   = 3 * time.Minute
	opsDigestDefaultHour      = 9
	opsMoscowLocation         = "Europe/Moscow"
)

var moscowLocation = func() *time.Location {
	loc, err := time.LoadLocation(opsMoscowLocation)
	if err != nil {
		return time.FixedZone("MSK", 3*60*60)
	}
	return loc
}()

type OpsDigestService struct {
	telegram   *TelegramService
	settings   *TelegramSettingsService
	opsState   *repository.OpsStateRepository
	posts      *repository.PostRepository
	db         *repository.Postgres
	mail       *MailService
	smtp       *SMTPSettingsService
	storage    *StorageSettingsService
	kie        *KieConfigService
	kieVideo   *KieVideoConfigService
	yandex     *YandexGptConfigService
	social     *SocialProviderSettingsService
	tgProvider *TelegramProviderSettingsService
	cipher     *SecretCipher
	maxClient  *oauthclient.MAXBotClient
	photochka  *photochka.Client
	httpClient *http.Client
	logger     *slog.Logger
}

func NewOpsDigestService(
	telegram *TelegramService,
	settings *TelegramSettingsService,
	opsState *repository.OpsStateRepository,
	posts *repository.PostRepository,
	db *repository.Postgres,
	mail *MailService,
	smtp *SMTPSettingsService,
	storage *StorageSettingsService,
	kie *KieConfigService,
	kieVideo *KieVideoConfigService,
	yandex *YandexGptConfigService,
	social *SocialProviderSettingsService,
	tgProvider *TelegramProviderSettingsService,
	cipher *SecretCipher,
	photochkaClient *photochka.Client,
	logger *slog.Logger,
) *OpsDigestService {
	if logger == nil {
		logger = slog.Default()
	}
	return &OpsDigestService{
		telegram:   telegram,
		settings:   settings,
		opsState:   opsState,
		posts:      posts,
		db:         db,
		mail:       mail,
		smtp:       smtp,
		storage:    storage,
		kie:        kie,
		kieVideo:   kieVideo,
		yandex:     yandex,
		social:     social,
		tgProvider: tgProvider,
		cipher:     cipher,
		maxClient:  oauthclient.NewMAXBotClient(),
		photochka:  photochkaClient,
		httpClient: &http.Client{
			Timeout: opsDigestProbeTimeout,
		},
		logger: logger,
	}
}

func (s *OpsDigestService) TouchWorkerHeartbeat(ctx context.Context) error {
	if s == nil || s.opsState == nil {
		return nil
	}
	return s.opsState.TouchWorkerHeartbeat(ctx)
}

func (s *OpsDigestService) ProcessDue(ctx context.Context) error {
	if s == nil || s.settings == nil {
		return nil
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return err
	}
	model.NormalizeTelegramDigestSettings(&cfg)
	if !cfg.DigestEnabled {
		return nil
	}
	now := time.Now().In(moscowLocation)
	hour := cfg.DigestHour
	if hour < 0 || hour > 23 {
		hour = opsDigestDefaultHour
	}
	if now.Hour() < hour {
		return nil
	}
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	claimed, err := s.opsState.TryClaimDigest(ctx, day)
	if err != nil {
		return err
	}
	if !claimed {
		return nil
	}
	if err := s.sendNow(ctx, cfg); err != nil {
		if clearErr := s.opsState.ClearDigestClaim(ctx, day); clearErr != nil {
			s.logger.Warn("ops digest: clear claim failed", "err", clearErr)
		}
		return err
	}
	s.logger.Info("ops digest sent", "chat_id", cfg.DigestChatID, "topic_id", cfg.DigestTopicID)
	return nil
}

func (s *OpsDigestService) SendNow(ctx context.Context) (bool, string) {
	if s == nil || s.settings == nil || s.telegram == nil {
		return false, "Сервис сводки недоступен"
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	model.NormalizeTelegramDigestSettings(&cfg)
	if strings.TrimSpace(cfg.BotToken) == "" {
		return false, "Укажите токен бота"
	}
	if strings.TrimSpace(cfg.DigestChatID) == "" || cfg.DigestTopicID <= 0 {
		return false, "Укажите ID группы и ID темы для сводки"
	}
	if err := s.sendNow(ctx, cfg); err != nil {
		return false, sanitizeOpsReason(err.Error())
	}
	return true, "Сводка отправлена в указанную тему"
}

func (s *OpsDigestService) sendNow(ctx context.Context, cfg model.TelegramSettings) error {
	checks := s.collect(ctx)
	text := formatOpsDigestMessage(time.Now().In(moscowLocation), checks)
	return s.telegram.SendDigestMessage(ctx, cfg.DigestChatID, text, cfg.DigestTopicID)
}

func (s *OpsDigestService) collect(ctx context.Context) []model.OpsCheck {
	ctx, cancel := context.WithTimeout(ctx, opsDigestCollectTimeout)
	defer cancel()

	type job struct {
		fn func(context.Context) model.OpsCheck
	}
	jobs := []job{
		{s.probeTelegramProxy},
		{s.probeTelegramBot},
		{s.probeMAXBot},
		{s.probeImageGen},
		{s.probeVideoGen},
		{s.probeTextGen},
		{s.probeRegistration},
		{s.probeProcesses},
		{s.probeCalendar},
		{s.probeDisk},
		{s.probeSMTP},
		{s.probeTelegramSocial},
		{s.probeTelegramBusiness},
		{s.probeVK},
		{s.probeYouTube},
		{s.probePhotochka},
		{s.probeDzen},
	}

	out := make([]model.OpsCheck, len(jobs))
	var wg sync.WaitGroup
	for i, j := range jobs {
		wg.Add(1)
		go func(i int, fn func(context.Context) model.OpsCheck) {
			defer wg.Done()
			probeCtx, probeCancel := context.WithTimeout(ctx, opsDigestProbeTimeout)
			defer probeCancel()
			out[i] = fn(probeCtx)
		}(i, j.fn)
	}
	wg.Wait()
	return out
}

func (s *OpsDigestService) probeTelegramProxy(ctx context.Context) model.OpsCheck {
	check := systemCheck("telegram_proxy", "Телеграм прокси")
	if s.telegram == nil || s.settings == nil {
		return skipCheck(check, "недоступно")
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if !cfg.ProxyEnabled {
		return skipCheck(check, "выключен")
	}
	if err := s.telegram.ProbeBotAPI(ctx); err != nil {
		return failCheck(check, errors.New("нет связи"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeTelegramBot(ctx context.Context) model.OpsCheck {
	check := systemCheck("telegram_bot", "Телеграм бот")
	if s.telegram == nil || s.settings == nil {
		return skipCheck(check, "недоступно")
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if strings.TrimSpace(cfg.BotToken) == "" {
		return skipCheck(check, "не настроено")
	}
	if err := s.telegram.ProbeBotAPI(ctx); err != nil {
		return failCheck(check, errors.New("недоступен"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeMAXBot(ctx context.Context) model.OpsCheck {
	check := systemCheck("max_bot", "Макс бот")
	if s.social == nil || s.cipher == nil || s.maxClient == nil {
		return skipCheck(check, "недоступно")
	}
	token, _, err := s.social.ResolveMAXPlatformBotToken(ctx, s.cipher)
	if err != nil {
		if errors.Is(err, ErrMAXPlatformBotNotConfigured) {
			return skipCheck(check, "не настроено")
		}
		return failCheck(check, err)
	}
	if _, err := s.maxClient.GetMe(ctx, token); err != nil {
		return failCheck(check, err)
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeImageGen(ctx context.Context) model.OpsCheck {
	check := systemCheck("image_gen", "Генератор картинок")
	if s.kie == nil {
		return skipCheck(check, "недоступно")
	}
	result, err := s.kie.TestConnection(ctx, model.KieTestRequest{})
	if err != nil {
		return failCheck(check, err)
	}
	if !result.OK {
		if isNotConfiguredReason(result.Message) {
			return skipCheck(check, "не настроено")
		}
		return failCheck(check, errors.New(result.Message))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeVideoGen(ctx context.Context) model.OpsCheck {
	check := systemCheck("video_gen", "Генератор видео")
	if s.kieVideo == nil {
		return skipCheck(check, "недоступно")
	}
	result, err := s.kieVideo.TestConnection(ctx, model.KieVideoTestRequest{})
	if err != nil {
		return failCheck(check, err)
	}
	if !result.OK {
		if isNotConfiguredReason(result.Message) {
			return skipCheck(check, "не настроено")
		}
		return failCheck(check, errors.New(result.Message))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeTextGen(ctx context.Context) model.OpsCheck {
	check := systemCheck("text_gen", "Генерация текста")
	if s.yandex == nil {
		return skipCheck(check, "недоступно")
	}
	result, err := s.yandex.TestConnection(ctx, model.YandexGptTestRequest{})
	if err != nil {
		return failCheck(check, err)
	}
	if result == nil {
		return failCheck(check, errors.New("нет ответа"))
	}
	if !result.OK {
		if isNotConfiguredReason(result.Message) {
			return skipCheck(check, "не настроено")
		}
		return failCheck(check, errors.New(result.Message))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeRegistration(ctx context.Context) model.OpsCheck {
	check := systemCheck("registration", "Регистрация")
	if s.db != nil {
		if err := s.db.Ping(ctx); err != nil {
			return failCheck(check, errors.New("нет связи с базой"))
		}
	}
	if s.smtp == nil {
		return okCheck(check)
	}
	cfg, err := s.smtp.GetEffective(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if !cfg.Enabled {
		return okCheck(check)
	}
	if s.mail == nil {
		return okCheck(check)
	}
	if err := s.mail.Probe(ctx); err != nil {
		return failCheck(check, errors.New("почта недоступна"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeProcesses(ctx context.Context) model.OpsCheck {
	check := systemCheck("processes", "Процессы")
	if s.opsState == nil {
		return skipCheck(check, "недоступно")
	}
	at, err := s.opsState.WorkerHeartbeatAt(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if at == nil {
		return warnCheck(check, "нет сигнала")
	}
	age := time.Since(at.UTC())
	if age > opsWorkerHeartbeatStale {
		return warnCheck(check, "нет сигнала")
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeCalendar(ctx context.Context) model.OpsCheck {
	check := systemCheck("calendar", "Календарь")
	if s.posts == nil {
		return skipCheck(check, "недоступно")
	}
	n, err := s.posts.CountPublishBacklog(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if n > 0 {
		return warnCheck(check, "очередь задержана")
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeDisk(ctx context.Context) model.OpsCheck {
	check := systemCheck("disk", "Диск")
	if s.storage == nil {
		return skipCheck(check, "недоступно")
	}
	result, err := s.storage.TestConnection(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if result == nil {
		return failCheck(check, errors.New("нет ответа"))
	}
	if !result.OK {
		if isNotConfiguredReason(result.Message) {
			return skipCheck(check, "не настроено")
		}
		return failCheck(check, errors.New("нет связи"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeSMTP(ctx context.Context) model.OpsCheck {
	check := systemCheck("smtp", "SMTP")
	if s.smtp == nil || s.mail == nil {
		return skipCheck(check, "недоступно")
	}
	cfg, err := s.smtp.GetEffective(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if !cfg.Enabled || strings.TrimSpace(cfg.Host) == "" {
		return skipCheck(check, "не настроено")
	}
	if err := s.mail.Probe(ctx); err != nil {
		if errors.Is(err, ErrEmailDisabled) || errors.Is(err, ErrSMTPNotConfigured) {
			return skipCheck(check, "не настроено")
		}
		return failCheck(check, errors.New("нет связи"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeTelegramSocial(ctx context.Context) model.OpsCheck {
	return s.probeTelegramChannelProvider(ctx, "telegram", "Telegram", func(cfg model.TelegramProviderSettings) bool {
		return cfg.Enabled
	})
}

func (s *OpsDigestService) probeTelegramBusiness(ctx context.Context) model.OpsCheck {
	return s.probeTelegramChannelProvider(ctx, "telegram_business", "Telegram Business", func(cfg model.TelegramProviderSettings) bool {
		return cfg.Enabled && cfg.BusinessStoriesEnabled
	})
}

func (s *OpsDigestService) probeTelegramChannelProvider(
	ctx context.Context,
	key, label string,
	enabled func(model.TelegramProviderSettings) bool,
) model.OpsCheck {
	check := socialCheck(key, label)
	if s.tgProvider == nil {
		return skipCheck(check, "недоступно")
	}
	cfg, err := s.tgProvider.GetEffective(ctx)
	if err != nil {
		return failCheck(check, err)
	}
	if !enabled(cfg) {
		return skipCheck(check, "не настроено")
	}
	if err := s.pingURL(ctx, "https://api.telegram.org"); err != nil {
		return failCheck(check, errors.New("нет связи"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeVK(ctx context.Context) model.OpsCheck {
	return s.probeSocialHTTP(ctx, "vk", "ВКонтакте", model.SocialProviderVK, "https://api.vk.com/method/utils.getServerTime?v=5.199")
}

func (s *OpsDigestService) probeYouTube(ctx context.Context) model.OpsCheck {
	return s.probeSocialHTTP(ctx, "youtube", "YouTube", model.SocialProviderYouTube, "https://www.googleapis.com/generate_204")
}

func (s *OpsDigestService) probeDzen(ctx context.Context) model.OpsCheck {
	return s.probeSocialHTTP(ctx, "dzen", "Дзен", model.SocialProviderDzen, "https://oauth.yandex.ru/")
}

func (s *OpsDigestService) probePhotochka(ctx context.Context) model.OpsCheck {
	check := socialCheck("photochka", "Photochka")
	if s.photochka == nil {
		return skipCheck(check, "недоступно")
	}
	url := photochka.PublicAPIBaseURL(s.photochka.IntegrationBaseURL())
	if strings.TrimSpace(url) == "" {
		url = "https://photochka.ru/api/v1"
	}
	if err := s.pingURL(ctx, url+"/"); err != nil {
		return failCheck(check, errors.New("нет связи"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) probeSocialHTTP(
	ctx context.Context,
	key, label string,
	provider model.SocialProvider,
	url string,
) model.OpsCheck {
	check := socialCheck(key, label)
	if s.social == nil {
		return skipCheck(check, "недоступно")
	}
	cfg, err := s.social.GetEffective(ctx, provider)
	if err != nil {
		return failCheck(check, err)
	}
	if !cfg.Enabled {
		return skipCheck(check, "не настроено")
	}
	if provider == model.SocialProviderYouTube && strings.TrimSpace(cfg.OAuthClientID) == "" {
		return skipCheck(check, "не настроено")
	}
	if provider == model.SocialProviderDzen && provider.ConnectFlow() == "oauth" && strings.TrimSpace(cfg.OAuthClientID) == "" {
		return skipCheck(check, "не настроено")
	}
	if err := s.pingURL(ctx, url); err != nil {
		return failCheck(check, errors.New("нет связи"))
	}
	return okCheck(check)
}

func (s *OpsDigestService) pingURL(ctx context.Context, rawURL string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return errors.New("server error")
	}
	return nil
}

func systemCheck(key, label string) model.OpsCheck {
	return model.OpsCheck{Key: key, Label: label, Group: model.OpsGroupSystem}
}

func socialCheck(key, label string) model.OpsCheck {
	return model.OpsCheck{Key: key, Label: label, Group: model.OpsGroupSocial}
}

func okCheck(check model.OpsCheck) model.OpsCheck {
	check.Status = model.OpsCheckOK
	return check
}

func warnCheck(check model.OpsCheck, detail string) model.OpsCheck {
	check.Status = model.OpsCheckWarn
	check.Detail = publicOpsDetail(detail)
	return check
}

func skipCheck(check model.OpsCheck, detail string) model.OpsCheck {
	check.Status = model.OpsCheckSkip
	check.Detail = publicOpsDetail(detail)
	return check
}

func failCheck(check model.OpsCheck, err error) model.OpsCheck {
	check.Status = model.OpsCheckFail
	if err != nil {
		check.Detail = publicOpsDetail(err.Error())
	}
	if check.Detail == "" {
		check.Detail = "нет связи"
	}
	return check
}

func isNotConfiguredReason(msg string) bool {
	msg = strings.ToLower(strings.TrimSpace(msg))
	return strings.Contains(msg, "not configured") ||
		strings.Contains(msg, "не задан") ||
		strings.Contains(msg, "укажите") ||
		strings.Contains(msg, "не настроен")
}

func publicOpsDetail(raw string) string {
	raw = sanitizeOpsReason(raw)
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	return raw
}

func sanitizeOpsReason(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	if strings.Contains(lower, "credit") || strings.Contains(lower, "кредит") ||
		strings.Contains(lower, "баланс") || strings.Contains(lower, "wallet") ||
		strings.Contains(lower, "₽") {
		return "нет связи"
	}
	raw = telegramTokenInError.ReplaceAllString(raw, "bot***")
	if idx := strings.Index(raw, "://"); idx >= 0 {
		return "нет связи"
	}
	raw = strings.ReplaceAll(raw, "\n", " ")
	runes := []rune(raw)
	if len(runes) > 80 {
		raw = string(runes[:80])
	}
	return strings.TrimSpace(raw)
}

func formatOpsDigestMessage(now time.Time, checks []model.OpsCheck) string {
	var system, social []model.OpsCheck
	for _, c := range checks {
		if c.Group == model.OpsGroupSocial {
			social = append(social, c)
		} else {
			system = append(system, c)
		}
	}

	lines := []string{
		"🛡 Postilka — сводка",
		now.Format("02.01.2006  15:04") + " МСК",
		"",
		"<b>Система</b>",
	}
	for _, c := range system {
		lines = append(lines, formatOpsCheckLine(c))
	}
	lines = append(lines, "", "────────", "<b>Соцсети</b>")
	for _, c := range social {
		lines = append(lines, formatOpsCheckLine(c))
	}
	lines = append(lines, "", formatOpsGroupSummary("Система", system), formatOpsGroupSummary("Соцсети", social))
	return strings.Join(lines, "\n")
}

func formatOpsCheckLine(c model.OpsCheck) string {
	mark := "❌"
	switch c.Status {
	case model.OpsCheckOK:
		mark = "✅"
	case model.OpsCheckWarn:
		mark = "⚠️"
	case model.OpsCheckSkip:
		mark = "⏸"
	}
	line := mark + " " + c.Label
	if c.Status != model.OpsCheckOK && strings.TrimSpace(c.Detail) != "" {
		line += " — " + html.EscapeString(c.Detail)
	}
	return line
}

func formatOpsGroupSummary(title string, checks []model.OpsCheck) string {
	var ok, warn, fail, skip int
	for _, c := range checks {
		switch c.Status {
		case model.OpsCheckOK:
			ok++
		case model.OpsCheckWarn:
			warn++
		case model.OpsCheckFail:
			fail++
		default:
			skip++
		}
	}
	parts := []string{title + ": " + strconv.Itoa(ok) + " ок"}
	if warn > 0 {
		parts = append(parts, strconv.Itoa(warn)+" предупреждение")
	}
	if fail > 0 {
		parts = append(parts, strconv.Itoa(fail)+" ошибка")
	}
	if skip > 0 {
		parts = append(parts, strconv.Itoa(skip)+" не настроено")
	}
	return strings.Join(parts, ", ")
}
