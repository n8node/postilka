package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/postilka/postilka/internal/model"
)

type ObjectStorage struct {
	settings *StorageSettingsService
}

func NewObjectStorage(settings *StorageSettingsService) *ObjectStorage {
	return &ObjectStorage{settings: settings}
}

func (o *ObjectStorage) client(ctx context.Context) (*s3.Client, model.StorageSettings, error) {
	st, err := o.settings.GetEffective(ctx)
	if err != nil {
		return nil, model.StorageSettings{}, err
	}
	if !StorageConfigured(st) {
		return nil, st, ErrStorageNotConfigured
	}
	c, err := newS3Client(st)
	if err != nil {
		return nil, st, err
	}
	return c, st, nil
}

type PresignedUpload struct {
	URL     string
	Headers map[string]string
}

func (o *ObjectStorage) PresignPut(ctx context.Context, s3Key, contentType string, expires time.Duration) (*PresignedUpload, error) {
	client, st, err := o.client(ctx)
	if err != nil {
		return nil, err
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	presign := s3.NewPresignClient(client)
	out, err := presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(st.Bucket),
		Key:         aws.String(s3Key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(expires))
	if err != nil {
		return nil, err
	}
	headers := map[string]string{
		"Content-Type": contentType,
	}
	for k, vals := range out.SignedHeader {
		if len(vals) > 0 {
			headers[k] = vals[0]
		}
	}
	return &PresignedUpload{URL: out.URL, Headers: headers}, nil
}

func (o *ObjectStorage) UploadBytes(ctx context.Context, s3Key, contentType string, data []byte) error {
	client, st, err := o.client(ctx)
	if err != nil {
		return err
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(st.Bucket), Key: aws.String(s3Key),
		ContentType: aws.String(contentType), Body: bytes.NewReader(data),
	})
	return err
}

func (o *ObjectStorage) PresignGet(ctx context.Context, s3Key string, expires time.Duration, filename string) (string, error) {
	return o.PresignGetWithOptions(ctx, s3Key, PresignGetOptions{
		Expires:  expires,
		Filename: filename,
	})
}

type PresignGetOptions struct {
	Expires      time.Duration
	Filename     string
	Inline       bool
	CacheControl string
}

func (o *ObjectStorage) PresignGetWithOptions(ctx context.Context, s3Key string, opts PresignGetOptions) (string, error) {
	client, st, err := o.client(ctx)
	if err != nil {
		return "", err
	}
	if opts.Expires <= 0 {
		opts.Expires = 15 * time.Minute
	}
	presign := s3.NewPresignClient(client)
	input := &s3.GetObjectInput{
		Bucket: aws.String(st.Bucket),
		Key:    aws.String(s3Key),
	}
	if opts.Inline {
		input.ResponseContentDisposition = aws.String("inline")
	} else if opts.Filename != "" {
		input.ResponseContentDisposition = aws.String(`attachment; filename="` + sanitizeFilename(opts.Filename) + `"`)
	}
	if opts.CacheControl != "" {
		input.ResponseCacheControl = aws.String(opts.CacheControl)
	}
	out, err := presign.PresignGetObject(ctx, input, s3.WithPresignExpires(opts.Expires))
	if err != nil {
		return "", err
	}
	return out.URL, nil
}

type HeadObjectResult struct {
	Size        int64
	ContentType string
}

func (o *ObjectStorage) GetObject(ctx context.Context, s3Key string) (io.ReadCloser, string, error) {
	client, st, err := o.client(ctx)
	if err != nil {
		return nil, "", err
	}
	out, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(st.Bucket),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		return nil, "", err
	}
	contentType := "application/octet-stream"
	if out.ContentType != nil && strings.TrimSpace(*out.ContentType) != "" {
		contentType = *out.ContentType
	}
	return out.Body, contentType, nil
}

func (o *ObjectStorage) HeadObject(ctx context.Context, s3Key string) (*HeadObjectResult, error) {
	client, st, err := o.client(ctx)
	if err != nil {
		return nil, err
	}
	out, err := client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(st.Bucket),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		return nil, err
	}
	var size int64
	if out.ContentLength != nil {
		size = *out.ContentLength
	}
	ct := ""
	if out.ContentType != nil {
		ct = *out.ContentType
	}
	return &HeadObjectResult{Size: size, ContentType: ct}, nil
}

func (o *ObjectStorage) CopyObject(ctx context.Context, srcKey, dstKey string) error {
	client, st, err := o.client(ctx)
	if err != nil {
		return err
	}
	_, err = client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     aws.String(st.Bucket),
		Key:        aws.String(dstKey),
		CopySource: aws.String(encodeCopySource(st.Bucket, srcKey)),
	})
	return err
}

func (o *ObjectStorage) DeleteObject(ctx context.Context, s3Key string) error {
	client, st, err := o.client(ctx)
	if err != nil {
		return err
	}
	_, err = client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(st.Bucket),
		Key:    aws.String(s3Key),
	})
	return err
}

