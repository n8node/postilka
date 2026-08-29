package service

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/photochka"
	"github.com/postilka/postilka/internal/repository"
)

type MetricsCollectorService struct {
	analytics *repository.AnalyticsRepository
	links     *repository.LinkCodeRepository
	posts     *repository.PostRepository
	channels  *repository.ChannelRepository
	channelTest *ChannelTestService
	metrika   *MetrikaConnectionService
	telegram  *TelegramBotClient
	vkClient  *oauthclient.VKCommunityClient
	maxClient *oauthclient.MAXBotClient
	photochka *photochka.Client
	logger    *slog.Logger
}

func NewMetricsCollectorService(
	analytics *repository.AnalyticsRepository,
	links *repository.LinkCodeRepository,
	posts *repository.PostRepository,
	channels *repository.ChannelRepository,
	channelTest *ChannelTestService,
	metrika *MetrikaConnectionService,
	telegram *TelegramBotClient,
	photochkaClient *photochka.Client,
	logger *slog.Logger,
) *MetricsCollectorService {
	if logger == nil {
		logger = slog.Default()
	}
	return &MetricsCollectorService{
		analytics:   analytics,
		links:       links,
		posts:       posts,
		channels:    channels,
		channelTest: channelTest,
		metrika:     metrika,
		telegram:    telegram,
		vkClient:    &oauthclient.VKCommunityClient{},
		maxClient:   oauthclient.NewMAXBotClient(),
		photochka:   photochkaClient,
		logger:      logger,
	}
}

func (s *MetricsCollectorService) Process(ctx context.Context, batchSize int) (int, error) {
	if s.analytics == nil {
		return 0, nil
	}
	targets, err := s.analytics.ListTargetsForPolling(ctx, batchSize)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, target := range targets {
		if err := s.collectTarget(ctx, target); err != nil {
			s.logger.Warn("metrics collect failed",
				"target_id", target.TargetID,
				"provider", target.Provider,
				"error", err,
			)
			continue
		}
		processed++
	}
	return processed, nil
}

func (s *MetricsCollectorService) collectTarget(ctx context.Context, target repository.MetricsPollTarget) error {
	ch := &model.Channel{
		ID:          target.ChannelID,
		WorkspaceID: target.WorkspaceID,
		Provider:    model.ChannelProvider(target.Provider),
		ChatID:      target.ChannelChatID,
		Name:        target.ChannelName,
		Status:      model.ChannelStatusActive,
	}
	token, err := s.channelTest.resolvePublishToken(ctx, ch)
	if err != nil && target.Provider != string(model.ChannelProviderDzen) {
		return err
	}

	clicks, err := s.links.CountClicksByTarget(ctx, target.TargetID)
	if err != nil {
		return err
	}

	input := repository.MetricsUpsertInput{
		TargetID:      target.TargetID,
		WorkspaceID:   target.WorkspaceID,
		PostID:        target.PostID,
		ChannelID:     target.ChannelID,
		Provider:      target.Provider,
		Clicks:        clicks.Total,
		ClicksUnique:  clicks.Unique,
		Measurability: measurabilityForProvider(target.Provider),
		ProviderNote:  providerNoteFor(target.Provider),
		FetchedAt:     time.Now().UTC(),
	}

	switch model.ChannelProvider(target.Provider) {
	case model.ChannelProviderVK:
		if err := s.collectVK(ctx, token, target, &input); err != nil {
			return err
		}
	case model.ChannelProviderYouTube:
		if err := s.collectYouTube(ctx, token, target, &input); err != nil {
			return err
		}
	case model.ChannelProviderMAX:
		if err := s.collectMAX(ctx, token, target, &input); err != nil {
			return err
		}
	case model.ChannelProviderTelegram:
		if err := s.collectTelegram(ctx, token, target, &input); err != nil {
			return err
		}
	case model.ChannelProviderPhotochka:
		if err := s.collectPhotochka(ctx, token, target, &input); err != nil {
			return err
		}
	case model.ChannelProviderDzen:
		input.Measurability = model.MeasurabilityManual
		input.ProviderNote = "Статистика публикаций Дзена доступна в Студии. Здесь учитываются только переходы по вашим ссылкам."
	case model.ChannelProviderWordPress:
		input.Measurability = model.MeasurabilityManual
		input.ProviderNote = "У ядра WordPress нет просмотров записи через REST API. Здесь учитываются переходы по вашим ссылкам."
	default:
		input.Measurability = model.MeasurabilityPartial
	}

	if err := s.applyMetrika(ctx, target, &input); err != nil {
		s.logger.Warn("metrika stats failed", "target_id", target.TargetID, "error", err)
	}

	if err := s.analytics.UpsertMetrics(ctx, input); err != nil {
		return err
	}
	return s.analytics.InsertSnapshot(ctx, input)
}

