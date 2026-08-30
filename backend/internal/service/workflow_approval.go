package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

func isApprovalWorkflowNode(nodeType string) bool {
	return nodeType == "draft_approval" || nodeType == "human_review"
}

func (s *WorkflowService) executeApprovalNode(
	ctx context.Context,
	workspaceID, userID string,
	run *model.WorkflowRun,
	graph *model.WorkflowGraph,
	node model.WorkflowNode,
	inputs map[string]interface{},
	outputsAccumulator map[string]map[string]interface{},
) (map[string]interface{}, error) {
	if s.postSvc == nil {
		return nil, fmt.Errorf("сервис публикаций недоступен")
	}
	if err := validateSocialNodeInputs("draft_approval", inputs); err != nil {
		return nil, err
	}

	channelIDs := collectApprovalChannelIDs(node, graph, inputs, outputsAccumulator, func(data map[string]interface{}) map[string]interface{} {
		return s.resolveNodeData(data, outputsAccumulator)
	})
	content := readSocialContent(inputs)
	fileID := content.resolvedFileID()
	if fileID == "" && graph != nil {
		fileID = collectDownstreamFileID(node, graph, outputsAccumulator, func(data map[string]interface{}) map[string]interface{} {
			return s.resolveNodeData(data, outputsAccumulator)
		})
	}

	in := WorkflowApprovalDraftInput{
		WorkflowNodeID: node.ID,
		Text:           content.Text,
		FileID:         fileID,
		ImageFileID:    content.ImageFileID,
		VideoFileID:    content.VideoFileID,
		ImageURL:       content.ImageURL,
		VideoURL:       content.VideoURL,
		ChannelIDs:     channelIDs,
		ApproverIDs:    getStringSlice(inputs, "approverUserIds"),
		DueAt:          parseOptionalDueAt(getString(inputs, "dueAt", "")),
	}
	if run != nil {
		in.WorkflowID = run.WorkflowID
		in.WorkflowRunID = run.ID
	}

	post, err := s.postSvc.CreateWorkflowApprovalPost(ctx, workspaceID, userID, in)
	if err != nil {
		return nil, err
	}

	outputs := map[string]interface{}{
		"status":      string(post.Status),
		"post_id":     post.ID,
		"content":     post.Content.Text,
		"text":        post.Content.Text,
		"image_url":   content.ImageURL,
		"video_url":   content.VideoURL,
		"file_id":     fileID,
		"approved":    false,
		"channel_ids": channelIDs,
	}
	if len(post.Settings.ApproverUserIDs) > 0 {
		outputs["approver_user_ids"] = post.Settings.ApproverUserIDs
	}
	return outputs, nil
}

func (s *WorkflowService) CompleteApprovalRun(
	ctx context.Context,
	workspaceID, runID, postID string,
	approved bool,
) error {
	run, err := s.repo.GetRunByID(ctx, runID, workspaceID)
	if err != nil {
		return err
	}
	if run.Status != model.WorkflowRunStatusAwaitingApproval {
		return nil
	}
	if run.ContextData == nil {
		run.ContextData = map[string]interface{}{}
	}
	run.ContextData["approval_post_id"] = postID
	now := time.Now()
	run.FinishedAt = &now
	if approved {
		run.Status = model.WorkflowRunStatusCompleted
		run.ErrorMessage = ""
		run.ContextData["approval_status"] = "approved"
	} else {
		run.Status = model.WorkflowRunStatusFailed
		run.ErrorMessage = "Согласование отклонено"
		run.ContextData["approval_status"] = "rejected"
	}
	if err := s.repo.UpdateRun(ctx, run); err != nil {
		return err
	}
	workflowName := "Процесс"
	if wf, wfErr := s.repo.GetByID(ctx, run.WorkflowID, workspaceID); wfErr == nil && wf != nil {
		workflowName = wf.Name
	}
	s.notifyRunFinished(ctx, run, workflowName)
	return nil
}

func collectApprovalChannelIDs(
	node model.WorkflowNode,
	graph *model.WorkflowGraph,
	inputs map[string]interface{},
	outputsAccumulator map[string]map[string]interface{},
	resolve func(map[string]interface{}) map[string]interface{},
) []string {
	ids := append([]string{}, getStringSlice(inputs, "channelIds")...)
	if id := getString(inputs, "channelId", ""); id != "" {
		ids = append(ids, id)
	}
	if graph == nil {
		return model.NormalizeUserIDs(ids)
	}
	nodeByID := make(map[string]model.WorkflowNode, len(graph.Nodes))
	for _, item := range graph.Nodes {
		nodeByID[item.ID] = item
	}
	for _, edge := range graph.Edges {
		if edge.Source != node.ID {
			continue
		}
		next, ok := nodeByID[edge.Target]
		if !ok || !isWorkflowSocialNode(next.Type) {
			continue
		}
		resolved := resolve(next.Data)
		if id := getString(resolved, "channelId", ""); id != "" {
			ids = append(ids, id)
		}
	}
	_ = outputsAccumulator
	return model.NormalizeUserIDs(ids)
}

func collectDownstreamFileID(
	node model.WorkflowNode,
	graph *model.WorkflowGraph,
	outputsAccumulator map[string]map[string]interface{},
	resolve func(map[string]interface{}) map[string]interface{},
) string {
	nodeByID := make(map[string]model.WorkflowNode, len(graph.Nodes))
	for _, item := range graph.Nodes {
		nodeByID[item.ID] = item
	}
	for _, edge := range graph.Edges {
		if edge.Source != node.ID {
			continue
		}
		next, ok := nodeByID[edge.Target]
		if !ok || !isWorkflowSocialNode(next.Type) {
			continue
		}
		resolved := resolve(next.Data)
		for _, key := range []string{"fileId", "imageFileId", "videoFileId"} {
			if id := getString(resolved, key, ""); id != "" {
				return id
			}
		}
	}
	_ = outputsAccumulator
	return ""
}

func getStringSlice(m map[string]interface{}, key string) []string {
	if m == nil {
		return nil
	}
	val, ok := m[key]
	if !ok || val == nil {
		return nil
	}
	switch typed := val.(type) {
	case []string:
		return model.NormalizeUserIDs(typed)
	case []interface{}:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return model.NormalizeUserIDs(out)
	case string:
		parts := strings.Split(typed, ",")
		return model.NormalizeUserIDs(parts)
	default:
		return nil
	}
}

func parseOptionalDueAt(raw string) *time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if t, err := time.ParseInLocation("2006-01-02T15:04", raw, time.Local); err == nil {
		utc := t.UTC()
		return &utc
	}
	layouts := []string{time.RFC3339, "2006-01-02 15:04"}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, raw); err == nil {
			utc := t.UTC()
			return &utc
		}
	}
	return nil
}
