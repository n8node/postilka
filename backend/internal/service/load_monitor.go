package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	loadMonitorSettingsKey     = "load_monitor"
	loadMonitorSnapshotEvery   = time.Hour
	loadMonitorRetentionDays   = 30
	loadMonitorDefaultReportHr = 9
	loadMonitorPlanPauseStep   = 3
)

type LoadMonitorService struct {
	settings   *repository.SettingsRepository
	loadRepo   *repository.LoadMonitorRepository
	posts      *repository.PostRepository
	opsState   *repository.OpsStateRepository
	db         *repository.Postgres
	telegram   *TelegramService
	tgSettings *TelegramSettingsService
	env        *config.Config
	logger     *slog.Logger
}

func NewLoadMonitorService(
	settings *repository.SettingsRepository,
	loadRepo *repository.LoadMonitorRepository,
	posts *repository.PostRepository,
	opsState *repository.OpsStateRepository,
	db *repository.Postgres,
	telegram *TelegramService,
	tgSettings *TelegramSettingsService,
	env *config.Config,
	logger *slog.Logger,
) *LoadMonitorService {
	if logger == nil {
		logger = slog.Default()
	}
	return &LoadMonitorService{
		settings: settings, loadRepo: loadRepo, posts: posts,
		opsState: opsState, db: db, telegram: telegram, tgSettings: tgSettings,
		env: env, logger: logger,
	}
}

func (s *LoadMonitorService) GetDashboard(ctx context.Context) (*model.LoadMonitorDashboard, error) {
	cfg, err := s.GetSettings(ctx)
	if err != nil {
		return nil, err
	}
	current, err := s.collectSnapshot(ctx)
	if err != nil {
		return nil, err
	}
	history, err := s.loadRepo.ListDailyAggregates(ctx, 14)
	if err != nil {
		return nil, err
	}
	if history == nil {
		history = []model.LoadDailyAggregate{}
	}
	trend := assessLoadTrend(history, cfg.ServerRAMGB)
	lastAt, _ := s.loadRepo.LatestSnapshotAt(ctx)
	poolMax := 0
	if s.db != nil && s.db.Pool != nil {
		poolMax = int(s.db.Pool.Stat().MaxConns())
	}
	effective := s.GetEffectiveRuntimeTuning(ctx, poolMax)
	recommendations := runtimeTuningRecommendations(cfg.ServerRAMGB)

	dash := &model.LoadMonitorDashboard{
		Settings:           cfg,
		EffectiveTuning:    effective,
		Recommendations:    recommendations,
		Current:            current,
		History:            history,
		Trend:              trend,
		ScalingPlanPath:    "scripts/scaling-plan.md",
		PlanPauseAfterStep: loadMonitorPlanPauseStep,
	}
	if lastAt != nil {
		dash.LastSnapshotAt = lastAt
	}
	if current.WorkerHeartbeatAgeSec != nil {
		age := *current.WorkerHeartbeatAgeSec
		dash.WorkerAgeSec = &age
		dash.WorkerAlive = age <= int(opsWorkerHeartbeatStale.Seconds())
	}
	return dash, nil
}

func (s *LoadMonitorService) GetSettings(ctx context.Context) (model.LoadMonitorSettings, error) {
	out := defaultLoadMonitorSettings()
	if s.settings == nil {
		return out, nil
	}
	raw, err := s.settings.Get(ctx, loadMonitorSettingsKey)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return out, nil
		}
		return out, err
	}
	if strings.TrimSpace(raw) == "" {
		return out, nil
	}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return defaultLoadMonitorSettings(), nil
	}
	normalizeLoadMonitorSettings(&out)
	return out, nil
}

func (s *LoadMonitorService) GetEffectiveRuntimeTuning(ctx context.Context, poolMaxConns int) model.RuntimeTuningEffective {
	cfg, err := s.GetSettings(ctx)
	if err != nil {
		return resolveRuntimeTuning(s.env, defaultLoadMonitorSettings(), poolMaxConns)
	}
	return resolveRuntimeTuning(s.env, cfg, poolMaxConns)
}

func (s *LoadMonitorService) GetStreamingSettings(ctx context.Context) model.StreamingSettings {
	cfg, err := s.GetSettings(ctx)
	if err != nil {
		return defaultLoadMonitorSettings().Streaming
	}
	return cfg.Streaming
}

