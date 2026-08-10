package ai

// VideoTaskSources holds media URLs passed to KIE video createTask.
type VideoTaskSources struct {
	FirstFrameURL          string
	LastFrameURL           string
	ReferenceImageURLs     []string
	ReferenceVideoURLs     []string
	ReferenceAudioURLs     []string
}
