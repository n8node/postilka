package service

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

const backupS3Prefix = "platform-backups/"

type backupResult struct {
	S3Key      string
	LocalName  string
	SizeBytes  int64
	MediaFiles int
}

func (s *BackupService) buildAndStore(ctx context.Context) (*backupResult, error) {
	st, err := s.storage.settings.GetEffective(ctx)
	if err != nil {
		return nil, err
	}
	if !StorageConfigured(st) {
		return nil, ErrBackupStorage
	}

	stamp := time.Now().UTC().Format("2006-01-02_1504")
	name := "postilka-full-" + stamp + ".tar.gz"
	dir := s.backupDir()
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, fmt.Errorf("не удалось создать каталог бекапов: %w", err)
	}
	work := filepath.Join(dir, "work-"+stamp)
	if err := os.MkdirAll(work, 0o750); err != nil {
		return nil, err
	}
	defer os.RemoveAll(work)

	media, err := s.repo.ListMediaManifest(ctx)
	if err != nil {
		return nil, fmt.Errorf("манифест медиа: %w", err)
	}
	if media == nil {
		media = []model.MediaManifestFile{}
	}

	if err := s.dumpPostgres(ctx, filepath.Join(work, "postgres.sql.gz")); err != nil {
		return nil, err
	}
	if err := s.dumpMySQL(ctx, filepath.Join(work, "mysql.sql.gz")); err != nil {
		return nil, err
	}
	if err := s.dumpWordPress(ctx, filepath.Join(work, "wordpress-html.tar.gz")); err != nil {
		return nil, err
	}
	if err := copyIfExists(filepath.Join(s.backupSrcDir(), "dotenv"), filepath.Join(work, "dotenv")); err != nil {
		return nil, fmt.Errorf("файл .env: %w", err)
	}
	if err := copyDirIfExists(filepath.Join(s.backupSrcDir(), "ssl"), filepath.Join(work, "ssl")); err != nil {
		return nil, fmt.Errorf("ssl: %w", err)
	}

	manifest := map[string]any{
		"created_at":        time.Now().UTC().Format(time.RFC3339),
		"includes":          []string{"postgres", "mysql", "wordpress-html", "dotenv", "ssl", "media-manifest"},
		"excludes":          []string{"workspace media blobs in S3 (keys only)"},
		"s3_media_bucket":   st.Bucket,
		"s3_media_endpoint": st.Endpoint,
		"s3_media_region":   st.Region,
		"media_file_count":  len(media),
		"restore":           "cd /opt/postilka && bash scripts/restore-full.sh --latest",
		"note":              "Каналы и OAuth-токены в postgres.sql.gz (шифр с ENCRYPTION_KEY/JWT_SECRET из dotenv). Пользовательские файлы остаются в бакете медиа по s3_key.",
	}
	if err := writeJSONFile(filepath.Join(work, "manifest.json"), manifest); err != nil {
		return nil, err
	}
	if err := writeJSONFile(filepath.Join(work, "media-manifest.json"), map[string]any{
		"bucket":   st.Bucket,
		"endpoint": st.Endpoint,
		"region":   st.Region,
		"files":    media,
	}); err != nil {
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(work, "RESTORE.txt"), []byte(
		"Восстановление одной командой на сервере:\n\n"+
			"  cd /opt/postilka && bash scripts/restore-full.sh /путь/к/"+name+"\n\n"+
			"или из последнего локального архива:\n\n"+
			"  cd /opt/postilka && bash scripts/restore-full.sh --latest\n",
	), 0o644); err != nil {
		return nil, err
	}

	archivePath := filepath.Join(dir, name)
	if err := tarGzDir(work, archivePath); err != nil {
		return nil, fmt.Errorf("упаковка архива: %w", err)
	}
	info, err := os.Stat(archivePath)
	if err != nil {
		return nil, err
	}

	s3Key := backupS3Prefix + name
	if err := s.storage.PutObjectFromFile(ctx, s3Key, "application/gzip", archivePath); err != nil {
		return &backupResult{LocalName: name, SizeBytes: info.Size(), MediaFiles: len(media)}, fmt.Errorf("загрузка в S3: %w", err)
	}

	settings, _ := s.getSettings(ctx)
	retain := 7
	if settings != nil && settings.RetainCount > 0 {
		retain = settings.RetainCount
	}
	s.pruneLocal(dir, retain)
	if err := s.pruneS3(ctx, retain); err != nil {
		s.logger.Warn("prune s3 backups", "error", err)
	}
	_ = os.WriteFile(filepath.Join(dir, "LATEST"), []byte(name+"\n"+s3Key+"\n"), 0o640)

	return &backupResult{
		S3Key:      s3Key,
		LocalName:  name,
		SizeBytes:  info.Size(),
		MediaFiles: len(media),
	}, nil
}

func (s *BackupService) dumpPostgres(ctx context.Context, dest string) error {
	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" && s.cfg != nil {
		dbURL = s.cfg.DatabaseURL
	}
	if dbURL == "" {
		return fmt.Errorf("нет DATABASE_URL для pg_dump")
	}
	cmd := exec.CommandContext(ctx, "pg_dump", "--no-owner", "--no-acl", "--dbname="+dbURL)
	return gzipCommand(cmd, dest)
}

