package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

type ShortsSubtitleConfig struct {
	Style         string `json:"style"`
	Position      string `json:"position"`
	FontSize      int    `json:"font_size"`
	TextColor     string `json:"text_color"`
	Background    string `json:"background"`
	Watermark     string `json:"watermark"`
	SafeZone      int    `json:"safe_zone"`
	WordsPerBlock int    `json:"words_per_block"`
}

func NormalizeShortsCropConfig(config model.ShortsCropConfig, duration float64) model.ShortsCropConfig {
	if config.Mode != "auto" && config.Mode != "manual" && config.Mode != "tracking" {
		config.Mode = "manual"
	}
	if config.AspectRatio != "9:16" && config.AspectRatio != "1:1" && config.AspectRatio != "16:9" {
		config.AspectRatio = "9:16"
	}
	valid := make([]model.ShortsCropKeyframe, 0, len(config.Keyframes))
	for _, keyframe := range config.Keyframes {
		if keyframe.Time < 0 || keyframe.Time > duration {
			continue
		}
		if keyframe.CenterX < 0 {
			keyframe.CenterX = 0
		}
		if keyframe.CenterX > 1 {
			keyframe.CenterX = 1
		}
		if keyframe.CenterY < 0 {
			keyframe.CenterY = 0
		}
		if keyframe.CenterY > 1 {
			keyframe.CenterY = 1
		}
		if keyframe.Scale < 0.5 {
			keyframe.Scale = 0.5
		}
		if keyframe.Scale > 3 {
			keyframe.Scale = 3
		}
		valid = append(valid, keyframe)
	}
	sort.SliceStable(valid, func(i, j int) bool { return valid[i].Time < valid[j].Time })
	deduplicated := make([]model.ShortsCropKeyframe, 0, len(valid))
	for _, keyframe := range valid {
		if len(deduplicated) > 0 && deduplicated[len(deduplicated)-1].Time == keyframe.Time {
			deduplicated[len(deduplicated)-1] = keyframe
			continue
		}
		deduplicated = append(deduplicated, keyframe)
	}
	config.Keyframes = deduplicated
	return config
}

func NormalizeShortsSubtitleConfig(config ShortsSubtitleConfig) ShortsSubtitleConfig {
	if config.WordsPerBlock < 1 || config.WordsPerBlock > 20 {
		config.WordsPerBlock = 6
	}
	if config.Style != "classic" && config.Style != "bold" && config.Style != "minimal" {
		config.Style = "classic"
	}
	if config.Position != "top" && config.Position != "center" && config.Position != "bottom" {
		config.Position = "bottom"
	}
	if config.FontSize < 24 || config.FontSize > 120 {
		config.FontSize = 58
	}
	if config.TextColor == "" {
		config.TextColor = "#FFFFFF"
	}
	if config.Background == "" {
		config.Background = "#101010"
	}
	if config.SafeZone < 0 || config.SafeZone > 300 {
		config.SafeZone = 70
	}
	return config
}

