package main

import (
	"log/slog"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/postilka/postilka/internal/config"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	logger.Info("main worker started",
		"version", config.Version,
	)

	// В production рядом с supervisor находятся готовые worker-бинарники.
	// Fallback на go run оставлен для запуска из исходников в development.
	workers := []struct {
		name   string
		binary string
		source string
	}{
		{"generation-worker", "generation-worker", "generation-worker"},
		{"publisher-worker", "publisher-worker", "publisher-worker"},
		{"notification-worker", "notification-worker", "notification-worker"},
		{"maintenance-worker", "maintenance-worker", "maintenance-worker"},
		{"backup-worker", "backup-worker", "backup-worker"},
	}

	workerProcesses := make([]*exec.Cmd, len(workers))

	baseDir, err := os.Executable()
	if err != nil {
		logger.Error("resolve worker directory", "error", err)
		os.Exit(1)
	}
	baseDir = filepath.Dir(baseDir)
	workingDir, err := os.Getwd()
	if err != nil {
		logger.Error("resolve working directory", "error", err)
		os.Exit(1)
	}
	if _, err := os.Stat(filepath.Join(workingDir, "go.mod")); err != nil {
		if _, backendErr := os.Stat(filepath.Join(workingDir, "backend", "go.mod")); backendErr == nil {
			workingDir = filepath.Join(workingDir, "backend")
		}
	}

	for i, worker := range workers {
		binaryPath := filepath.Join(baseDir, worker.binary)
		var cmd *exec.Cmd
		if _, err := os.Stat(binaryPath); err == nil {
			cmd = exec.Command(binaryPath)
		} else {
			cmd = exec.Command("go", "run", "./cmd/"+worker.source+"/main.go")
			cmd.Dir = workingDir
		}

		// Передаем переменные окружения
		cmd.Env = append(os.Environ(), "GOMAXPROCS=1")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Start(); err != nil {
			logger.Error("failed to start "+worker.name, "error", err)
			os.Exit(1)
		}

		workerProcesses[i] = cmd
		logger.Info("started "+worker.name, "pid", cmd.Process.Pid)
		go func(name string, child *exec.Cmd) {
			if err := child.Wait(); err != nil {
				logger.Error(name+" exited", "error", err)
			} else {
				logger.Error(name + " exited unexpectedly")
			}
			// The supervisor must not stay healthy while a required worker is dead.
			// Docker restart policy will bring the complete worker group back up.
			os.Exit(1)
		}(worker.name, cmd)
	}

	// Ожидание сигналов завершения
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit

	logger.Info("shutting down all workers...")

	// Завершение всех worker'ов
	for _, cmd := range workerProcesses {
		if cmd != nil && cmd.Process != nil {
			cmd.Process.Kill()
		}
	}

	// Ожидание завершения процессов
	for _, cmd := range workerProcesses {
		if cmd != nil {
			// Child processes are waited for by the monitoring goroutines above.
		}
	}

	logger.Info("all workers stopped")
}