func (s *MetricsCollectorService) collectVK(
	ctx context.Context,
	token string,
	target repository.MetricsPollTarget,
	input *repository.MetricsUpsertInput,
) error {
	ownerID, err := strconv.ParseInt(strings.TrimSpace(target.ChannelChatID), 10, 64)
	if err != nil {
		return fmt.Errorf("vk owner id: %w", err)
	}
	postID, err := strconv.ParseInt(strings.TrimSpace(target.ProviderPostID), 10, 64)
	if err != nil || postID <= 0 {
		input.Measurability = model.MeasurabilityPartial
		return nil
	}
	stats, err := s.vkClient.GetWallPostStats(ctx, token, ownerID, postID)
	if err != nil {
		return err
	}
	input.Views = stats.Views
	input.Likes = stats.Likes
	input.Comments = stats.Comments
	input.Shares = stats.Shares
	reach, err := s.vkClient.GetPostReach(ctx, token, ownerID, postID)
	if err != nil {
		return err
	}
	if reach != nil && reach.Available {
		input.Reach = reach.ReachTotal
	} else {
		input.ProviderNote = "Охват VK доступен не для всех сообществ — показываем просмотры и вовлечённость."
	}
	input.Measurability = model.MeasurabilityAuto
	return nil
}

func (s *MetricsCollectorService) collectYouTube(
	ctx context.Context,
	token string,
	target repository.MetricsPollTarget,
	input *repository.MetricsUpsertInput,
) error {
	videoID := strings.TrimSpace(target.ProviderPostID)
	if videoID == "" {
		input.Measurability = model.MeasurabilityPartial
		return nil
	}
	row, err := s.channels.GetRowByID(ctx, target.WorkspaceID, target.ChannelID)
	if err != nil {
		return err
	}
	clientID, clientSecret, err := youtubeOAuthCredentialsFromRow(row, s.channelTest.cipher)
	if err != nil {
		return err
	}
	client := buildYouTubeOAuthClient(s.channelTest.youtubeAPI, clientID, clientSecret, "")
	stats, err := client.GetVideoStatistics(ctx, token, videoID)
	if err != nil {
		return err
	}
	input.Views = stats.ViewCount
	input.Likes = stats.LikeCount
	input.Comments = stats.CommentCount
	input.Measurability = model.MeasurabilityAuto
	return nil
}

func (s *MetricsCollectorService) collectMAX(
	ctx context.Context,
	token string,
	target repository.MetricsPollTarget,
	input *repository.MetricsUpsertInput,
) error {
	messageID := strings.TrimSpace(target.ProviderPostID)
	if messageID == "" {
		input.Measurability = model.MeasurabilityPartial
		input.ProviderNote = "Для MAX сохраните ID сообщения при публикации — просмотры появятся после первого опроса."
		return nil
	}
	stats, err := s.maxClient.GetMessagesByIDs(ctx, token, messageID)
	if err != nil {
		return err
	}
	for _, item := range stats {
		if item.MessageID == messageID || len(stats) == 1 {
			input.Views = item.Views
			break
		}
	}
	input.Measurability = model.MeasurabilityAuto
	return nil
}

func (s *MetricsCollectorService) collectPhotochka(
	ctx context.Context,
	token string,
	target repository.MetricsPollTarget,
	input *repository.MetricsUpsertInput,
) error {
	if s.photochka == nil {
		input.Measurability = model.MeasurabilityPartial
		input.ProviderNote = "Интеграция Photochka недоступна на сервере."
		return nil
	}
	postID := strings.TrimSpace(target.ProviderPostID)
	if postID == "" {
		input.Measurability = model.MeasurabilityPartial
		input.ProviderNote = "Сохраните id поста Photochka после публикации — метрики появятся при следующем опросе."
		return nil
	}
	post, err := s.photochka.GetPost(ctx, token, postID)
	if err != nil {
		return err
	}
	input.Views = clampMetricInt(post.ViewsCount)
	input.Reach = clampMetricInt(post.ReachCount)
	input.Likes = post.LikesCount
	input.Comments = post.CommentsCount
	input.Shares = post.SavesCount
	input.Measurability = model.MeasurabilityAuto
	return nil
}

