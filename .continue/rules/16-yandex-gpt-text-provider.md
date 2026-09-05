---
name: 16-yandex-gpt-text-provider
description: Yandex GPT — единственный text LLM (Go adapter)
globs: "backend/**/*{llm,yandex,text,ai}*.go"
alwaysApply: false
---

# Text LLM: Yandex GPT

- Production text — **only Yandex GPT** via **`YandexGptClient`** + **`TextLLMService`** in `internal/service/`.
- Credentials: `ResolveYandexGPTConfig()` — admin DB → decrypt → env → fail closed.
- API: `https://ai.api.cloud.yandex.net/v1`; key + folder ID; model URI `gpt://<folder>/<model>/latest`.
- `x-data-logging-enabled: false` where supported.
- Per-task models in admin: caption, hashtags, improve, post_generation, thread, assistant.
- Validate structured JSON in Go; retry once; Russian user errors.
- Streaming for in-app assistant if needed — OpenAI-compatible client ok.
- Quota + usage_log; Yandex outbound direct (no proxy).
- Forbidden: production OpenAI default; SDK calls from handlers; Yandex for image/video.