func ShortsSubtitleConfigFromSettings(settings json.RawMessage) ShortsSubtitleConfig {
	config := ShortsSubtitleConfig{Style: "classic", Position: "bottom"}
	var envelope struct {
		SubtitleStyle      string `json:"subtitle_style"`
		SubtitlePosition   string `json:"subtitle_position"`
		SubtitleFontSize   int    `json:"subtitle_font_size"`
		SubtitleTextColor  string `json:"subtitle_text_color"`
		SubtitleBackground string `json:"subtitle_background"`
		Watermark          string `json:"watermark"`
		SafeZone           int    `json:"safe_zone"`
		WordsPerBlock      int    `json:"subtitle_words_per_block"`
	}
	if json.Unmarshal(settings, &envelope) == nil {
		config.Style, config.Position = envelope.SubtitleStyle, envelope.SubtitlePosition
		config.FontSize, config.TextColor, config.Background, config.Watermark, config.SafeZone, config.WordsPerBlock = envelope.SubtitleFontSize, envelope.SubtitleTextColor, envelope.SubtitleBackground, envelope.Watermark, envelope.SafeZone, envelope.WordsPerBlock
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

func ShortsCropFilter(config model.ShortsCropConfig) string {
	return shortsCropFilter(config, 1e9)
}

func shortsCropFilter(config model.ShortsCropConfig, duration float64) string {
	config = NormalizeShortsCropConfig(config, duration)
	outputWidth, outputHeight := 1080, 1920
	switch config.AspectRatio {
	case "1:1":
		outputHeight = 1080
	case "16:9":
		outputWidth, outputHeight = 1920, 1080
	}
	keyframes := config.Keyframes
	if len(keyframes) == 0 {
		keyframes = []model.ShortsCropKeyframe{{Time: 0, CenterX: 0.5, CenterY: 0.5, Scale: 1}}
	}
	centerX := shortsCropKeyframeExpression(keyframes, func(keyframe model.ShortsCropKeyframe) float64 { return keyframe.CenterX })
	centerY := shortsCropKeyframeExpression(keyframes, func(keyframe model.ShortsCropKeyframe) float64 { return keyframe.CenterY })
	zoom := shortsCropKeyframeExpression(keyframes, func(keyframe model.ShortsCropKeyframe) float64 { return keyframe.Scale })
	ratio := float64(outputWidth) / float64(outputHeight)
	effectiveZoom := fmt.Sprintf("max(1\\,%s)", zoom)
	coverWidth := fmt.Sprintf("if(gte(iw/ih\\,%s)\\,-2\\,ceil(%d*%s/2)*2)", formatFFmpegFloat(ratio), outputWidth, effectiveZoom)
	coverHeight := fmt.Sprintf("if(gte(iw/ih\\,%s)\\,ceil(%d*%s/2)*2\\,-2)", formatFFmpegFloat(ratio), outputHeight, effectiveZoom)
	return fmt.Sprintf("scale=w=%s:h=%s:eval=frame,crop=%d:%d:(iw-%d)*%s:(ih-%d)*%s,format=yuv420p", coverWidth, coverHeight, outputWidth, outputHeight, outputWidth, centerX, outputHeight, centerY)
}

func shortsCropKeyframeExpression(keyframes []model.ShortsCropKeyframe, value func(model.ShortsCropKeyframe) float64) string {
	if len(keyframes) == 1 {
		return formatFFmpegFloat(value(keyframes[0]))
	}
	expression := formatFFmpegFloat(value(keyframes[len(keyframes)-1]))
	for index := len(keyframes) - 2; index >= 0; index-- {
		current, next := keyframes[index], keyframes[index+1]
		currentValue, nextValue := value(current), value(next)
		if next.Time <= current.Time {
			expression = formatFFmpegFloat(currentValue)
			continue
		}
		progress := fmt.Sprintf("(t-%s)/%s", formatFFmpegFloat(current.Time), formatFFmpegFloat(next.Time-current.Time))
		interpolation := fmt.Sprintf("(%s+(%s-%s)*%s)", formatFFmpegFloat(currentValue), formatFFmpegFloat(nextValue), formatFFmpegFloat(currentValue), progress)
		expression = fmt.Sprintf("if(lt(t\\,%s)\\,%s\\,%s)", formatFFmpegFloat(next.Time), formatFFmpegFloat(currentValue), interpolation)
	}
	return expression
}

func formatFFmpegFloat(value float64) string {
	return strconv.FormatFloat(value, 'f', 6, 64)
}

func BuildShortsASS(segments []ShortsTranscriptSegment, clipStart, clipEnd float64, config ShortsSubtitleConfig) string {
	config = NormalizeShortsSubtitleConfig(config)
	fontSize, bold, outline := config.FontSize, "-1", 3
	if config.Style == "minimal" {
		bold, outline = "0", 2
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
	_ = marginV
	var b strings.Builder
	primary := assColor(config.TextColor)
	back := assColor(config.Background)
	b.WriteString(fmt.Sprintf("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,%d,%s,%s,&H00101010,%s,%s,0,0,0,100,100,0,0,1,%d,1,%d,70,70,%d,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n", fontSize, primary, primary, back, bold, outline, alignment, config.SafeZone))
	for _, segment := range segments {
		if len(segment.Words) > 0 {
			for start := 0; start < len(segment.Words); start += config.WordsPerBlock {
				end := start + config.WordsPerBlock
				if end > len(segment.Words) {
					end = len(segment.Words)
				}
				words := segment.Words[start:end]
				if len(words) == 0 {
					continue
				}
				text := make([]string, 0, len(words))
				for _, word := range words {
					text = append(text, strings.TrimSpace(word.Word))
				}
				writeShortsASSDialogue(&b, words[0].StartSeconds, words[len(words)-1].EndSeconds, strings.Join(text, " "), clipStart, clipEnd, config)
			}
			continue
		}
		start := maxFloat(clipStart, segment.StartSeconds)
		end := minFloat(clipEnd, segment.EndSeconds)
		if end <= start || strings.TrimSpace(segment.Text) == "" {
			continue
		}
		text := strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(segment.Text), "{", "("), "}", ")")
		text = strings.ReplaceAll(text, "\n", "\\N")
		if strings.TrimSpace(config.Watermark) != "" {
			text += "\\N" + strings.ReplaceAll(strings.TrimSpace(config.Watermark), "{", "(")
		}
		b.WriteString(fmt.Sprintf("Dialogue: 0,%s,%s,Default,,0,0,0,,%s\n", assTimestamp(start-clipStart), assTimestamp(end-clipStart), text))
	}
	return b.String()
}

func writeShortsASSDialogue(b *strings.Builder, start, end float64, text string, clipStart, clipEnd float64, config ShortsSubtitleConfig) {
	start = maxFloat(clipStart, start)
	end = minFloat(clipEnd, end)
	if end <= start || strings.TrimSpace(text) == "" {
		return
	}
	text = strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(text), "{", "("), "}", ")")
	if strings.TrimSpace(config.Watermark) != "" {
		text += "\\N" + strings.ReplaceAll(strings.TrimSpace(config.Watermark), "{", "(")
	}
	b.WriteString(fmt.Sprintf("Dialogue: 0,%s,%s,Default,,0,0,0,,%s\n", assTimestamp(start-clipStart), assTimestamp(end-clipStart), text))
}