func clampMetricInt(v int64) int {
	if v <= 0 {
		return 0
	}
	if v > int64(^uint(0)>>1) {
		return int(^uint(0) >> 1)
	}
	return int(v)
}

func (s *MetricsCollectorService) collectTelegram(
	ctx context.Context,
	token string,
	target repository.MetricsPollTarget,
	input *repository.MetricsUpsertInput,
) error {
	count, err := s.telegram.GetChatMemberCount(ctx, token, target.ChannelChatID)
	if err == nil && count > 0 {
		input.SubscriberCount = &count
	}
	input.Measurability = model.MeasurabilityPartial
	input.ProviderNote = "Telegram Bot API не отдаёт просмотры постов — доступны подписчики и переходы по вашим ссылкам."
	return nil
}

func (s *MetricsCollectorService) applyMetrika(
	ctx context.Context,
	target repository.MetricsPollTarget,
	input *repository.MetricsUpsertInput,
) error {
	if s.metrika == nil || s.analytics == nil {
		return nil
	}
	campaign := s.utmCampaignForTarget(ctx, target)
	if campaign == "" {
		return nil
	}
	from := time.Now().UTC().AddDate(0, 0, -30)
	to := time.Now().UTC()
	if target.PublishedAt != nil {
		from = target.PublishedAt.UTC()
	}
	connections, err := s.metrika.ListEnabledConnections(ctx, target.WorkspaceID)
	if err != nil {
		return err
	}
	for _, conn := range connections {
		stats, err := s.metrika.UTMCampaignStatsForCounter(ctx, target.WorkspaceID, conn.CounterID, campaign, from, to)
		if err != nil {
			s.logger.Warn("metrika counter stats failed",
				"target_id", target.TargetID,
				"counter_id", conn.CounterID,
				"error", err,
			)
			continue
		}
		if err := s.analytics.UpsertCounterMetrics(ctx, repository.MetrikaCounterMetricInput{
			TargetID:    target.TargetID,
			PostID:      target.PostID,
			WorkspaceID: target.WorkspaceID,
			CounterID:   conn.CounterID,
			UTMCampaign: campaign,
			Visits:      stats.Visits,
			Users:       stats.Users,
			Goals:       stats.Goals,
		}); err != nil {
			return err
		}
		input.MetrikaVisits += stats.Visits
		input.MetrikaUsers += stats.Users
		input.MetrikaGoals += stats.Goals
	}
	return nil
}

func (s *MetricsCollectorService) utmCampaignForTarget(ctx context.Context, target repository.MetricsPollTarget) string {
	post, err := s.posts.Get(ctx, target.WorkspaceID, target.PostID)
	if err != nil {
		return ""
	}
	for _, t := range post.Targets {
		if t.ID != target.TargetID {
			continue
		}
		settings, err := DecodePostTargetSettings(t.Settings)
		if err != nil {
			return ""
		}
		if settings.Settings != nil && settings.Settings.UTM != nil {
			if campaign := strings.TrimSpace(settings.Settings.UTM.Campaign); campaign != "" {
				return campaign
			}
		}
	}
	if post.Settings.UTM != nil {
		return strings.TrimSpace(post.Settings.UTM.Campaign)
	}
	return ""
}

func measurabilityForProvider(provider string) string {
	switch model.ChannelProvider(provider) {
	case model.ChannelProviderVK, model.ChannelProviderYouTube, model.ChannelProviderMAX, model.ChannelProviderPhotochka:
		return model.MeasurabilityAuto
	case model.ChannelProviderDzen:
		return model.MeasurabilityManual
	case model.ChannelProviderWordPress:
		return model.MeasurabilityManual
	default:
		return model.MeasurabilityPartial
	}
}

func providerNoteFor(provider string) string {
	switch model.ChannelProvider(provider) {
	case model.ChannelProviderTelegram:
		return "Telegram Bot API не отдаёт просмотры постов — доступны подписчики и переходы по вашим ссылкам."
	case model.ChannelProviderDzen:
		return "Статистика публикаций Дзена доступна в Студии. Здесь учитываются только переходы по вашим ссылкам."
	case model.ChannelProviderWordPress:
		return "У ядра WordPress нет просмотров записи через REST API. Здесь учитываются переходы по вашим ссылкам."
	default:
		return ""
	}
}