func (s *LoadMonitorService) UpdateSettings(ctx context.Context, in model.LoadMonitorSettings) (model.LoadMonitorSettings, error) {
	if s.settings == nil {
		return model.LoadMonitorSettings{}, errors.New("settings unavailable")
	}
	normalizeLoadMonitorSettings(&in)
	raw, err := json.Marshal(in)
	if err != nil {
		return model.LoadMonitorSettings{}, err
	}
	if err := s.settings.Set(ctx, loadMonitorSettingsKey, string(raw)); err != nil {
		return model.LoadMonitorSettings{}, err
	}
	return in, nil
}

func (s *LoadMonitorService) ProcessSnapshotIfDue(ctx context.Context) error {
	if s.loadRepo == nil {
		return nil
	}
	last, err := s.loadRepo.LatestSnapshotAt(ctx)
	if err != nil {
		return err
	}
	if last != nil && time.Since(last.UTC()) < loadMonitorSnapshotEvery {
		return nil
	}
	return s.recordSnapshot(ctx)
}

func (s *LoadMonitorService) RecordSnapshotNow(ctx context.Context) error {
	return s.recordSnapshot(ctx)
}

func (s *LoadMonitorService) recordSnapshot(ctx context.Context) error {
	snap, err := s.collectSnapshot(ctx)
	if err != nil {
		return err
	}
	if err := s.loadRepo.InsertSnapshot(ctx, snap); err != nil {
		return err
	}
	_ = s.loadRepo.PruneOlderThan(ctx, loadMonitorRetentionDays)
	return nil
}

func (s *LoadMonitorService) ProcessDailyReport(ctx context.Context) error {
	if s == nil || s.telegram == nil || s.tgSettings == nil || s.opsState == nil {
		return nil
	}
	cfg, err := s.GetSettings(ctx)
	if err != nil {
		return err
	}
	if !cfg.ReportEnabled {
		return nil
	}
	tgCfg, err := s.tgSettings.GetEffective(ctx)
	if err != nil {
		return err
	}
	if !tgCfg.Enabled ||
		strings.TrimSpace(tgCfg.BotToken) == "" ||
		strings.TrimSpace(tgCfg.ChatID) == "" {
		return nil
	}

	now := time.Now().In(moscowLocation)
	hour := cfg.ReportHour
	if hour < 0 || hour > 23 {
		hour = loadMonitorDefaultReportHr
	}
	if now.Hour() < hour {
		return nil
	}
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	claimed, err := s.opsState.TryClaimLoadReport(ctx, day)
	if err != nil {
		return err
	}
	if !claimed {
		return nil
	}
	if err := s.sendDailyReport(ctx, cfg); err != nil {
		if clearErr := s.opsState.ClearLoadReportClaim(ctx, day); clearErr != nil {
			s.logger.Warn("load report: clear claim failed", "err", clearErr)
		}
		return err
	}
	s.logger.Info("load report sent", "chat_id", tgCfg.ChatID)
	return nil
}

func (s *LoadMonitorService) SendReportNow(ctx context.Context) (bool, string) {
	if s == nil || s.telegram == nil || s.tgSettings == nil {
		return false, "Сервис мониторинга недоступен"
	}
	cfg, err := s.GetSettings(ctx)
	if err != nil {
		return false, err.Error()
	}
	tgCfg, err := s.tgSettings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	if !tgCfg.Enabled {
		return false, "Включите Telegram-уведомления в админке"
	}
	if strings.TrimSpace(tgCfg.BotToken) == "" {
		return false, "Укажите токен Telegram-бота"
	}
	if strings.TrimSpace(tgCfg.ChatID) == "" {
		return false, "Укажите ID личного чата (Telegram → уведомления → ID чата)"
	}
	if err := s.sendDailyReport(ctx, cfg); err != nil {
		return false, sanitizeOpsReason(err.Error())
	}
	return true, "Отчёт о нагрузке отправлен в ваш Telegram"
}

