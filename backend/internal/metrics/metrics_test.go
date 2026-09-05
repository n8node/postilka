package metrics

import (
	"strings"
	"testing"
	"time"
)

func TestRegistryPrometheusSnapshot(t *testing.T) {
	registry := New()
	registry.ObserveRequest("GET", "/health", 200, 25*time.Millisecond)
	registry.ObserveRequest("GET", "/health", 503, 2*time.Second)
	registry.Inc("worker_ticks")
	registry.SetGauge("worker_up", 1)

	var output strings.Builder
	if err := registry.SnapshotPrometheus(&output); err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	for _, want := range []string{
		"postilka_http_requests_total 2",
		"postilka_http_errors_total 1",
		`postilka_http_requests_route_total{method="GET",route="/health"} 2`,
		"postilka_worker_ticks_total 1",
		"postilka_worker_up 1",
	} {
		if !strings.Contains(output.String(), want) {
			t.Fatalf("snapshot does not contain %q:\n%s", want, output.String())
		}
	}
}
