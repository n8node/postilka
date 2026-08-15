package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	adStudioDisplayMaxSide = 720
	adStudioMasterMaxSide  = 2048
	adStudioWebPQuality    = 80
)

func encodeAdStudioDisplayWebP(src []byte) ([]byte, error) {
	if data, err := ffmpegScaleImage(src, adStudioDisplayMaxSide, "webp", []string{
		"-c:v", "libwebp",
		"-quality", strconv.Itoa(adStudioWebPQuality),
		"-compression_level", "4",
	}); err == nil && len(data) > 0 {
		return data, nil
	}
	png, err := ffmpegScaleImage(src, adStudioDisplayMaxSide, "png", nil)
	if err != nil {
		return nil, err
	}
	return cwebpEncode(png, adStudioWebPQuality)
}

func encodeAdStudioMasterJPEG(src []byte) ([]byte, error) {
	return ffmpegScaleImage(src, adStudioMasterMaxSide, "jpg", []string{"-q:v", "3"})
}

func ffmpegScaleImage(src []byte, maxSide int, ext string, encodeArgs []string) ([]byte, error) {
	if len(src) == 0 {
		return nil, fmt.Errorf("empty image")
	}
	dir, err := os.MkdirTemp("", "postilka-ad-studio-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	inPath := filepath.Join(dir, "in.bin")
	outPath := filepath.Join(dir, "out."+ext)
	if err := os.WriteFile(inPath, src, 0o600); err != nil {
		return nil, err
	}

	vf := fmt.Sprintf(
		"scale='if(gt(iw,ih),min(%d\\,iw),-2)':'if(gt(ih,iw),min(%d\\,ih),-2)'",
		maxSide,
		maxSide,
	)
	args := []string{"-y", "-hide_banner", "-loglevel", "error", "-i", inPath, "-vf", vf}
	args = append(args, encodeArgs...)
	args = append(args, outPath)
	cmd := exec.Command("ffmpeg", args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg scale: %w: %s", err, strings.TrimSpace(string(out)))
	}
	return os.ReadFile(outPath)
}

func cwebpEncode(png []byte, quality int) ([]byte, error) {
	dir, err := os.MkdirTemp("", "postilka-ad-studio-webp-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	inPath := filepath.Join(dir, "in.png")
	outPath := filepath.Join(dir, "out.webp")
	if err := os.WriteFile(inPath, png, 0o600); err != nil {
		return nil, err
	}
	cmd := exec.Command(
		"cwebp",
		"-quiet",
		"-q", strconv.Itoa(quality),
		inPath,
		"-o", outPath,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("cwebp: %w: %s", err, strings.TrimSpace(string(out)))
	}
	return os.ReadFile(outPath)
}
