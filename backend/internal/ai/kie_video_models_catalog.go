package ai

// kieVideoMarketCatalog — canonical video model IDs from docs.kie.ai/llms.txt (Market createTask).
var kieVideoMarketCatalog = []KieModelInfo{
	// Grok Imagine
	{ID: "grok-imagine/text-to-video", Name: "Grok Imagine — Text to Video", Category: "text-to-video"},
	{ID: "grok-imagine/image-to-video", Name: "Grok Imagine — Image to Video", Category: "image-to-video"},
	{ID: "grok-imagine-video-1-5-preview", Name: "Grok Imagine Video 1.5 Preview", Category: "text-to-video"},
	{ID: "grok-imagine/upscale", Name: "Grok Imagine — Video Upscale", Category: "video-to-video"},
	{ID: "grok-imagine/extend", Name: "Grok Imagine — Video Extend", Category: "video-to-video"},

	// Kling
	{ID: "kling-2.6/text-to-video", Name: "Kling 2.6 — Text to Video", Category: "text-to-video"},
	{ID: "kling-2.6/image-to-video", Name: "Kling 2.6 — Image to Video", Category: "image-to-video"},
	{ID: "kling/v3-turbo-text-to-video", Name: "Kling V3 Turbo — Text to Video", Category: "text-to-video"},
	{ID: "kling/v3-turbo-image-to-video", Name: "Kling V3 Turbo — Image to Video", Category: "image-to-video"},
	{ID: "kling/v2-5-turbo-text-to-video-pro", Name: "Kling V2.5 Turbo — Text to Video Pro", Category: "text-to-video"},
	{ID: "kling/v2-5-turbo-image-to-video-pro", Name: "Kling V2.5 Turbo — Image to Video Pro", Category: "image-to-video"},
	{ID: "kling/v2-1-master-text-to-video", Name: "Kling V2.1 Master — Text to Video", Category: "text-to-video"},
	{ID: "kling/v2-1-master-image-to-video", Name: "Kling V2.1 Master — Image to Video", Category: "image-to-video"},
	{ID: "kling/v2-1-pro", Name: "Kling V2.1 Pro — Image to Video", Category: "image-to-video"},
	{ID: "kling/v2-1-standard", Name: "Kling V2.1 Standard — Image to Video", Category: "image-to-video"},
	{ID: "kling/ai-avatar-standard", Name: "Kling AI Avatar Standard", Category: "image-to-video"},
	{ID: "kling/ai-avatar-pro", Name: "Kling AI Avatar Pro", Category: "image-to-video"},
	{ID: "kling-3.0/video", Name: "Kling 3.0 — Multi-shot Video", Category: "text-to-video"},
	{ID: "kling-2.6/motion-control", Name: "Kling 2.6 — Motion Control", Category: "video-to-video"},
	{ID: "kling-3.0/motion-control", Name: "Kling 3.0 — Motion Control", Category: "video-to-video"},

	// ByteDance / Seedance
	{ID: "bytedance/v1-lite-text-to-video", Name: "ByteDance V1 Lite — Text to Video", Category: "text-to-video"},
	{ID: "bytedance/v1-lite-image-to-video", Name: "ByteDance V1 Lite — Image to Video", Category: "image-to-video"},
	{ID: "bytedance/v1-pro-text-to-video", Name: "ByteDance V1 Pro — Text to Video", Category: "text-to-video"},
	{ID: "bytedance/v1-pro-image-to-video", Name: "ByteDance V1 Pro — Image to Video", Category: "image-to-video"},
	{ID: "bytedance/v1-pro-fast-image-to-video", Name: "ByteDance V1 Pro Fast — Image to Video", Category: "image-to-video"},
	{ID: "bytedance/seedance-2", Name: "Seedance 2.0 — Text to Video", Category: "text-to-video"},
	{ID: "bytedance/seedance-2-fast", Name: "Seedance 2.0 Fast — Text to Video", Category: "text-to-video"},
	{ID: "bytedance/seedance-2-mini", Name: "Seedance 2.0 Mini — Text to Video", Category: "text-to-video"},
	{ID: "bytedance/seedance-2-5", Name: "Seedance 2.5 — Text to Video", Category: "text-to-video"},
	{ID: "bytedance/seedance-1.5-pro", Name: "Seedance 1.5 Pro — Text to Video", Category: "text-to-video"},

	// Hailuo
	{ID: "hailuo/02-text-to-video-pro", Name: "Hailuo 02 Pro — Text to Video", Category: "text-to-video"},
	{ID: "hailuo/02-text-to-video-standard", Name: "Hailuo 02 Standard — Text to Video", Category: "text-to-video"},
	{ID: "hailuo/02-image-to-video-pro", Name: "Hailuo 02 Pro — Image to Video", Category: "image-to-video"},
	{ID: "hailuo/02-image-to-video-standard", Name: "Hailuo 02 Standard — Image to Video", Category: "image-to-video"},
	{ID: "hailuo/2-3-image-to-video-pro", Name: "Hailuo 2.3 Pro — Image to Video", Category: "image-to-video"},
	{ID: "hailuo/2-3-image-to-video-standard", Name: "Hailuo 2.3 Standard — Image to Video", Category: "image-to-video"},

	// Wan
	{ID: "wan/2-2-a14b-text-to-video-turbo", Name: "Wan 2.2 A14B Turbo — Text to Video", Category: "text-to-video"},
	{ID: "wan/2-2-a14b-image-to-video-turbo", Name: "Wan 2.2 A14B Turbo — Image to Video", Category: "image-to-video"},
	{ID: "wan/2-2-a14b-speech-to-video-turbo", Name: "Wan 2.2 A14B Turbo — Speech to Video", Category: "text-to-video"},
	{ID: "wan/2-5-text-to-video", Name: "Wan 2.5 — Text to Video", Category: "text-to-video"},
	{ID: "wan/2-5-image-to-video", Name: "Wan 2.5 — Image to Video", Category: "image-to-video"},
	{ID: "wan/2-6-text-to-video", Name: "Wan 2.6 — Text to Video", Category: "text-to-video"},
	{ID: "wan/2-6-image-to-video", Name: "Wan 2.6 — Image to Video", Category: "image-to-video"},
	{ID: "wan/2-6-flash-image-to-video", Name: "Wan 2.6 Flash — Image to Video", Category: "image-to-video"},
	{ID: "wan/2-7-text-to-video", Name: "Wan 2.7 — Text to Video", Category: "text-to-video"},
	{ID: "wan/2-7-image-to-video", Name: "Wan 2.7 — Image to Video", Category: "image-to-video"},
	{ID: "wan/2-7-r2v", Name: "Wan 2.7 — Reference to Video", Category: "reference-to-video"},
	{ID: "wan/2-6-video-to-video", Name: "Wan 2.6 — Video to Video", Category: "video-to-video"},
	{ID: "wan/2-6-flash-video-to-video", Name: "Wan 2.6 Flash — Video to Video", Category: "video-to-video"},
	{ID: "wan/2-7-videoedit", Name: "Wan 2.7 — Video Edit", Category: "video-to-video"},
	{ID: "wan/2-2-animate-move", Name: "Wan 2.2 — Animate Move", Category: "video-to-video"},
	{ID: "wan/2-2-animate-replace", Name: "Wan 2.2 — Animate Replace", Category: "video-to-video"},

	// PixVerse
	{ID: "pixverse-v6/text-to-video", Name: "PixVerse V6 — Text to Video", Category: "text-to-video"},
	{ID: "pixverse-v6/image-to-video", Name: "PixVerse V6 — Image to Video", Category: "image-to-video"},
	{ID: "pixverse-v6/transition", Name: "PixVerse V6 — First/Last Frame", Category: "image-to-video"},
	{ID: "pixverse-v6/reference-to-video", Name: "PixVerse V6 Fusion — Reference to Video", Category: "reference-to-video"},
	{ID: "pixverse-v6/extend", Name: "PixVerse V6 — Video Extension", Category: "video-to-video"},

	// MiniMax H3
	{ID: "minimax-h3/text-to-video", Name: "MiniMax H3 — Text to Video", Category: "text-to-video"},
	{ID: "minimax-h3/image-to-video", Name: "MiniMax H3 — Image to Video", Category: "image-to-video"},
	{ID: "minimax-h3/reference-to-video", Name: "MiniMax H3 — Reference to Video", Category: "reference-to-video"},

	// HappyHorse
	{ID: "happyhorse/text-to-video", Name: "HappyHorse — Text to Video", Category: "text-to-video"},
	{ID: "happyhorse/image-to-video", Name: "HappyHorse — Image to Video", Category: "image-to-video"},
	{ID: "happyhorse/reference-to-video", Name: "HappyHorse — Reference to Video", Category: "reference-to-video"},
	{ID: "happyhorse/video-edit", Name: "HappyHorse — Video Edit", Category: "video-to-video"},
	{ID: "happyhorse-1-1/text-to-video", Name: "HappyHorse 1.1 — Text to Video", Category: "text-to-video"},
	{ID: "happyhorse-1-1/image-to-video", Name: "HappyHorse 1.1 — Image to Video", Category: "image-to-video"},
	{ID: "happyhorse-1-1/reference-to-video", Name: "HappyHorse 1.1 — Reference to Video", Category: "reference-to-video"},

	// Sora 2
	{ID: "sora-2-text-to-video", Name: "Sora 2 — Text to Video", Category: "text-to-video"},
	{ID: "sora-2-pro-text-to-video", Name: "Sora 2 Pro — Text to Video", Category: "text-to-video"},
	{ID: "sora-2-image-to-video", Name: "Sora 2 — Image to Video", Category: "image-to-video"},
	{ID: "sora-2-pro-image-to-video", Name: "Sora 2 Pro — Image to Video", Category: "image-to-video"},
	{ID: "sora-2-characters-pro", Name: "Sora 2 Characters Pro", Category: "video-to-video"},

	// Other Market video
	{ID: "gemini-omni-video", Name: "Gemini Omni — Video", Category: "text-to-video"},
	{ID: "infinitalk/from-audio", Name: "Infinitalk — From Audio", Category: "image-to-video"},
	{ID: "topaz/video-upscale", Name: "Topaz — Video Upscale", Category: "video-to-video"},
	{ID: "volcengine/video-to-video-lip-sync", Name: "Volcengine — Video Lip Sync", Category: "video-to-video"},
}
