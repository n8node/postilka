package service

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
)

func (s *NotificationService) NotifyPostResult(ctx context.Context, post *model.Post) {
	if s == nil || post == nil {
		return
	}
	if post.Status == model.PostStatusScheduled || post.Status == model.PostStatusPublishing {
		return
	}
	published, failed := 0, 0
	var lastErr string
	for _, t := range post.Targets {
		switch t.Status {
		case model.PostTargetPublished:
			published++
		case model.PostTargetFailed:
			failed++
			if lastErr == "" {
				lastErr = strings.TrimSpace(t.LastError)
			}
		}
	}
	label := postLabel(*post)
	href := "/posts/" + post.ID
	payload := map[string]any{"post_id": post.ID}

	switch {
	case published > 0 && failed > 0:
		s.CreateForWorkspace(ctx, post.WorkspaceID, editorRoles(), NotificationInput{
			Type:     model.NotifyPostPartial,
			Category: model.NotificationWarning,
			Title:    "Публикация вышла не во все каналы",
			Body:     fmt.Sprintf("«%s»: ошибка в %d из %d каналов. %s", label, failed, published+failed, lastErr),
			Payload:  payload,
			Href:     href,
		})
	case failed > 0:
		body := fmt.Sprintf("«%s» не удалось опубликовать.", label)
		if lastErr != "" {
			body += " " + lastErr
		}
		s.CreateForWorkspace(ctx, post.WorkspaceID, editorRoles(), NotificationInput{
			Type:     model.NotifyPostFailed,
			Category: model.NotificationError,
			Title:    "Публикация не вышла",
			Body:     body,
			Payload:  payload,
			Href:     href,
		})
	case published > 0 && post.Status == model.PostStatusPublished:
		s.CreateForWorkspace(ctx, post.WorkspaceID, editorRoles(), NotificationInput{
			Type:     model.NotifyPostPublished,
			Category: model.NotificationSuccess,
			Title:    "Публикация вышла",
			Body:     fmt.Sprintf("«%s» опубликована во все выбранные каналы.", label),
			Payload:  payload,
			Href:     href,
		})
	}
}

func (s *NotificationService) NotifyPostQuotaBlocked(ctx context.Context, post model.Post) {
	s.CreateForWorkspaceDeduped(ctx, post.WorkspaceID, editorRoles(), NotificationInput{
		Type:     model.NotifyPostQuotaBlocked,
		Category: model.NotificationWarning,
		Title:    "Публикация не вышла: кончился лимит постов",
		Body:     fmt.Sprintf("«%s» отложена — на тарифе закончились публикации за период.", postLabel(post)),
		Payload:  map[string]any{"post_id": post.ID},
		Href:     "/plans",
	}, "post_id", post.ID, 24*time.Hour)
}

func (s *NotificationService) NotifyChannelReconnect(ctx context.Context, workspaceID, channelID, channelName, reason string) {
	name := strings.TrimSpace(channelName)
	if name == "" {
		name = "Канал"
	}
	body := fmt.Sprintf("«%s» нужно переподключить.", name)
	if strings.TrimSpace(reason) != "" {
		body += " " + strings.TrimSpace(reason)
	}
	s.CreateForWorkspaceDeduped(ctx, workspaceID, editorRoles(), NotificationInput{
		Type:     model.NotifyChannelReconnect,
		Category: model.NotificationWarning,
		Title:    "Канал потерял доступ",
		Body:     body,
		Payload:  map[string]any{"channel_id": channelID},
		Href:     "/channels",
	}, "channel_id", channelID, 24*time.Hour)
}

func (s *NotificationService) NotifyYouTubeReconnect(ctx context.Context, workspaceID, channelID, channelName string) {
	name := strings.TrimSpace(channelName)
	if name == "" {
		name = "YouTube-канал"
	}
	s.CreateForWorkspaceDeduped(ctx, workspaceID, editorRoles(), NotificationInput{
		Type:     model.NotifyYouTubeReconnect,
		Category: model.NotificationWarning,
		Title:    "Пора переподключить YouTube",
		Body:     fmt.Sprintf("Для «%s» подошло время повторного входа.", name),
		Payload:  map[string]any{"channel_id": channelID},
		Href:     "/channels",
	}, "channel_id", channelID, 24*time.Hour)
}

