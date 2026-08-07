package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
)

const (
	vkMaxWallPhotos = 10
	vkMaxPhotoBytes = 25 << 20  // 25 MiB
	vkMaxVideoBytes = 200 << 20 // 200 MiB
)

// VKMediaSource is a photo or video payload for wall.post.
// Provide URL (downloaded at publish time) or Data with optional Filename.
type VKMediaSource struct {
	URL      string
	Data     []byte
	Filename string
}

type VKWallPostInput struct {
	Message string
	Photos  []VKMediaSource
	Video   *VKMediaSource
}

type vkUploadPhotoResponse struct {
	Server int64  `json:"server"`
	Photo  string `json:"photo"`
	Hash   string `json:"hash"`
}

type vkSavedPhoto struct {
	ID      int64 `json:"id"`
	OwnerID int64 `json:"owner_id"`
}

type vkVideoSaveResponse struct {
	UploadURL string `json:"upload_url"`
	VideoID   int64  `json:"video_id"`
	OwnerID   int64  `json:"owner_id"`
}

func (c *VKCommunityClient) PostWall(
	ctx context.Context,
	accessToken string,
	ownerID int64,
	in VKWallPostInput,
) (int64, error) {
	if ownerID >= 0 {
		return 0, fmt.Errorf("vk wall.post: owner_id сообщества должен быть отрицательным")
	}
	groupID := -ownerID
	if in.Video != nil && len(in.Photos) > 0 {
		return 0, fmt.Errorf("vk wall.post: нельзя публиковать фото и видео в одном посте")
	}
	if len(in.Photos) > vkMaxWallPhotos {
		return 0, fmt.Errorf("vk wall.post: не более %d фото в одном посте", vkMaxWallPhotos)
	}

	attachments := make([]string, 0, len(in.Photos)+1)
	for _, photo := range in.Photos {
		att, err := c.uploadWallPhoto(ctx, accessToken, groupID, photo)
		if err != nil {
			return 0, err
		}
		attachments = append(attachments, att)
	}
	if in.Video != nil {
		att, err := c.uploadWallVideo(ctx, accessToken, groupID, in.Message, *in.Video)
		if err != nil {
			return 0, err
		}
		attachments = append(attachments, att)
	}

	message := strings.TrimSpace(in.Message)
	if message == "" && len(attachments) == 0 {
		return 0, fmt.Errorf("vk wall.post: нужен текст или медиа")
	}
	return c.postWall(ctx, accessToken, ownerID, message, attachments)
}

