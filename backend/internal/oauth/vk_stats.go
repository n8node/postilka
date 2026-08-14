package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

type VKWallPostStats struct {
	Views    int
	Likes    int
	Comments int
	Shares   int
}

type VKPostReachStats struct {
	ReachTotal       int
	ReachSubscribers int
	ReachViral       int
	ReachAds         int
	HideCount        int
	ReportCount      int
	JoinCount        int
	LinkClickCount   int
	Available        bool
}

func (c *VKCommunityClient) GetWallPostStats(
	ctx context.Context,
	accessToken string,
	ownerID int64,
	postID int64,
) (*VKWallPostStats, error) {
	postKey := fmt.Sprintf("%d_%d", ownerID, postID)
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("posts", postKey)

	body, err := c.apiGET(ctx, "wall.getById", values)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Response []struct {
			Views *struct {
				Count int `json:"count"`
			} `json:"views"`
			Likes *struct {
				Count int `json:"count"`
			} `json:"likes"`
			Comments *struct {
				Count int `json:"count"`
			} `json:"comments"`
			Reposts *struct {
				Count int `json:"count"`
			} `json:"reposts"`
		} `json:"response"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Response) == 0 {
		return nil, fmt.Errorf("vk wall.getById: запись не найдена")
	}
	item := parsed.Response[0]
	out := &VKWallPostStats{}
	if item.Views != nil {
		out.Views = item.Views.Count
	}
	if item.Likes != nil {
		out.Likes = item.Likes.Count
	}
	if item.Comments != nil {
		out.Comments = item.Comments.Count
	}
	if item.Reposts != nil {
		out.Shares = item.Reposts.Count
	}
	return out, nil
}

func (c *VKCommunityClient) GetPostReach(
	ctx context.Context,
	accessToken string,
	ownerID int64,
	postID int64,
) (*VKPostReachStats, error) {
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("owner_id", strconv.FormatInt(ownerID, 10))
	values.Set("post_ids", strconv.FormatInt(postID, 10))

	body, err := c.apiGET(ctx, "stats.getPostReach", values)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Response []struct {
			ReachTotal       int `json:"reach_total"`
			ReachSubscribers int `json:"reach_subscribers"`
			ReachViral       int `json:"reach_viral"`
			ReachAds         int `json:"reach_ads"`
			HideCount        int `json:"hide_count"`
			ReportCount      int `json:"report_count"`
			JoinCount        int `json:"join_count"`
			LinkClickCount   int `json:"links_click_count"`
		} `json:"response"`
		Error *struct {
			ErrorMsg string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if parsed.Error != nil {
		msg := strings.ToLower(parsed.Error.ErrorMsg)
		if strings.Contains(msg, "access") || strings.Contains(msg, "permission") ||
			strings.Contains(msg, "not enough") || strings.Contains(msg, "method") {
			return &VKPostReachStats{Available: false}, nil
		}
		return nil, fmt.Errorf("vk stats.getPostReach: %s", parsed.Error.ErrorMsg)
	}
	if len(parsed.Response) == 0 {
		return &VKPostReachStats{Available: false}, nil
	}
	item := parsed.Response[0]
	return &VKPostReachStats{
		ReachTotal:       item.ReachTotal,
		ReachSubscribers: item.ReachSubscribers,
		ReachViral:       item.ReachViral,
		ReachAds:         item.ReachAds,
		HideCount:        item.HideCount,
		ReportCount:      item.ReportCount,
		JoinCount:        item.JoinCount,
		LinkClickCount:   item.LinkClickCount,
		Available:        true,
	}, nil
}