func (s *NotificationService) NotifyPlanPaid(ctx context.Context, userID, workspaceID, planName string) {
	s.Create(ctx, NotificationInput{
		UserID:      userID,
		WorkspaceID: ptrString(workspaceID),
		Type:        model.NotifyPlanPaid,
		Category:    model.NotificationSuccess,
		Title:       "Тариф оплачен",
		Body:        fmt.Sprintf("Тариф «%s» включён.", strings.TrimSpace(planName)),
		Payload:     map[string]any{"workspace_id": workspaceID},
		Href:        "/plans",
	})
}

func (s *NotificationService) NotifyWalletTopup(ctx context.Context, userID string, amountCents int) {
	s.Create(ctx, NotificationInput{
		UserID:   userID,
		Type:     model.NotifyWalletTopup,
		Category: model.NotificationSuccess,
		Title:    "Кошелёк пополнен",
		Body:     fmt.Sprintf("Зачислено %s.", formatRub(int64(amountCents))),
		Payload:  map[string]any{"amount_cents": amountCents},
		Href:     "/plans",
	})
}

func (s *NotificationService) NotifyWalletAdminGrant(ctx context.Context, userID string, amountCents int64) {
	s.Create(ctx, NotificationInput{
		UserID:   userID,
		Type:     model.NotifyWalletAdminGrant,
		Category: model.NotificationSuccess,
		Title:    "Начисление на кошелёк",
		Body:     fmt.Sprintf("Администратор зачислил %s.", formatRub(amountCents)),
		Payload:  map[string]any{"amount_cents": amountCents},
		Href:     "/plans",
	})
}

func (s *NotificationService) NotifyPlanPastDue(ctx context.Context, workspaceID, planName string) {
	s.CreateForWorkspaceDeduped(ctx, workspaceID, adminRoles(), NotificationInput{
		Type:     model.NotifyPlanPastDue,
		Category: model.NotificationWarning,
		Title:    "Не хватило денег на продление тарифа",
		Body:     fmt.Sprintf("Тариф «%s» в отсрочке. Пополните кошелёк или оплатите тариф.", planName),
		Payload:  map[string]any{"workspace_id": workspaceID},
		Href:     "/plans",
	}, "workspace_id", workspaceID, 24*time.Hour)
}

func (s *NotificationService) NotifyPlanRenewed(ctx context.Context, workspaceID, planName string, amountCents int) {
	s.CreateForWorkspace(ctx, workspaceID, adminRoles(), NotificationInput{
		Type:     model.NotifyPlanRenewed,
		Category: model.NotificationSuccess,
		Title:    "Тариф продлён с кошелька",
		Body:     fmt.Sprintf("Списано %s за тариф «%s».", formatRub(int64(amountCents)), planName),
		Payload:  map[string]any{"workspace_id": workspaceID},
		Href:     "/plans",
	})
}

func (s *NotificationService) NotifyPlanDowngraded(ctx context.Context, workspaceID, planName string) {
	s.CreateForWorkspace(ctx, workspaceID, adminRoles(), NotificationInput{
		Type:     model.NotifyPlanDowngraded,
		Category: model.NotificationWarning,
		Title:    "Проект переведён на бесплатный тариф",
		Body:     fmt.Sprintf("Срок тарифа «%s» истёк.", planName),
		Payload:  map[string]any{"workspace_id": workspaceID},
		Href:     "/plans",
	})
}

func (s *NotificationService) NotifyWalletLow(ctx context.Context, userID string, balanceCents int64) {
	s.CreateDeduped(ctx, NotificationInput{
		UserID:   userID,
		Type:     model.NotifyWalletLow,
		Category: model.NotificationWarning,
		Title:    "Мало денег на кошельке",
		Body:     fmt.Sprintf("Сейчас на кошельке %s. Пополните баланс, чтобы не останавливать генерацию и продление тарифа.", formatRub(balanceCents)),
		Payload:  map[string]any{"user_id": userID},
		Href:     "/plans",
	}, "user_id", userID, 24*time.Hour)
}

func (s *NotificationService) MaybeWalletLow(ctx context.Context, userID string) {
	if s == nil || s.wallet == nil || userID == "" {
		return
	}
	balance, err := s.wallet.GetBalance(ctx, userID)
	if err != nil {
		s.warn("wallet balance", err)
		return
	}
	if balance < walletLowThresholdCents {
		s.NotifyWalletLow(ctx, userID, balance)
	}
}

