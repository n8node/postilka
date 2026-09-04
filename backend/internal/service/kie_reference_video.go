package service

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
)

const kieReferenceVideoMaxBytes = 50 << 20

var ErrKieReferenceVideoConvert = errors.New("could not convert reference video to MP4")

type preparedKieReferenceVideo struct {
	Data        []byte
	ContentType string
	FilenameExt string
	DurationSec float64
}

func isProbablyVideo(contentType, filename string) bool {
	ct := strings.ToLower(strings.TrimSpace(contentType))
	if strings.HasPrefix(ct, "video/") {
		return true
	}
	switch strings.ToLower(path.Ext(filename)) {
	case ".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi", ".mpeg", ".mpg", ".wmv", ".flv", ".3gp", ".ts":
		return true
	default:
		return false
	}
}

func kieReferenceVideoKind(contentType, filename string) string {
	ct := strings.ToLower(strings.TrimSpace(contentType))
	ext := strings.ToLower(path.Ext(filename))
	switch {
	case strings.Contains(ct, "webm") || ext == ".webm":
		return "webm"
	case strings.Contains(ct, "quicktime") || ext == ".mov":
		return "mov"
	case strings.Contains(ct, "matroska") || ext == ".mkv":
		return "mkv"
	case strings.Contains(ct, "avi") || ext == ".avi":
		return "avi"
	case ext == ".m4v" || strings.Contains(ct, "mp4") || ext == ".mp4":
		return "mp4"
	default:
		return "other"
	}
}

func isKieNativeReferenceVideo(contentType, filename string) bool {
	switch kieReferenceVideoKind(contentType, filename) {
	case "mp4", "mov":
		return true
	default:
		return false
	}
}

func kieMediaMaxBytes(contentType, filename string) int64 {
	if n := kieUploadMaxBytes(contentType); n > 0 {
		return n
	}
	if isProbablyVideo(contentType, filename) {
		return kieReferenceVideoMaxBytes
	}
	return 0
}

// prepareKieReferenceVideo keeps MP4/MOV as-is for users, or transcodes
// other containers (WebM, MKV, …) to MP4 H.264 + AAC. Admin catalog
// always stores MP4 when forceMP4 is true.
func prepareKieReferenceVideo(data []byte, contentType, filename string, forceMP4 bool) (preparedKieReferenceVideo, error) {
	if len(data) == 0 {
		return preparedKieReferenceVideo{}, ErrGenerationUploadInvalid
	}
	contentType = strings.Split(strings.TrimSpace(contentType), ";")[0]
	if !isProbablyVideo(contentType, filename) {
		return preparedKieReferenceVideo{}, ErrGenerationUploadInvalid
	}
	if int64(len(data)) > kieReferenceVideoMaxBytes {
		return preparedKieReferenceVideo{}, ErrGenerationUploadInvalid
	}

	native := isKieNativeReferenceVideo(contentType, filename)
	if native && !forceMP4 {
		dur, err := probeVideoDurationSeconds(data)
		if err != nil {
			return preparedKieReferenceVideo{}, ErrGenerationUploadInvalid
		}
		if err := validateReferenceVideoDuration(dur); err != nil {
			return preparedKieReferenceVideo{}, err
		}
		outCT := contentType
		if outCT == "" || !strings.HasPrefix(strings.ToLower(outCT), "video/") {
			if kieReferenceVideoKind(contentType, filename) == "mov" {
				outCT = "video/quicktime"
			} else {
				outCT = "video/mp4"
			}
		}
		ext := ".mp4"
		if kieReferenceVideoKind(contentType, filename) == "mov" {
			ext = ".mov"
		}
		return preparedKieReferenceVideo{
			Data:        data,
			ContentType: outCT,
			FilenameExt: ext,
			DurationSec: dur,
		}, nil
	}

	if native && forceMP4 && kieReferenceVideoKind(contentType, filename) == "mp4" {
		dur, err := probeVideoDurationSeconds(data)
		if err != nil {
			return preparedKieReferenceVideo{}, ErrGenerationUploadInvalid
		}
		if err := validateReferenceVideoDuration(dur); err != nil {
			return preparedKieReferenceVideo{}, err
		}
		outCT := contentType
		if outCT == "" || !strings.HasPrefix(strings.ToLower(outCT), "video/") {
			outCT = "video/mp4"
		}
		return preparedKieReferenceVideo{
			Data:        data,
			ContentType: outCT,
			FilenameExt: ".mp4",
			DurationSec: dur,
		}, nil
	}

	converted, err := transcodeToKieReferenceMP4(data, filename)
	if err != nil {
		return preparedKieReferenceVideo{}, fmt.Errorf("%w: %v", ErrKieReferenceVideoConvert, err)
	}
	if int64(len(converted)) > kieReferenceVideoMaxBytes {
		return preparedKieReferenceVideo{}, ErrGenerationUploadInvalid
	}
	dur, err := probeVideoDurationSeconds(converted)
	if err != nil {
		return preparedKieReferenceVideo{}, fmt.Errorf("%w: %v", ErrKieReferenceVideoConvert, err)
	}
	if err := validateReferenceVideoDuration(dur); err != nil {
		return preparedKieReferenceVideo{}, err
	}
	return preparedKieReferenceVideo{
		Data:        converted,
		ContentType: "video/mp4",
		FilenameExt: ".mp4",
		DurationSec: dur,
	}, nil
}

func transcodeToKieReferenceMP4(data []byte, filename string) ([]byte, error) {
	dir, err := os.MkdirTemp("", "postilka-kie-ref-video-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	ext := strings.ToLower(path.Ext(filename))
	if ext == "" {
		ext = ".bin"
	}
	inPath := filepath.Join(dir, "input"+ext)
	outPath := filepath.Join(dir, "out.mp4")
	if err := os.WriteFile(inPath, data, 0o600); err != nil {
		return nil, err
	}

	cmd := exec.Command(
		"ffmpeg",
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inPath,
		"-map", "0:v:0",
		"-map", "0:a:0?",
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-preset", "veryfast",
		"-crf", "23",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart",
		outPath,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg: %w: %s", err, strings.TrimSpace(string(out)))
	}
	converted, err := os.ReadFile(outPath)
	if err != nil {
		return nil, err
	}
	if len(converted) == 0 {
		return nil, fmt.Errorf("ffmpeg returned empty file")
	}
	return converted, nil
}
