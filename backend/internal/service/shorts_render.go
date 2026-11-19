package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ShortsSubtitleConfig struct {
	Style    string `json:"style"`
	Position string `json:"position"`
}

func NormalizeShortsSubtitleConfig(config ShortsSubtitleConfig) ShortsSubtitleConfig {
	if config.Style != "classic" && config.Style != "bold" && config.Style != "minimal" {
		config.Style = "classic"
	}
	if config.Position != "top" && config.Position != "center" && config.Position != "bottom" {
		config.Position = "bottom"
	}
	return config
}

func ShortsSubtitleConfigFromSettings(settings json.RawMessage) ShortsSubtitleConfig {
	config := ShortsSubtitleConfig{Style: "classic", Position: "bottom"}
	var envelope struct {
		SubtitleStyle    string `json:"subtitle_style"`
		SubtitlePosition string `json:"subtitle_position"`
	}
	if json.Unmarshal(settings, &envelope) == nil {
		config.Style, config.Position = envelope.SubtitleStyle, envelope.SubtitlePosition
	}
	return NormalizeShortsSubtitleConfig(config)
}

func ShortsVerticalFilter(width, height int) string {
	// Scale to cover a 1080x1920 canvas, then center-crop. The expressions are
	// deterministic and work for landscape, portrait, and square inputs.
	_ = width
	_ = height
	return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,format=yuv420p"
}

func BuildShortsASS(segments []ShortsTranscriptSegment, clipStart, clipEnd float64, config ShortsSubtitleConfig) string {
	config = NormalizeShortsSubtitleConfig(config)
	fontSize, bold, outline := 58, "-1", 3
	if config.Style == "minimal" {
		fontSize, bold, outline = 48, "0", 2
	}
	if config.Style == "bold" {
		fontSize, outline = 64, 4
	}
	alignment, marginV := 2, 180
	if config.Position == "top" {
		alignment, marginV = 8, 180
	} else if config.Position == "center" {
		alignment, marginV = 5, 0
	}
	var b strings.Builder
	b.WriteString(fmt.Sprintf("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,%d,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90101010,%s,0,0,0,100,100,0,0,1,%d,1,%d,70,70,%d,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n", fontSize, bold, outline, alignment, marginV))
	for _, segment := range segments {
		start := maxFloat(clipStart, segment.StartSeconds)
		end := minFloat(clipEnd, segment.EndSeconds)
		if end <= start || strings.TrimSpace(segment.Text) == "" {
			continue
		}
		text := strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(segment.Text), "{", "("), "}", ")")
		text = strings.ReplaceAll(text, "\n", "\\N")
		b.WriteString(fmt.Sprintf("Dialogue: 0,%s,%s,Default,,0,0,0,,%s\n", assTimestamp(start-clipStart), assTimestamp(end-clipStart), text))
	}
	return b.String()
}

func assTimestamp(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}
	hours := int(seconds / 3600)
	seconds -= float64(hours * 3600)
	minutes := int(seconds / 60)
	seconds -= float64(minutes * 60)
	centiseconds := int(seconds*100 + 0.5)
	if centiseconds >= 6000 {
		minutes++
		centiseconds -= 6000
	}
	return fmt.Sprintf("%d:%02d:%02d.%02d", hours, minutes, centiseconds/100, centiseconds%100)
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func RenderShortsDraft(ctx context.Context, inputPath string, startSeconds, endSeconds float64, transcript []ShortsTranscriptSegment, config ShortsSubtitleConfig) (string, error) {
	if strings.TrimSpace(inputPath) == "" || endSeconds <= startSeconds {
		return "", fmt.Errorf("invalid shorts render input")
	}
	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-draft-%d.mp4", time.Now().UnixNano()))
	assPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-subtitles-%d.ass", time.Now().UnixNano()))
	if err := os.WriteFile(assPath, []byte(BuildShortsASS(transcript, startSeconds, endSeconds, config)), 0600); err != nil {
		return "", err
	}
	defer os.Remove(assPath)
	duration := fmt.Sprintf("%.3f", endSeconds-startSeconds)
	filter := ShortsVerticalFilter(0, 0) + ",subtitles='" + escapeFFmpegFilterPath(assPath) + "'"
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", fmt.Sprintf("%.3f", startSeconds), "-i", inputPath, "-t", duration, "-vf", filter, "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("render shorts draft: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}

func escapeFFmpegFilterPath(path string) string {
	path = filepath.ToSlash(path)
	path = strings.ReplaceAll(path, "\\", "\\\\")
	path = strings.ReplaceAll(path, ":", "\\:")
	return strings.ReplaceAll(path, "'", "\\'")
}