func (s *LoadMonitorService) sendDailyReport(ctx context.Context, cfg model.LoadMonitorSettings) error {
	current, err := s.collectSnapshot(ctx)
	if err != nil {
		return err
	}
	history, err := s.loadRepo.ListDailyAggregates(ctx, 14)
	if err != nil {
		return err
	}
	trend := assessLoadTrend(history, cfg.ServerRAMGB)
	text := formatLoadReportMessage(time.Now().In(moscowLocation), current, trend, cfg.ServerRAMGB)
	return s.telegram.SendDirectAdminMessage(ctx, text)
}

func (s *LoadMonitorService) collectSnapshot(ctx context.Context) (model.LoadSnapshot, error) {
	snap := model.LoadSnapshot{CollectedAt: time.Now().UTC()}

	if s.posts != nil {
		if n, err := s.posts.CountPublishBacklog(ctx); err == nil {
			snap.PublishBacklog = n
		}
	}
	if s.loadRepo != nil {
		if n, err := s.loadRepo.CountPostsDueNextHour(ctx); err == nil {
			snap.PostsDueNextHour = n
		}
		if n, err := s.loadRepo.CountActiveGenerationJobs(ctx); err == nil {
			snap.GenJobsActive = n
		}
		if n, err := s.loadRepo.CountRunningWorkflowRuns(ctx); err == nil {
			snap.WorkflowRunsRunning = n
		}
	}
	if s.db != nil && s.db.Pool != nil {
		stat := s.db.Pool.Stat()
		snap.DBPoolMax = int(stat.MaxConns())
		snap.DBPoolAcquired = int(stat.AcquiredConns())
	}
	if s.opsState != nil {
		at, err := s.opsState.WorkerHeartbeatAt(ctx)
		if err == nil && at != nil {
			age := int(time.Since(at.UTC()).Seconds())
			snap.WorkerHeartbeatAgeSec = &age
		}
	}
	return snap, nil
}

func defaultLoadMonitorSettings() model.LoadMonitorSettings {
	return model.LoadMonitorSettings{
		ReportEnabled: true,
		ReportHour:    loadMonitorDefaultReportHr,
		ServerRAMGB:   6,
		Streaming: model.StreamingSettings{
			ImageMaxMB:             50,
			VideoMaxMB:             500,
			ImageUploadConcurrency: 4,
			VideoUploadConcurrency: 2,
			MemoryBudgetMB:         256,
			MultipartPartMB:        8,
		},
	}
}

func normalizeLoadMonitorSettings(cfg *model.LoadMonitorSettings) {
	if cfg == nil {
		return
	}
	if cfg.ReportHour < 0 || cfg.ReportHour > 23 {
		cfg.ReportHour = loadMonitorDefaultReportHr
	}
	if cfg.ServerRAMGB < 1 {
		cfg.ServerRAMGB = 6
	}
	if cfg.ServerRAMGB > 512 {
		cfg.ServerRAMGB = 512
	}
	normalizeRuntimeTuningSettings(&cfg.RuntimeTuning)
	if cfg.Streaming.ImageMaxMB <= 0 {
		cfg.Streaming.ImageMaxMB = 50
	}
	if cfg.Streaming.ImageMaxMB > 200 {
		cfg.Streaming.ImageMaxMB = 200
	}
	if cfg.Streaming.VideoMaxMB <= 0 {
		cfg.Streaming.VideoMaxMB = 500
	}
	if cfg.Streaming.VideoMaxMB > 2048 {
		cfg.Streaming.VideoMaxMB = 2048
	}
	if cfg.Streaming.ImageUploadConcurrency <= 0 {
		cfg.Streaming.ImageUploadConcurrency = 4
	}
	if cfg.Streaming.ImageUploadConcurrency > 32 {
		cfg.Streaming.ImageUploadConcurrency = 32
	}
	if cfg.Streaming.VideoUploadConcurrency <= 0 {
		cfg.Streaming.VideoUploadConcurrency = 2
	}
	if cfg.Streaming.VideoUploadConcurrency > 16 {
		cfg.Streaming.VideoUploadConcurrency = 16
	}
	if cfg.Streaming.MemoryBudgetMB <= 0 {
		cfg.Streaming.MemoryBudgetMB = 256
	}
	if cfg.Streaming.MemoryBudgetMB > 4096 {
		cfg.Streaming.MemoryBudgetMB = 4096
	}
	if cfg.Streaming.MultipartPartMB < 5 {
		cfg.Streaming.MultipartPartMB = 8
	}
	if cfg.Streaming.MultipartPartMB > 64 {
		cfg.Streaming.MultipartPartMB = 64
	}
}

