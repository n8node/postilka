package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

func (s *WorkflowService) syncWorkflowMetaFromGraph(w *model.Workflow) {
	trigger := findTriggerNode(w.Graph)
	if trigger == nil {
		return
	}
	data := trigger.Data
	if data == nil {
		return
	}
	if tt, ok := data["triggerType"].(string); ok && strings.TrimSpace(tt) != "" {
		w.TriggerType = model.WorkflowTriggerType(strings.TrimSpace(tt))
	}
	if cron, ok := data["scheduleCron"].(string); ok {
		w.ScheduleCron = strings.TrimSpace(cron)
	}
	if rssURL, ok := data["rssFeedUrl"].(string); ok {
		w.RSSFeedURL = strings.TrimSpace(rssURL)
	}
	if interval := getInt(data, "rssPollIntervalMinutes", 0); interval > 0 {
		w.RSSPollIntervalMinutes = interval
	}
}

func mergeInputOrder(handle string) int {
	switch handle {
	case "input_1", "input":
		return 1
	case "input_2":
		return 2
	default:
		return 99
	}
}

func isActiveBranchEdge(
	edge model.WorkflowEdge,
	predOutputs map[string]interface{},
	skipped map[string]bool,
) bool {
	if skipped[edge.Source] {
		return false
	}
	if predOutputs == nil {
		return true
	}
	activeOutput, hasActive := predOutputs["active_output"].(string)
	if !hasActive || activeOutput == "" || edge.SourceHandle == "" {
		return true
	}
	// Legacy graphs may connect the old boolean port "result".
	if edge.SourceHandle == "result" {
		return true
	}
	return edge.SourceHandle == activeOutput
}

func collectMergeInputs(
	incoming []model.WorkflowEdge,
	outputs map[string]map[string]interface{},
	skipped map[string]bool,
) []map[string]interface{} {
	ordered := make([]model.WorkflowEdge, len(incoming))
	copy(ordered, incoming)
	sort.SliceStable(ordered, func(i, j int) bool {
		return mergeInputOrder(ordered[i].TargetHandle) < mergeInputOrder(ordered[j].TargetHandle)
	})

	sources := make([]map[string]interface{}, 0, len(ordered))
	seen := make(map[string]bool)
	for _, edge := range ordered {
		if skipped[edge.Source] {
			continue
		}
		if seen[edge.Source] {
			continue
		}
		srcOut, ok := outputs[edge.Source]
		if !ok || len(srcOut) == 0 {
			continue
		}
		seen[edge.Source] = true
		sources = append(sources, shallowCopyMap(srcOut))
	}
	return sources
}

