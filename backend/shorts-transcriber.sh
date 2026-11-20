#!/bin/sh
set -eu

audio_path="${1:-}"
if [ -z "$audio_path" ] || [ ! -f "$audio_path" ]; then
  echo "audio path is required" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

/usr/local/bin/whisper-cli \
  --model /opt/whisper-model/ggml-base-q5_1.bin \
  --file "$audio_path" \
  --language ru \
  --output-json \
  --output-file "$tmp_dir/transcript" \
  --no-prints >/dev/null

json_file="$tmp_dir/transcript.json"
if [ ! -s "$json_file" ]; then
  echo "whisper did not produce transcript JSON" >&2
  exit 1
fi

python3 - "$json_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as source:
    raw = json.load(source)

segments = []
for item in raw.get("transcription", []):
    offsets = item.get("offsets", {})
    start = float(offsets.get("from", 0)) / 1000
    end = float(offsets.get("to", 0)) / 1000
    text = str(item.get("text", "")).strip()
    if end > start and text:
        segments.append({
            "start_seconds": start,
            "end_seconds": end,
            "text": text,
        })

print(json.dumps({
    "language": raw.get("result", {}).get("language", ""),
    "text": " ".join(item["text"] for item in segments),
    "segments": segments,
}, ensure_ascii=False))
PY