func (o *ObjectStorage) PutObjectFromFile(ctx context.Context, s3Key, contentType, path string) error {
	client, st, err := o.client(ctx)
	if err != nil {
		return err
	}
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return err
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	// Use one PutObject request instead of the SDK multipart uploader. Beget's
	// S3-compatible endpoint rejects multipart UploadPart checksum validation
	// with XAmzContentSHA256Mismatch. Backup archives are built locally first,
	// so a single request is deterministic and avoids that incompatibility.
	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(st.Bucket),
		Key:           aws.String(s3Key),
		Body:          f,
		ContentLength: aws.Int64(info.Size()),
		ContentType:   aws.String(contentType),
	})
	return err
}

func (o *ObjectStorage) ListPrefix(ctx context.Context, prefix string) ([]string, error) {
	client, st, err := o.client(ctx)
	if err != nil {
		return nil, err
	}
	var keys []string
	paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
		Bucket: aws.String(st.Bucket),
		Prefix: aws.String(prefix),
	})
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, obj := range page.Contents {
			if obj.Key != nil {
				keys = append(keys, *obj.Key)
			}
		}
	}
	return keys, nil
}

func (o *ObjectStorage) PutObject(ctx context.Context, s3Key, contentType string, data []byte) error {
	return o.PutObjectWithCacheControl(ctx, s3Key, contentType, "", data)
}

func (o *ObjectStorage) PutObjectWithCacheControl(ctx context.Context, s3Key, contentType, cacheControl string, data []byte) error {
	client, st, err := o.client(ctx)
	if err != nil {
		return err
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	input := &s3.PutObjectInput{
		Bucket:      aws.String(st.Bucket),
		Key:         aws.String(s3Key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	}
	if cc := strings.TrimSpace(cacheControl); cc != "" {
		input.CacheControl = aws.String(cc)
	}
	_, err = client.PutObject(ctx, input)
	return err
}

func encodeCopySource(bucket, key string) string {
	parts := strings.Split(key, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return bucket + "/" + strings.Join(parts, "/")
}

func BuildWorkspaceS3Key(workspaceID, fileName string, folderID *string) string {
	safe := buildSafeFileName(fileName)
	ts := time.Now().UnixMilli()
	if folderID != nil && *folderID != "" {
		return fmt.Sprintf("workspaces/%s/files/%s/%d-%s", workspaceID, *folderID, ts, safe)
	}
	return fmt.Sprintf("workspaces/%s/files/%d-%s", workspaceID, ts, safe)
}

func BuildWorkspaceUploadS3Key(workspaceID, fileName, clientUploadID string, folderID *string) string {
	safe := buildSafeFileName(fileName)
	id := buildSafeFileName(clientUploadID)
	if id == "" {
		return BuildWorkspaceS3Key(workspaceID, fileName, folderID)
	}
	if folderID != nil && *folderID != "" {
		return fmt.Sprintf("workspaces/%s/files/%s/upload-%s-%s", workspaceID, *folderID, id, safe)
	}
	return fmt.Sprintf("workspaces/%s/files/upload-%s-%s", workspaceID, id, safe)
}

func buildSafeFileName(fileName string) string {
	ext := ""
	if i := strings.LastIndex(fileName, "."); i > 0 && i < len(fileName)-1 {
		ext = fileName[i:]
		fileName = fileName[:i]
	}
	var b strings.Builder
	for _, r := range fileName {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' || (r >= 0x0400 && r <= 0x04FF) {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	base := strings.Trim(b.String(), "_")
	if base == "" {
		base = "file"
	}
	if len(base) > 100 {
		base = base[:100]
	}
	return base + ext
}

func BuildDuplicateName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "file (дубликат)"
	}
	if i := strings.LastIndex(name, "."); i > 0 && i < len(name)-1 {
		return name[:i] + " (дубликат)" + name[i:]
	}
	return name + " (дубликат)"
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, `"`, `'`)
	if len(name) > 200 {
		return name[:200]
	}
	return name
}

var (
	ErrStorageNotConfigured = fmt.Errorf("storage not configured")
	ErrStorageDisabled      = fmt.Errorf("storage disabled") // reserved for explicit admin kill-switch
)

func fileCategoryFromMime(mimeType, fileName string) string {
	m := strings.ToLower(mimeType)
	n := strings.ToLower(fileName)
	if strings.HasPrefix(m, "image/") {
		return "image"
	}
	if strings.HasPrefix(m, "video/") {
		return "video"
	}
	if strings.HasPrefix(m, "audio/") {
		return "audio"
	}
	if strings.Contains(m, "zip") || strings.Contains(m, "tar") || strings.Contains(m, "rar") {
		return "archive"
	}
	if strings.HasSuffix(n, ".zip") || strings.HasSuffix(n, ".rar") || strings.HasSuffix(n, ".7z") {
		return "archive"
	}
	if strings.HasSuffix(n, ".mp3") || strings.HasSuffix(n, ".wav") || strings.HasSuffix(n, ".ogg") ||
		strings.HasSuffix(n, ".m4a") || strings.HasSuffix(n, ".aac") || strings.HasSuffix(n, ".flac") {
		return "audio"
	}
	return "other"
}