func shallowCopyMap(src map[string]interface{}) map[string]interface{} {
	if src == nil {
		return map[string]interface{}{}
	}
	dst := make(map[string]interface{}, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func isEmptyValue(v interface{}) bool {
	if v == nil {
		return true
	}
	switch t := v.(type) {
	case string:
		return strings.TrimSpace(t) == ""
	case []interface{}:
		return len(t) == 0
	case map[string]interface{}:
		return len(t) == 0
	default:
		return false
	}
}

func executeMergeNode(inputs map[string]interface{}) map[string]interface{} {
	mode := getString(inputs, "mode", "combine")
	sources := extractUpstreamMaps(inputs)
	merged := make(map[string]interface{})

	switch mode {
	case "prefer_first":
		if len(sources) > 0 {
			merged = shallowCopyMap(sources[0])
		}
	case "prefer_last":
		if len(sources) > 0 {
			merged = shallowCopyMap(sources[len(sources)-1])
		}
	default:
		for _, src := range sources {
			for k, v := range src {
				if existing, ok := merged[k]; !ok || isEmptyValue(existing) {
					merged[k] = v
				}
			}
		}
	}

	normalizeMergeMediaAliases(merged)
	outputs := shallowCopyMap(merged)
	outputs["merged"] = merged
	return outputs
}

func normalizeMergeMediaAliases(merged map[string]interface{}) {
	if getString(merged, "mediaUrl", "") == "" {
		if img := getString(merged, "image_url", ""); img != "" {
			merged["mediaUrl"] = img
		} else if vid := getString(merged, "video_url", ""); vid != "" {
			merged["mediaUrl"] = vid
		} else if file := getString(merged, "file_url", ""); file != "" {
			merged["mediaUrl"] = file
		}
	}
}

func extractUpstreamMaps(inputs map[string]interface{}) []map[string]interface{} {
	raw, ok := inputs["__upstream"]
	if !ok {
		return nil
	}
	switch list := raw.(type) {
	case []map[string]interface{}:
		return list
	case []interface{}:
		out := make([]map[string]interface{}, 0, len(list))
		for _, item := range list {
			if m, ok := item.(map[string]interface{}); ok {
				out = append(out, m)
			}
		}
		return out
	default:
		return nil
	}
}

func executeSetFieldsNode(inputs map[string]interface{}, resolve func(string) string) map[string]interface{} {
	outputs := make(map[string]interface{})
	payload := make(map[string]interface{})

	fieldsRaw, ok := inputs["fields"]
	if !ok {
		return outputs
	}

	appendField := func(m map[string]interface{}) {
		key := getString(m, "key", "")
		if key == "" {
			return
		}
		val := getString(m, "value", "")
		if resolve != nil {
			val = resolve(val)
		}
		outputs[key] = val
		payload[key] = val
	}

	switch fields := fieldsRaw.(type) {
	case []interface{}:
		for _, item := range fields {
			if m, ok := item.(map[string]interface{}); ok {
				appendField(m)
			}
		}
	case []map[string]interface{}:
		for _, m := range fields {
			appendField(m)
		}
	}
	outputs["payload"] = payload
	return outputs
}

func buildLoopChildSet(graph model.WorkflowGraph) map[string]string {
	childSet := make(map[string]string)
	for _, node := range graph.Nodes {
		if node.Type != "loop_items" {
			continue
		}
		for _, edge := range graph.Edges {
			if edge.Source == node.ID {
				childSet[edge.Target] = node.ID
			}
		}
	}
	return childSet
}

func getDirectChildNodeIDs(parentID string, graph model.WorkflowGraph) []string {
	ids := make([]string, 0)
	for _, edge := range graph.Edges {
		if edge.Source == parentID {
			ids = append(ids, edge.Target)
		}
	}
	return ids
}

func buildNodeMap(graph model.WorkflowGraph) map[string]model.WorkflowNode {
	m := make(map[string]model.WorkflowNode, len(graph.Nodes))
	for _, n := range graph.Nodes {
		m[n.ID] = n
	}
	return m
}

func setLoopContext(outputs map[string]map[string]interface{}, index, total int, item interface{}) {
	ctx := map[string]interface{}{
		"current_item":  item,
		"current_index": index,
		"total":         total,
	}
	if m, ok := item.(map[string]interface{}); ok {
		if v, ok := m["channel_id"]; ok {
			ctx["current_item_channel_id"] = v
		}
		if v, ok := m["provider"]; ok {
			ctx["current_item_provider"] = v
		}
		if v, ok := m["name"]; ok {
			ctx["current_item_name"] = v
		}
	}
	outputs["__loop"] = ctx
}

func resolveLoopItemsList(
	ctx context.Context,
	s *WorkflowService,
	workspaceID string,
	inputs map[string]interface{},
) ([]interface{}, error) {
	source := getString(inputs, "itemsSource", "channels")
	maxIterations := getInt(inputs, "maxIterations", 20)
	if maxIterations <= 0 {
		maxIterations = 20
	}
	if maxIterations > 50 {
		maxIterations = 50
	}

	var items []interface{}

	switch source {
	case "static":
		if raw, ok := inputs["staticItems"].([]interface{}); ok {
			items = raw
		}
	case "upstream_field":
		field := getString(inputs, "upstreamField", "items")
		if val, ok := inputs[field]; ok {
			if arr, ok := val.([]interface{}); ok {
				items = arr
			}
		}
	default:
		providersFilter := parseStringList(inputs["channelProviders"])
		channels, err := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		if err != nil {
			return nil, err
		}
		for _, ch := range channels {
			if len(providersFilter) > 0 && !workflowContainsString(providersFilter, string(ch.Provider)) {
				continue
			}
			items = append(items, map[string]interface{}{
				"channel_id": ch.ID,
				"provider":   string(ch.Provider),
				"name":       ch.Name,
				"chat_id":    ch.ChatID,
			})
		}
	}

	if len(items) > maxIterations {
		items = items[:maxIterations]
	}
	return items, nil
}

func parseStringList(raw interface{}) []string {
	switch v := raw.(type) {
	case []interface{}:
		out := make([]string, 0, len(v))
		for _, item := range v {
			s := strings.TrimSpace(fmt.Sprintf("%v", item))
			if s != "" {
				out = append(out, s)
			}
		}
		return out
	case []string:
		return v
	default:
		return nil
	}
}

func workflowContainsString(list []string, val string) bool {
	for _, s := range list {
		if strings.EqualFold(s, val) {
			return true
		}
	}
	return false
}

func getNestedMapValue(m map[string]interface{}, path string) (interface{}, bool) {
	parts := strings.Split(path, ".")
	var current interface{} = m
	for _, part := range parts {
		asMap, ok := current.(map[string]interface{})
		if !ok {
			return nil, false
		}
		val, ok := asMap[part]
		if !ok {
			return nil, false
		}
		current = val
	}
	return current, true
}