func (s *BackupService) dumpMySQL(ctx context.Context, dest string) error {
	host := getenv("WP_DB_HOST", "mysql")
	user := firstNonEmpty(os.Getenv("WP_DB_ROOT_USER"), "root")
	pass := os.Getenv("WP_DB_ROOT_PASSWORD")
	if pass == "" {
		pass = os.Getenv("MYSQL_ROOT_PASSWORD")
	}
	if pass == "" {
		return fmt.Errorf("нет WP_DB_ROOT_PASSWORD для mysqldump")
	}
	cmd := exec.CommandContext(ctx, "mysqldump",
		"-h", host,
		"-u", user,
		"--single-transaction",
		"--routines",
		"--triggers",
		"--all-databases",
	)
	cmd.Env = append(os.Environ(), "MYSQL_PWD="+pass)
	return gzipCommand(cmd, dest)
}

func (s *BackupService) dumpWordPress(ctx context.Context, dest string) error {
	id, err := dockerComposeServiceID(ctx, "wordpress")
	if err == nil && id != "" {
		cmd := exec.CommandContext(ctx, "docker", "exec", id, "tar", "-C", "/var/www/html", "-czf", "-", ".")
		out, createErr := os.Create(dest)
		if createErr != nil {
			return createErr
		}
		cmd.Stdout = out
		var stderr strings.Builder
		cmd.Stderr = &stderr
		runErr := cmd.Run()
		_ = out.Close()
		if runErr == nil {
			return nil
		}
		s.logger.Warn("wordpress docker tar failed, using bind mounts", "error", runErr, "stderr", strings.TrimSpace(stderr.String()))
		_ = os.Remove(dest)
	}

	fallback := filepath.Join(filepath.Dir(dest), "wordpress-fallback")
	if err := os.MkdirAll(fallback, 0o750); err != nil {
		return err
	}
	_ = copyDirIfExists(filepath.Join(s.backupSrcDir(), "wp-uploads"), filepath.Join(fallback, "uploads"))
	_ = copyDirIfExists(filepath.Join(s.backupSrcDir(), "wordpress-git"), filepath.Join(fallback, "wordpress-git"))
	if err := tarGzDir(fallback, dest); err != nil {
		return fmt.Errorf("wordpress files: %w", err)
	}
	return nil
}

func (s *BackupService) pruneLocal(dir string, retain int) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "postilka-full-") && strings.HasSuffix(e.Name(), ".tar.gz") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	if len(names) <= retain {
		return
	}
	for _, name := range names[:len(names)-retain] {
		_ = os.Remove(filepath.Join(dir, name))
	}
}

func (s *BackupService) pruneS3(ctx context.Context, retain int) error {
	keys, err := s.storage.ListPrefix(ctx, backupS3Prefix)
	if err != nil {
		return err
	}
	var archives []string
	for _, k := range keys {
		if strings.HasSuffix(k, ".tar.gz") {
			archives = append(archives, k)
		}
	}
	sort.Strings(archives)
	if len(archives) <= retain {
		return nil
	}
	for _, key := range archives[:len(archives)-retain] {
		if err := s.storage.DeleteObject(ctx, key); err != nil {
			s.logger.Warn("delete old backup object", "key", key, "error", err)
		}
	}
	return nil
}

func gzipCommand(cmd *exec.Cmd, dest string) error {
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	gz := gzip.NewWriter(out)
	defer gz.Close()
	cmd.Stdout = gz
	var stderr strings.Builder
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: %w (%s)", cmd.Path, err, strings.TrimSpace(stderr.String()))
	}
	return gz.Close()
}

func dockerComposeServiceID(ctx context.Context, service string) (string, error) {
	cmd := exec.CommandContext(ctx, "docker", "ps", "-q", "--filter", "label=com.docker.compose.service="+service)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	id := strings.TrimSpace(strings.Split(string(out), "\n")[0])
	if id == "" {
		return "", fmt.Errorf("container %s not found", service)
	}
	return id, nil
}

func tarGzDir(srcDir, dest string) error {
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	gz := gzip.NewWriter(out)
	defer gz.Close()
	tw := tar.NewWriter(gz)
	defer tw.Close()

	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if path == srcDir {
			return nil
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if info.IsDir() {
			hdr, err := tar.FileInfoHeader(info, "")
			if err != nil {
				return err
			}
			hdr.Name = rel + "/"
			return tw.WriteHeader(hdr)
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		hdr, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		hdr.Name = rel
		if err := tw.WriteHeader(hdr); err != nil {
			return err
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(tw, f)
		_ = f.Close()
		return copyErr
	})
}

func copyIfExists(src, dest string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return os.WriteFile(dest, data, 0o600)
}

func copyDirIfExists(src, dest string) error {
	info, err := os.Stat(src)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if !info.IsDir() {
		return nil
	}
	return filepath.Walk(src, func(path string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dest, rel)
		if fi.IsDir() {
			return os.MkdirAll(target, 0o750)
		}
		if !fi.Mode().IsRegular() {
			return nil
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o750); err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create(target)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	})
}

func writeJSONFile(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func getenv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