func assColor(value string) string {
	value = strings.TrimPrefix(strings.TrimSpace(value), "#")
	if len(value) != 6 {
		return "&H00FFFFFF"
	}
	return "&H00" + value[4:6] + value[2:4] + value[0:2]
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

func RenderShortsDraft(ctx context.Context, inputPath string, startSeconds, endSeconds float64, transcript []ShortsTranscriptSegment, config ShortsSubtitleConfig, cropConfigs ...model.ShortsCropConfig) (string, error) {
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
	crop := model.ShortsCropConfig{AspectRatio: "9:16", Keyframes: []model.ShortsCropKeyframe{{CenterX: 0.5, CenterY: 0.5, Scale: 1}}}
	if len(cropConfigs) > 0 {
		crop = cropConfigs[0]
	}
	filter := shortsCropFilter(crop, endSeconds-startSeconds) + ",subtitles='" + escapeFFmpegFilterPath(assPath) + "'"
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", fmt.Sprintf("%.3f", startSeconds), "-i", inputPath, "-t", duration, "-vf", filter, "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("render shorts draft: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}

func MergeShortsClips(ctx context.Context, paths []string) (string, error) {
	if len(paths) == 0 {
		return "", fmt.Errorf("no shorts clips to merge")
	}
	listPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-concat-%d.txt", time.Now().UnixNano()))
	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-final-%d.mp4", time.Now().UnixNano()))
	var list strings.Builder
	for _, path := range paths {
		list.WriteString("file '")
		list.WriteString(strings.ReplaceAll(path, "'", "'\\''"))
		list.WriteString("'\n")
	}
	if err := os.WriteFile(listPath, []byte(list.String()), 0600); err != nil {
		return "", err
	}
	defer os.Remove(listPath)
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", outputPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("merge shorts clips: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}

func escapeFFmpegFilterPath(path string) string {
	path = filepath.ToSlash(path)
	path = strings.ReplaceAll(path, "\\", "\\\\")
	path = strings.ReplaceAll(path, ":", "\\:")
	return strings.ReplaceAll(path, "'", "\\'")
}