func (s *NotificationService) NotifyAIDone(ctx context.Context, job model.AIGenerationJob) {
	isVideo := model.IsVideoGenerationMode(job.Mode)
	typ := model.NotifyAIImageDone
	title := "Картинка готова"
	if isVideo {
		typ = model.NotifyAIVideoDone
		title = "Видео готово"
	}
	s.Create(ctx, NotificationInput{
		UserID:      job.UserID,
		WorkspaceID: ptrString(job.WorkspaceID),
		Type:        typ,
		Category:    model.NotificationSuccess,
		Title:       title,
		Body:        clipText(job.Prompt, 120),
		Payload:     map[string]any{"job_id": job.ID, "generation_id": valueOrEmpty(job.GenerationID)},
		Href:        "/ai",
	})
}

func (s *NotificationService) NotifyAIFailed(ctx context.Context, job model.AIGenerationJob, message string) {
	isVideo := model.IsVideoGenerationMode(job.Mode)
	typ := model.NotifyAIImageFailed
	title := "Генерация картинки не удалась"
	if isVideo {
		typ = model.NotifyAIVideoFailed
		title = "Генерация видео не удалась"
	}
	body := strings.TrimSpace(message)
	if body == "" {
		body = "Попробуйте ещё раз или смените описание."
	}
	s.Create(ctx, NotificationInput{
		UserID:      job.UserID,
		WorkspaceID: ptrString(job.WorkspaceID),
		Type:        typ,
		Category:    model.NotificationError,
		Title:       title,
		Body:        body,
		Payload:     map[string]any{"job_id": job.ID},
		Href:        "/ai",
	})
}

func (s *NotificationService) NotifyInviteAccepted(ctx context.Context, workspaceID, memberName, memberEmail string) {
	who := strings.TrimSpace(memberName)
	if who == "" {
		who = strings.TrimSpace(memberEmail)
	}
	s.CreateForWorkspace(ctx, workspaceID, adminRoles(), NotificationInput{
		Type:     model.NotifyInviteAccepted,
		Category: model.NotificationSuccess,
		Title:    "Участник принял приглашение",
		Body:     fmt.Sprintf("%s присоединился к проекту.", who),
		Payload:  map[string]any{"email": memberEmail},
		Href:     "/team",
	})
}

func (s *NotificationService) NotifyApprovalSubmitted(ctx context.Context, post model.Post, actorID string) {
	s.CreateForWorkspace(ctx, post.WorkspaceID, adminRoles(), NotificationInput{
		Type:     model.NotifyApprovalSubmitted,
		Category: model.NotificationInfo,
		Title:    "Пост на согласовании",
		Body:     fmt.Sprintf("«%s» ждёт решения.", postLabel(post)),
		Payload:  map[string]any{"post_id": post.ID, "actor_id": actorID},
		Href:     "/posts/" + post.ID,
	})
}

func (s *NotificationService) NotifyApprovalDecision(ctx context.Context, post model.Post, approved bool, comment string) {
	typ := model.NotifyApprovalApproved
	title := "Пост согласован"
	cat := model.NotificationSuccess
	if !approved {
		typ = model.NotifyApprovalRejected
		title = "Пост отклонён"
		cat = model.NotificationWarning
	}
	body := fmt.Sprintf("«%s».", postLabel(post))
	if strings.TrimSpace(comment) != "" {
		body += " " + strings.TrimSpace(comment)
	}
	if post.CreatedByUserID == "" {
		s.CreateForWorkspace(ctx, post.WorkspaceID, editorRoles(), NotificationInput{
			Type: typ, Category: cat, Title: title, Body: body,
			Payload: map[string]any{"post_id": post.ID},
			Href:    "/posts/" + post.ID,
		})
		return
	}
	s.Create(ctx, NotificationInput{
		UserID:      post.CreatedByUserID,
		WorkspaceID: ptrString(post.WorkspaceID),
		Type:        typ,
		Category:    cat,
		Title:       title,
		Body:        body,
		Payload:     map[string]any{"post_id": post.ID},
		Href:        "/posts/" + post.ID,
	})
}

func (s *NotificationService) NotifyApprovalComment(ctx context.Context, post model.Post, actorID, comment string) {
	target := post.CreatedByUserID
	if target == "" || target == actorID {
		return
	}
	s.Create(ctx, NotificationInput{
		UserID:      target,
		WorkspaceID: ptrString(post.WorkspaceID),
		Type:        model.NotifyApprovalComment,
		Category:    model.NotificationInfo,
		Title:       "Новый комментарий к согласованию",
		Body:        fmt.Sprintf("«%s»: %s", postLabel(post), strings.TrimSpace(comment)),
		Payload:     map[string]any{"post_id": post.ID},
		Href:        "/posts/" + post.ID,
	})
}

