package service

import (
	"context"
	"strconv"
	"strings"
)

const (
	telegramHealthAckCallback = "health_ack"
	telegramHealthAckMaxKeep  = 64
)

type healthAckMessage struct {
	chatID    string
	messageID string
}

func (s *TelegramService) trackHealthMessage(chatID, messageID string) {
	chatID = strings.TrimSpace(chatID)
	messageID = strings.TrimSpace(messageID)
	if chatID == "" || messageID == "" {
		return
	}
	s.pendingHealthMu.Lock()
	defer s.pendingHealthMu.Unlock()
	s.pendingHealth = append(s.pendingHealth, healthAckMessage{chatID: chatID, messageID: messageID})
	if len(s.pendingHealth) > telegramHealthAckMaxKeep {
		s.pendingHealth = s.pendingHealth[len(s.pendingHealth)-telegramHealthAckMaxKeep:]
	}
}

func (s *TelegramService) takeHealthMessages(chatID string, messageID string) []healthAckMessage {
	chatID = strings.TrimSpace(chatID)
	messageID = strings.TrimSpace(messageID)
	s.pendingHealthMu.Lock()
	defer s.pendingHealthMu.Unlock()
	if len(s.pendingHealth) == 0 {
		return nil
	}
	kept := s.pendingHealth[:0]
	var taken []healthAckMessage
	for _, item := range s.pendingHealth {
		matchChat := chatID == "" || item.chatID == chatID
		matchID := messageID == "" || item.messageID == messageID
		if matchChat && matchID {
			taken = append(taken, item)
			continue
		}
		kept = append(kept, item)
	}
	s.pendingHealth = kept
	return taken
}

func (s *TelegramService) handleHealthAckUpdate(ctx context.Context, token, adminChat string, upd adminBotUpdate) {
	if cb := upd.CallbackQuery; cb != nil && strings.TrimSpace(cb.Data) == telegramHealthAckCallback {
		chatID := adminChat
		messageID := ""
		if cb.Message != nil {
			if id := telegramChatIDString(cb.Message.Chat.ID); id != "" {
				chatID = id
			}
			if cb.Message.MessageID != 0 {
				messageID = strconv.FormatInt(cb.Message.MessageID, 10)
			}
		}
		_ = s.telegramAnswerCallback(ctx, token, cb.ID, "Скрыто")
		if messageID != "" {
			if err := s.telegramDeleteMessage(ctx, token, chatID, messageID); err != nil {
				s.logger.Warn("telegram health message delete failed", "err", err, "message_id", messageID)
				if clearErr := s.telegramClearInlineKeyboard(ctx, token, chatID, messageID); clearErr != nil {
					s.logger.Warn("telegram health keyboard clear failed", "err", clearErr, "message_id", messageID)
				}
			}
			s.takeHealthMessages(chatID, messageID)
			return
		}
		s.deleteTrackedHealthMessages(ctx, token, chatID, "")
		return
	}

	msg := upd.Message
	if msg == nil || msg.From == nil || msg.From.IsBot {
		return
	}
	if !isPrivateTelegramChatID(adminChat) {
		return
	}
	if telegramChatIDString(msg.Chat.ID) != adminChat {
		return
	}
	s.deleteTrackedHealthMessages(ctx, token, adminChat, "")
}

func (s *TelegramService) deleteTrackedHealthMessages(ctx context.Context, token, chatID, messageID string) {
	for _, item := range s.takeHealthMessages(chatID, messageID) {
		if err := s.telegramDeleteMessage(ctx, token, item.chatID, item.messageID); err != nil {
			s.logger.Warn("telegram health message delete failed", "err", err, "message_id", item.messageID)
		}
	}
}

func telegramChatIDString(id int64) string {
	if id == 0 {
		return ""
	}
	return strconv.FormatInt(id, 10)
}

func isPrivateTelegramChatID(chatID string) bool {
	chatID = strings.TrimSpace(chatID)
	if chatID == "" || strings.HasPrefix(chatID, "-") {
		return false
	}
	_, err := strconv.ParseInt(chatID, 10, 64)
	return err == nil
}
