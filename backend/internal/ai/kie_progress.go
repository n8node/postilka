package ai

import (
	"strings"
	"time"
)

// KiePollInterval is the default delay between recordInfo polls (KIE recommends 2–3s).
const KiePollInterval = 2500 * time.Millisecond

// KiePollIntervalSlow is used after 30s of polling.
const KiePollIntervalSlow = 5 * time.Second

// KieMaxPollRequestsPerSec stays under KIE's ~10 req/s recordInfo limit (shared API key).
const KieMaxPollRequestsPerSec = 8

// KieCreateTaskWindow is KIE's rolling window for new generation requests (createTask).
const KieCreateTaskWindow = 10 * time.Second

// KieMaxCreateTasksPerWindow stays under KIE's 20 createTask / 10s account limit (shared API key).
const KieMaxCreateTasksPerWindow = 17

// KieProgressCap is the maximum progress shown before the job is fully saved (100).
const KieProgressCap = 94

// KieProgressNearDone is used when KIE reports success but assets are still uploading.
const KieProgressNearDone = 97

const minProgressPollBump = 2

// NextJobProgress returns monotonic user-visible progress (0–100).
func NextJobProgress(
	current int,
	jobStatus string,
	kieState string,
	apiProgress int,
	startedAt time.Time,
) int {
	if current < 0 {
		current = 0
	}
	if current >= 100 {
		return 100
	}

	target := progressTarget(jobStatus, kieState, apiProgress, startedAt)
	if target > KieProgressCap {
		target = KieProgressCap
	}

	if target < current {
		target = current
	}

	if target <= current && current < KieProgressCap {
		target = current + minProgressPollBump
		if target > KieProgressCap {
			target = KieProgressCap
		}
	}

	return target
}

func progressTarget(jobStatus, kieState string, apiProgress int, startedAt time.Time) int {
	sec := int(time.Since(startedAt).Seconds())
	if sec < 0 {
		sec = 0
	}

	timeFloor := 5 + sec
	if sec > 45 {
		timeFloor = 50 + (sec-45)/4
	}
	if timeFloor > 82 {
		timeFloor = 82
	}

	stateFloor := stateProgressFloor(jobStatus, kieState, sec)

	target := timeFloor
	if stateFloor > target {
		target = stateFloor
	}
	if apiProgress > 0 && apiProgress < 100 && apiProgress > target {
		target = apiProgress
	}
	return target
}

func stateProgressFloor(jobStatus, kieState string, sec int) int {
	kie := strings.ToLower(strings.TrimSpace(kieState))
	status := strings.ToLower(strings.TrimSpace(jobStatus))

	floor := 5

	switch kie {
	case "waiting":
		floor = 14 + sec/15
		if floor > 36 {
			floor = 36
		}
	case "queuing":
		floor = 30 + sec/12
		if floor > 54 {
			floor = 54
		}
	case "generating":
		floor = 42 + sec/8
		if floor > 90 {
			floor = 90
		}
	}

	switch status {
	case "preparing":
		p := 8 + sec*2
		if p > 24 {
			p = 24
		}
		if p > floor {
			floor = p
		}
	case "waiting":
		if floor < 16 {
			floor = 16
		}
	case "queuing":
		if floor < 32 {
			floor = 32
		}
	case "generating":
		if floor < 44 {
			floor = 44
		}
	}

	return floor
}

// MapKieStateToJobStatus normalizes KIE state to our job status column.
func MapKieStateToJobStatus(kieState string) string {
	switch strings.ToLower(strings.TrimSpace(kieState)) {
	case "waiting":
		return "waiting"
	case "queuing":
		return "queuing"
	case "generating":
		return "generating"
	case "success":
		return "succeeded"
	case "fail":
		return "failed"
	default:
		return "generating"
	}
}

// NextPollAfter returns when this job should be polled again.
func NextPollAfter(startedAt time.Time, got429 bool) time.Time {
	if got429 {
		return time.Now().Add(8 * time.Second)
	}
	if time.Since(startedAt) > 30*time.Second {
		return time.Now().Add(KiePollIntervalSlow)
	}
	return time.Now().Add(KiePollInterval)
}

// NextCreateRetryAfter returns when a preparing job should retry createTask after rate limiting.
func NextCreateRetryAfter() time.Time {
	return time.Now().Add(3 * time.Second)
}