func (s *NotificationService) NotifyTrashPurged(ctx context.Context, workspaceID string, count int) {
	if count <= 0 {
		return
	}
	s.CreateForWorkspace(ctx, workspaceID, editorRoles(), NotificationInput{
		Type:     model.NotifyTrashPurged,
		Category: model.NotificationInfo,
		Title:    "Корзина очищена по сроку",
		Body:     fmt.Sprintf("Удалено файлов: %d.", count),
		Payload:  map[string]any{"count": count},
		Href:     "/files",
	})
}

func (s *NotificationService) NotifyWorkflowRunFinished(ctx context.Context, run model.WorkflowRun, workflowName string) {
	if s == nil || s.quota == nil {
		return
	}
	plan, _, err := s.quota.getWorkspacePlan(ctx, run.WorkspaceID)
	if err != nil || !plan.PushOnReady {
		return
	}

	userID := ""
	if run.TriggeredBy != nil {
		userID = strings.TrimSpace(*run.TriggeredBy)
	}
	if userID == "" && s.ws != nil {
		userID, _ = s.ws.GetOwnerID(ctx, run.WorkspaceID)
	}
	if userID == "" {
		return
	}

	name := strings.TrimSpace(workflowName)
	if name == "" {
		name = "Процесс"
	}

	switch run.Status {
	case model.WorkflowRunStatusCompleted:
		s.Create(ctx, NotificationInput{
			UserID:      userID,
			WorkspaceID: ptrString(run.WorkspaceID),
			Type:        model.NotifyWorkflowRunDone,
			Category:    model.NotificationSuccess,
			Title:       "Процесс завершён",
			Body:        fmt.Sprintf("«%s» выполнен успешно.", name),
			Payload:     map[string]any{"run_id": run.ID, "workflow_id": run.WorkflowID},
			Href:        "/workflows/" + run.WorkflowID,
		})
	case model.WorkflowRunStatusAwaitingApproval:
		s.Create(ctx, NotificationInput{
			UserID:      userID,
			WorkspaceID: ptrString(run.WorkspaceID),
			Type:        model.NotifyWorkflowRunDone,
			Category:    model.NotificationInfo,
			Title:       "Процесс ждёт проверки",
			Body:        fmt.Sprintf("«%s» остановлен на шаге согласования.", name),
			Payload:     map[string]any{"run_id": run.ID, "workflow_id": run.WorkflowID},
			Href:        "/workflows/" + run.WorkflowID,
		})
	case model.WorkflowRunStatusFailed:
		body := strings.TrimSpace(run.ErrorMessage)
		if body == "" {
			body = "Откройте процесс, чтобы посмотреть детали ошибки."
		}
		s.Create(ctx, NotificationInput{
			UserID:      userID,
			WorkspaceID: ptrString(run.WorkspaceID),
			Type:        model.NotifyWorkflowRunFailed,
			Category:    model.NotificationError,
			Title:       "Ошибка процесса",
			Body:        fmt.Sprintf("«%s»: %s", name, body),
			Payload:     map[string]any{"run_id": run.ID, "workflow_id": run.WorkflowID},
			Href:        "/workflows/" + run.WorkflowID,
		})
	}
}