func assessLoadTrend(history []model.LoadDailyAggregate, serverRAMGB int) model.LoadTrendAssessment {
	out := model.LoadTrendAssessment{
		Level:     model.LoadTrendStable,
		Summary:   "Нагрузка стабильна, резкого роста не видно.",
		RAMAdvice: ramAdviceForLevel(model.LoadTrendStable, serverRAMGB),
		Signals:   []string{},
	}
	if len(history) < 4 {
		out.Summary = "Мало данных для тренда — нужно несколько дней снимков."
		out.RAMAdvice = fmt.Sprintf("Сейчас на сервере указано %d ГБ. Продолжайте собирать статистику.", serverRAMGB)
		return out
	}

	recent := history
	if len(recent) > 7 {
		recent = recent[len(recent)-7:]
	}
	older := history
	if len(older) > 7 {
		older = older[:len(older)-len(recent)]
	}

	avgRecentBacklog := avgDailyFloat(recent, func(d model.LoadDailyAggregate) float64 { return d.AvgPublishBacklog })
	avgOlderBacklog := avgDailyFloat(older, func(d model.LoadDailyAggregate) float64 { return d.AvgPublishBacklog })
	maxRecentBacklog := maxDailyInt(recent, func(d model.LoadDailyAggregate) int { return d.MaxPublishBacklog })

	avgRecentGen := avgDailyFloat(recent, func(d model.LoadDailyAggregate) float64 { return d.AvgGenJobsActive })
	avgOlderGen := avgDailyFloat(older, func(d model.LoadDailyAggregate) float64 { return d.AvgGenJobsActive })

	avgRecentPool := avgDailyFloat(recent, func(d model.LoadDailyAggregate) float64 { return d.AvgDBPoolUtil })

	level := model.LoadTrendStable
	var signals []string

	if avgOlderBacklog > 0 && avgRecentBacklog >= avgOlderBacklog*1.5 && maxRecentBacklog >= 5 {
		level = model.LoadTrendWatch
		signals = append(signals, fmt.Sprintf("очередь публикаций выросла (с %.1f до %.1f в среднем)", avgOlderBacklog, avgRecentBacklog))
	}
	if avgOlderBacklog == 0 && avgRecentBacklog >= 3 {
		level = model.LoadTrendWatch
		signals = append(signals, "появилась устойчивая очередь публикаций")
	}
	if avgOlderGen > 0 && avgRecentGen >= avgOlderGen*1.5 && avgRecentGen >= 3 {
		if level == model.LoadTrendStable {
			level = model.LoadTrendWatch
		}
		signals = append(signals, fmt.Sprintf("генераций в работе стало больше (с %.1f до %.1f)", avgOlderGen, avgRecentGen))
	}
	if avgRecentPool >= 0.75 {
		level = model.LoadTrendGrowing
		signals = append(signals, fmt.Sprintf("база данных часто загружена (%.0f%% соединений)", avgRecentPool*100))
	}
	if maxRecentBacklog >= 20 {
		level = model.LoadTrendGrowing
		signals = append(signals, fmt.Sprintf("пик очереди публикаций: %d постов", maxRecentBacklog))
	}
	if avgRecentGen >= 15 {
		if level != model.LoadTrendGrowing {
			level = model.LoadTrendWatch
		}
		signals = append(signals, fmt.Sprintf("много генераций одновременно (в среднем %.0f)", avgRecentGen))
	}

	out.Signals = signals
	out.Level = level
	switch level {
	case model.LoadTrendGrowing:
		out.Summary = "Есть явная тенденция к росту нагрузки — пора готовиться к масштабированию."
	case model.LoadTrendWatch:
		out.Summary = "Нагрузка понемногу растёт — следите за очередями несколько дней."
	default:
		out.Summary = "Нагрузка стабильна, резкого роста не видно."
	}
	out.RAMAdvice = ramAdviceForLevel(level, serverRAMGB)
	return out
}