func (c *VKCommunityClient) postWall(
	ctx context.Context,
	accessToken string,
	ownerID int64,
	message string,
	attachments []string,
) (int64, error) {
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("owner_id", strconv.FormatInt(ownerID, 10))
	values.Set("from_group", "1")
	if message != "" {
		values.Set("message", message)
	}
	if len(attachments) > 0 {
		values.Set("attachments", strings.Join(attachments, ","))
	}

	body, err := c.apiPOST(ctx, "wall.post", values)
	if err != nil {
		return 0, err
	}
	var parsed struct {
		Response struct {
			PostID int64 `json:"post_id"`
		} `json:"response"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return 0, err
	}
	return parsed.Response.PostID, nil
}

func (c *VKCommunityClient) uploadWallPhoto(
	ctx context.Context,
	accessToken string,
	groupID int64,
	src VKMediaSource,
) (string, error) {
	data, filename, err := c.resolveMedia(ctx, src, vkMaxPhotoBytes, "photo.jpg")
	if err != nil {
		return "", err
	}

	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("group_id", strconv.FormatInt(groupID, 10))

	body, err := c.apiGET(ctx, "photos.getWallUploadServer", values)
	if err != nil {
		return "", err
	}
	var uploadServer struct {
		Response struct {
			UploadURL string `json:"upload_url"`
		} `json:"response"`
	}
	if err := json.Unmarshal(body, &uploadServer); err != nil {
		return "", err
	}
	uploadURL := strings.TrimSpace(uploadServer.Response.UploadURL)
	if uploadURL == "" {
		return "", fmt.Errorf("vk photos.getWallUploadServer: пустой upload_url")
	}

	uploaded, err := c.uploadMultipart(ctx, uploadURL, "photo", filename, data)
	if err != nil {
		return "", err
	}
	var uploadResp vkUploadPhotoResponse
	if err := json.Unmarshal(uploaded, &uploadResp); err != nil {
		return "", fmt.Errorf("vk photo upload: %w", err)
	}

	saveValues := url.Values{}
	saveValues.Set("access_token", accessToken)
	saveValues.Set("v", vkAPIVersion)
	saveValues.Set("group_id", strconv.FormatInt(groupID, 10))
	saveValues.Set("server", strconv.FormatInt(uploadResp.Server, 10))
	saveValues.Set("photo", uploadResp.Photo)
	saveValues.Set("hash", uploadResp.Hash)

	saveBody, err := c.apiPOST(ctx, "photos.saveWallPhoto", saveValues)
	if err != nil {
		return "", err
	}
	var saved struct {
		Response []vkSavedPhoto `json:"response"`
	}
	if err := json.Unmarshal(saveBody, &saved); err != nil {
		return "", err
	}
	if len(saved.Response) == 0 {
		return "", fmt.Errorf("vk photos.saveWallPhoto: пустой ответ")
	}
	photo := saved.Response[0]
	return fmt.Sprintf("photo%d_%d", photo.OwnerID, photo.ID), nil
}

func (c *VKCommunityClient) uploadWallVideo(
	ctx context.Context,
	accessToken string,
	groupID int64,
	description string,
	src VKMediaSource,
) (string, error) {
	data, filename, err := c.resolveMedia(ctx, src, vkMaxVideoBytes, "video.mp4")
	if err != nil {
		return "", err
	}

	desc := strings.TrimSpace(description)
	name := desc
	if name == "" {
		name = strings.TrimSuffix(filename, path.Ext(filename))
	}
	if name == "" {
		name = "video"
	}
	if len(name) > 128 {
		name = name[:128]
	}

	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("group_id", strconv.FormatInt(groupID, 10))
	values.Set("name", name)
	if desc != "" {
		values.Set("description", desc)
	}

	body, err := c.apiPOST(ctx, "video.save", values)
	if err != nil {
		return "", err
	}
	var saved vkVideoSaveResponse
	var wrapped struct {
		Response vkVideoSaveResponse `json:"response"`
	}
	if err := json.Unmarshal(body, &wrapped); err != nil {
		return "", err
	}
	saved = wrapped.Response
	uploadURL := strings.TrimSpace(saved.UploadURL)
	if uploadURL == "" {
		return "", fmt.Errorf("vk video.save: пустой upload_url")
	}
	if saved.VideoID == 0 {
		return "", fmt.Errorf("vk video.save: пустой video_id")
	}

	if _, err := c.uploadMultipart(ctx, uploadURL, "video_file", filename, data); err != nil {
		return "", err
	}
	ownerID := saved.OwnerID
	if ownerID == 0 {
		ownerID = -groupID
	}
	return fmt.Sprintf("video%d_%d", ownerID, saved.VideoID), nil
}

func (c *VKCommunityClient) resolveMedia(
	ctx context.Context,
	src VKMediaSource,
	maxBytes int64,
	defaultName string,
) ([]byte, string, error) {
	if len(src.Data) > 0 {
		if int64(len(src.Data)) > maxBytes {
			return nil, "", fmt.Errorf("медиафайл слишком большой (лимит %d МБ)", maxBytes>>20)
		}
		name := strings.TrimSpace(src.Filename)
		if name == "" {
			name = defaultName
		}
		return src.Data, name, nil
	}
	rawURL := strings.TrimSpace(src.URL)
	if rawURL == "" {
		return nil, "", fmt.Errorf("медиафайл не задан")
	}
	return c.downloadMedia(ctx, rawURL, maxBytes, defaultName)
}

func (c *VKCommunityClient) downloadMedia(
	ctx context.Context,
	rawURL string,
	maxBytes int64,
	defaultName string,
) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("загрузка медиа: HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil {
		return nil, "", err
	}
	if int64(len(data)) > maxBytes {
		return nil, "", fmt.Errorf("медиафайл слишком большой (лимит %d МБ)", maxBytes>>20)
	}
	name := filenameFromURL(rawURL, resp.Header.Get("Content-Type"), defaultName)
	return data, name, nil
}

func filenameFromURL(rawURL, contentType, fallback string) string {
	if u, err := url.Parse(rawURL); err == nil {
		if base := path.Base(u.Path); base != "" && base != "." && base != "/" {
			return base
		}
	}
	ct := strings.ToLower(strings.TrimSpace(contentType))
	switch {
	case strings.Contains(ct, "jpeg"), strings.Contains(ct, "jpg"):
		return "photo.jpg"
	case strings.Contains(ct, "png"):
		return "photo.png"
	case strings.Contains(ct, "webp"):
		return "photo.webp"
	case strings.Contains(ct, "mp4"):
		return "video.mp4"
	case strings.Contains(ct, "quicktime"):
		return "video.mov"
	default:
		return fallback
	}
}

func (c *VKCommunityClient) uploadMultipart(
	ctx context.Context,
	uploadURL, fieldName, filename string,
	data []byte,
) ([]byte, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile(fieldName, filename)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(data); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("vk upload: HTTP %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

func (c *VKCommunityClient) apiGET(ctx context.Context, method string, values url.Values) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, vkAPIBase+"/"+method+"?"+values.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	return body, c.parseAPIBody(method, body, resp.StatusCode)
}

func (c *VKCommunityClient) apiPOST(ctx context.Context, method string, values url.Values) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, vkAPIBase+"/"+method, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	return body, c.parseAPIBody(method, body, resp.StatusCode)
}

func (c *VKCommunityClient) parseAPIBody(method string, body []byte, statusCode int) error {
	if statusCode >= 400 {
		return fmt.Errorf("vk %s: HTTP %d: %s", method, statusCode, string(body))
	}
	var parsed struct {
		Error *struct {
			ErrorMsg string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil
	}
	if parsed.Error != nil {
		return fmt.Errorf("vk %s: %s", method, parsed.Error.ErrorMsg)
	}
	return nil
}
