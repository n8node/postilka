package service

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

type rssFeed struct {
	Channel rssChannel `xml:"channel"`
}

type rssChannel struct {
	Items []rssItem `xml:"item"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
	Author      string `xml:"author"`
	Content     string `xml:"encoded"`
}

type RSSFeedItem struct {
	Title       string
	Link        string
	Description string
	Content     string
	PubDate     time.Time
	GUID        string
	Author      string
}

func fetchRSSFeed(ctx context.Context, feedURL string) ([]RSSFeedItem, error) {
	feedURL = strings.TrimSpace(feedURL)
	if feedURL == "" {
		return nil, fmt.Errorf("RSS URL пуст")
	}
	if err := validateWorkflowHTTPURL(feedURL); err != nil {
		return nil, err
	}

	client := workflowHTTPClient(20 * time.Second)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, feedURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Postilka-RSS/1.0")
	req.Header.Set("Accept", "application/rss+xml, application/xml, text/xml")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("RSS fetch HTTP %d", resp.StatusCode)
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, workflowHTTPMaxBody))
	if err != nil {
		return nil, err
	}

	var feed rssFeed
	if err := xml.Unmarshal(raw, &feed); err != nil {
		return nil, fmt.Errorf("parse RSS: %w", err)
	}

	items := make([]RSSFeedItem, 0, len(feed.Channel.Items))
	for _, it := range feed.Channel.Items {
		content := strings.TrimSpace(it.Content)
		if content == "" {
			content = strings.TrimSpace(it.Description)
		}
		guid := strings.TrimSpace(it.GUID)
		if guid == "" {
			guid = strings.TrimSpace(it.Link)
		}
		if guid == "" {
			guid = strings.TrimSpace(it.Title)
		}
		if guid == "" {
			continue
		}
		pubDate, _ := time.Parse(time.RFC1123Z, strings.TrimSpace(it.PubDate))
		if pubDate.IsZero() {
			pubDate, _ = time.Parse(time.RFC1123, strings.TrimSpace(it.PubDate))
		}
		items = append(items, RSSFeedItem{
			Title:       strings.TrimSpace(it.Title),
			Link:        strings.TrimSpace(it.Link),
			Description: strings.TrimSpace(it.Description),
			Content:     content,
			PubDate:     pubDate,
			GUID:        guid,
			Author:      strings.TrimSpace(it.Author),
		})
	}
	return items, nil
}

func rssItemToTriggerInputs(item RSSFeedItem) map[string]interface{} {
	pubDate := ""
	if !item.PubDate.IsZero() {
		pubDate = item.PubDate.UTC().Format(time.RFC3339)
	}
	return map[string]interface{}{
		"title":       item.Title,
		"link":        item.Link,
		"description": item.Description,
		"content":     item.Content,
		"pub_date":    pubDate,
		"guid":        item.GUID,
		"author":      item.Author,
	}
}

func (s *WorkflowService) ProcessRSSFeeds(ctx context.Context) (int, error) {
	workflows, err := s.repo.ListDueRSSWorkflows(ctx, 30)
	if err != nil {
		return 0, err
	}

	processed := 0
	for _, wf := range workflows {
		n, err := s.processSingleRSSWorkflow(ctx, &wf)
		if err != nil && s.logger != nil {
			s.logger.Warn("rss workflow poll failed", "workflow_id", wf.ID, "err", err)
		}
		processed += n
	}
	return processed, nil
}

func (s *WorkflowService) processSingleRSSWorkflow(ctx context.Context, wf *model.Workflow) (int, error) {
	feedURL := strings.TrimSpace(wf.RSSFeedURL)
	if feedURL == "" {
		s.syncWorkflowMetaFromGraph(wf)
		feedURL = strings.TrimSpace(wf.RSSFeedURL)
	}
	if feedURL == "" {
		return 0, fmt.Errorf("rss feed url empty")
	}

	interval := wf.RSSPollIntervalMinutes
	if interval <= 0 {
		interval = 15
	}
	nextRun := time.Now().Add(time.Duration(interval) * time.Minute)
	_ = s.repo.UpdateNextRunAt(ctx, wf.ID, &nextRun)

	items, err := fetchRSSFeed(ctx, feedURL)
	if err != nil {
		return 0, err
	}

	hasSeen, _ := s.repo.HasAnyRSSSeen(ctx, wf.ID)
	if !hasSeen {
		for _, item := range items {
			itemKey := item.GUID
			if itemKey == "" {
				itemKey = item.Link
			}
			if itemKey != "" {
				_ = s.repo.MarkRSSItemSeen(ctx, wf.ID, itemKey)
			}
		}
		return 0, nil
	}

	maxItems := 1
	if triggerNode := findTriggerNode(wf.Graph); triggerNode != nil {
		maxItems = getInt(triggerNode.Data, "rssMaxItemsPerRun", 1)
		if maxItems <= 0 {
			maxItems = 1
		}
		if maxItems > 10 {
			maxItems = 10
		}
	}

	started := 0
	for i := len(items) - 1; i >= 0 && started < maxItems; i-- {
		item := items[i]
		itemKey := item.GUID
		if itemKey == "" {
			itemKey = item.Link
		}
		seen, err := s.repo.IsRSSItemSeen(ctx, wf.ID, itemKey)
		if err != nil || seen {
			continue
		}

		inputs := rssItemToTriggerInputs(item)
		_, err = s.TriggerRun(ctx, wf.ID, wf.WorkspaceID, "", "rss", inputs)
		if err != nil {
			if s.logger != nil {
				s.logger.Warn("rss trigger run failed", "workflow_id", wf.ID, "guid", itemKey, "err", err)
			}
			continue
		}
		_ = s.repo.MarkRSSItemSeen(ctx, wf.ID, itemKey)
		started++
	}
	return started, nil
}

func findTriggerNode(graph model.WorkflowGraph) *model.WorkflowNode {
	for i := range graph.Nodes {
		if graph.Nodes[i].Type == "trigger" {
			return &graph.Nodes[i]
		}
	}
	return nil
}