func ramAdviceForLevel(level model.LoadTrendLevel, currentRAM int) string {
	if currentRAM < 1 {
		currentRAM = 6
	}
	target := recommendRAMTarget(currentRAM, level)
	switch level {
	case model.LoadTrendGrowing:
		if target > currentRAM {
			return fmt.Sprintf("Рекомендуем увеличить оперативную память: с %d ГБ до %d ГБ. Параллельно готовьте шаги 2–3 плана масштабирования.", currentRAM, target)
		}
		return "Нагрузка растёт — сначала выполните шаги 2–3 плана (настройки очередей), затем оцените RAM."
	case model.LoadTrendWatch:
		if target > currentRAM {
			return fmt.Sprintf("Пока можно работать на %d ГБ, но при сохранении тренда планируйте апгрейд до %d ГБ.", currentRAM, target)
		}
		return fmt.Sprintf("Текущих %d ГБ пока достаточно. Следите за отчётами ещё 3–5 дней.", currentRAM)
	default:
		return fmt.Sprintf("Текущих %d ГБ оперативки достаточно.", currentRAM)
	}
}

func recommendRAMTarget(currentRAM int, level model.LoadTrendLevel) int {
	if level == model.LoadTrendStable {
		return currentRAM
	}
	switch {
	case currentRAM <= 4:
		return 8
	case currentRAM <= 6:
		return 16
	case currentRAM <= 8:
		return 16
	case currentRAM <= 16:
		return 32
	default:
		return int(math.Ceil(float64(currentRAM) * 1.5))
	}
}

func formatLoadReportMessage(now time.Time, snap model.LoadSnapshot, trend model.LoadTrendAssessment, serverRAMGB int) string {
	workerLine := "⚠️ фоновый процесс — нет сигнала"
	if snap.WorkerHeartbeatAgeSec != nil {
		age := *snap.WorkerHeartbeatAgeSec
		if age <= int(opsWorkerHeartbeatStale.Seconds()) {
			workerLine = fmt.Sprintf("✅ фоновый процесс жив (%d сек назад)", age)
		} else {
			workerLine = "⚠️ фоновый процесс — давно не отвечал"
		}
	}

	poolLine := "—"
	if snap.DBPoolMax > 0 {
		pct := int(float64(snap.DBPoolAcquired) / float64(snap.DBPoolMax) * 100)
		poolLine = fmt.Sprintf("%d/%d (%d%%)", snap.DBPoolAcquired, snap.DBPoolMax, pct)
	}

	lines := []string{
		"📊 Postilka — нагрузка",
		now.Format("02.01.2006  15:04") + " МСК",
		"",
		"Сейчас",
		fmt.Sprintf("Очередь публикаций: %d", snap.PublishBacklog),
		fmt.Sprintf("Постов в ближайший час: %d", snap.PostsDueNextHour),
		fmt.Sprintf("Генераций в работе: %d", snap.GenJobsActive),
		fmt.Sprintf("Сценариев выполняется: %d", snap.WorkflowRunsRunning),
		fmt.Sprintf("Соединения с базой: %s", poolLine),
		workerLine,
		"",
		"Тренд",
		trend.Summary,
	}
	if len(trend.Signals) > 0 {
		lines = append(lines, "")
		for _, sig := range trend.Signals {
			lines = append(lines, "• "+sig)
		}
	}
	lines = append(lines, "", "Оперативная память", trend.RAMAdvice)
	lines = append(lines, "", fmt.Sprintf("На сервере указано: %d ГБ", serverRAMGB))
	lines = append(lines, "", "План масштабирования: scripts/scaling-plan.md")
	lines = append(lines, fmt.Sprintf("Пауза после шага %d — дальше только по вашей команде.", loadMonitorPlanPauseStep))
	return strings.Join(lines, "\n")
}

func avgDailyFloat(items []model.LoadDailyAggregate, pick func(model.LoadDailyAggregate) float64) float64 {
	if len(items) == 0 {
		return 0
	}
	sum := 0.0
	for _, it := range items {
		sum += pick(it)
	}
	return sum / float64(len(items))
}

func maxDailyInt(items []model.LoadDailyAggregate, pick func(model.LoadDailyAggregate) int) int {
	max := 0
	for _, it := range items {
		if v := pick(it); v > max {
			max = v
		}
	}
	return max
}
