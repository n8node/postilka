package metrics

import (
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Registry is a small dependency-free metrics registry used by the API and workers.
// The output is Prometheus text format so it can later be replaced by a standard
// Prometheus client without changing instrumentation call sites.
type Registry struct {
	started time.Time

	requestsTotal atomic.Uint64
	requestErrors atomic.Uint64

	mu             sync.RWMutex
	requestByRoute map[string]*routeMetric
	gauges         map[string]float64
	counters       map[string]uint64
}

type routeMetric struct {
	requests atomic.Uint64
	errors   atomic.Uint64
	totalMS  atomic.Uint64
	buckets  [len(latencyBuckets)]atomic.Uint64
}

var latencyBuckets = [...]float64{10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000}

func New() *Registry {
	return &Registry{
		started:        time.Now(),
		requestByRoute: make(map[string]*routeMetric),
		gauges:         make(map[string]float64),
		counters:       make(map[string]uint64),
	}
}

func (r *Registry) ObserveRequest(method, route string, status int, duration time.Duration) {
	if r == nil {
		return
	}
	r.requestsTotal.Add(1)
	if status >= 500 {
		r.requestErrors.Add(1)
	}
	key := method + " " + route
	r.mu.Lock()
	m := r.requestByRoute[key]
	if m == nil {
		m = &routeMetric{}
		r.requestByRoute[key] = m
	}
	r.mu.Unlock()
	m.requests.Add(1)
	if status >= 500 {
		m.errors.Add(1)
	}
	ms := uint64(duration.Milliseconds())
	m.totalMS.Add(ms)
	for i, bucket := range latencyBuckets {
		if float64(ms) <= bucket {
			m.buckets[i].Add(1)
		}
	}
}

func (r *Registry) Inc(name string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.counters[name]++
	r.mu.Unlock()
}

func (r *Registry) SetGauge(name string, value float64) {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.gauges[name] = value
	r.mu.Unlock()
}

func (r *Registry) SnapshotPrometheus(w io.Writer) error {
	if r == nil {
		return nil
	}
	fmt.Fprintf(w, "# HELP postilka_uptime_seconds Process uptime in seconds.\n# TYPE postilka_uptime_seconds gauge\npostilka_uptime_seconds %.3f\n", time.Since(r.started).Seconds())
	fmt.Fprintf(w, "# HELP postilka_http_requests_total Total HTTP requests.\n# TYPE postilka_http_requests_total counter\npostilka_http_requests_total %d\n", r.requestsTotal.Load())
	fmt.Fprintf(w, "# HELP postilka_http_errors_total Total HTTP 5xx responses.\n# TYPE postilka_http_errors_total counter\npostilka_http_errors_total %d\n", r.requestErrors.Load())

	r.mu.RLock()
	keys := make([]string, 0, len(r.requestByRoute))
	for key := range r.requestByRoute {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		m := r.requestByRoute[key]
		parts := strings.SplitN(key, " ", 2)
		method, route := parts[0], parts[1]
		fmt.Fprintf(w, "postilka_http_requests_route_total{method=%q,route=%q} %d\n", method, route, m.requests.Load())
		fmt.Fprintf(w, "postilka_http_errors_route_total{method=%q,route=%q} %d\n", method, route, m.errors.Load())
		fmt.Fprintf(w, "postilka_http_request_duration_milliseconds_sum{method=%q,route=%q} %d\n", method, route, m.totalMS.Load())
		for i, bucket := range latencyBuckets {
			fmt.Fprintf(w, "postilka_http_request_duration_milliseconds_bucket{method=%q,route=%q,le=%q} %d\n", method, route, strconv.FormatFloat(bucket, 'f', -1, 64), m.buckets[i].Load())
		}
		fmt.Fprintf(w, "postilka_http_request_duration_milliseconds_bucket{method=%q,route=%q,le=\"+Inf\"} %d\n", method, route, m.requests.Load())
	}
	counterKeys := make([]string, 0, len(r.counters))
	for key := range r.counters {
		counterKeys = append(counterKeys, key)
	}
	sort.Strings(counterKeys)
	for _, key := range counterKeys {
		fmt.Fprintf(w, "postilka_%s_total %d\n", sanitizeName(key), r.counters[key])
	}
	gaugeKeys := make([]string, 0, len(r.gauges))
	for key := range r.gauges {
		gaugeKeys = append(gaugeKeys, key)
	}
	sort.Strings(gaugeKeys)
	for _, key := range gaugeKeys {
		fmt.Fprintf(w, "postilka_%s %s\n", sanitizeName(key), strconv.FormatFloat(r.gauges[key], 'f', -1, 64))
	}
	r.mu.RUnlock()
	return nil
}

func sanitizeName(name string) string {
	name = strings.TrimSpace(name)
	var b strings.Builder
	for _, ch := range name {
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_' {
			b.WriteRune(ch)
		} else {
			b.WriteByte('_')
		}
	}
	return strings.Trim(b.String(), "_")
}