func (s *NotificationService) MaybeUsageWarnings(ctx context.Context, workspaceID string) {
	if s == nil || s.quota == nil || workspaceID == "" {
		return
	}
	plan, assignedAt, err := s.quota.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return
	}
	usage, err := s.quota.GetUsage(ctx, workspaceID, assignedAt)
	if err != nil {
		return
	}
	if plan.MaxPostsPerPeriod != nil && *plan.MaxPostsPerPeriod > 0 {
		s.maybePercentWarning(ctx, workspaceID, model.NotifyQuotaPosts80, "Лимит публикаций почти исчерпан",
			fmt.Sprintf("Использовано %d из %d постов за период.", usage.PostsUsed, *plan.MaxPostsPerPeriod),
			usage.PostsUsed, *plan.MaxPostsPerPeriod, 80, "/plans")
	}
	if plan.AITextTokensQuota != nil && *plan.AITextTokensQuota > 0 {
		s.maybePercentWarning(ctx, workspaceID, model.NotifyQuotaAIText80, "Лимит текстовых кредитов почти исчерпан",
			fmt.Sprintf("Использовано %d из %d текстовых кредитов за период.", usage.AITextTokensUsed, *plan.AITextTokensQuota),
			usage.AITextTokensUsed, *plan.AITextTokensQuota, 80, "/plans")
	}
	if plan.AIMediaCreditsQuota != nil && *plan.AIMediaCreditsQuota > 0 {
		s.maybePercentWarning(ctx, workspaceID, model.NotifyQuotaAIMedia80, "Лимит генерации почти исчерпан",
			fmt.Sprintf("Использовано %d из %d кредитов за период.", usage.AIMediaCreditsUsed, *plan.AIMediaCreditsQuota),
			usage.AIMediaCreditsUsed, *plan.AIMediaCreditsQuota, 80, "/plans")
	}
	if plan.MaxChannels != nil && *plan.MaxChannels > 0 {
		s.maybePercentWarning(ctx, workspaceID, model.NotifyQuotaChannels80, "Лимит каналов почти выбран",
			fmt.Sprintf("Подключено %d из %d каналов.", usage.ChannelsUsed, *plan.MaxChannels),
			usage.ChannelsUsed, *plan.MaxChannels, 80, "/channels")
	}
	if plan.MaxWorkflows != nil && *plan.MaxWorkflows > 0 {
		s.maybePercentWarning(ctx, workspaceID, model.NotifyQuotaWorkflows80, "Лимит процессов почти исчерпан",
			fmt.Sprintf("Создано %d из %d процессов.", usage.WorkflowsUsed, *plan.MaxWorkflows),
			usage.WorkflowsUsed, *plan.MaxWorkflows, 80, "/workflows")
	}
	if plan.StorageBytes != nil && *plan.StorageBytes > 0 && s.ws != nil {
		used, err := s.ws.GetStorageUsed(ctx, workspaceID)
		if err == nil {
			s.maybePercentWarning64(ctx, workspaceID, model.NotifyQuotaStorage90, "Хранилище почти заполнено",
				fmt.Sprintf("Занято около %d%% объёма тарифа.", percent64(used, *plan.StorageBytes)),
				used, *plan.StorageBytes, 90, "/files")
		}
	}
}

func (s *NotificationService) maybePercentWarning(
	ctx context.Context,
	workspaceID string,
	typ model.NotificationType,
	title, body string,
	used, quota, threshold int,
	href string,
) {
	if quota <= 0 || used*100 < quota*threshold {
		return
	}
	s.CreateForWorkspaceDeduped(ctx, workspaceID, adminRoles(), NotificationInput{
		Type:     typ,
		Category: model.NotificationWarning,
		Title:    title,
		Body:     body,
		Payload:  map[string]any{"workspace_id": workspaceID, "warning_percent": threshold},
		Href:     href,
	}, "workspace_id", workspaceID, 24*time.Hour)
}

func (s *NotificationService) maybePercentWarning64(
	ctx context.Context,
	workspaceID string,
	typ model.NotificationType,
	title, body string,
	used, quota int64,
	threshold int,
	href string,
) {
	if quota <= 0 || used*100 < quota*int64(threshold) {
		return
	}
	s.CreateForWorkspaceDeduped(ctx, workspaceID, adminRoles(), NotificationInput{
		Type:     typ,
		Category: model.NotificationWarning,
		Title:    title,
		Body:     body,
		Payload:  map[string]any{"workspace_id": workspaceID, "warning_percent": threshold},
		Href:     href,
	}, "workspace_id", workspaceID, 24*time.Hour)
}

func postLabel(post model.Post) string {
	if t := strings.TrimSpace(post.Content.Title); t != "" {
		return clipText(t, 80)
	}
	if t := strings.TrimSpace(post.Content.Text); t != "" {
		return clipText(t, 80)
	}
	return "Публикация"
}

func clipText(s string, max int) string {
	s = strings.Join(strings.Fields(strings.TrimSpace(s)), " ")
	if s == "" {
		return ""
	}
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	return string(runes[:max-1]) + "…"
}

func formatRub(cents int64) string {
	if cents%100 == 0 {
		return fmt.Sprintf("%d ₽", cents/100)
	}
	return fmt.Sprintf("%.2f ₽", float64(cents)/100)
}

func percent64(used, quota int64) int {
	if quota <= 0 {
		return 0
	}
	return int((used * 100) / quota)
}

func valueOrEmpty(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
