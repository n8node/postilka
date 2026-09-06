package main

import (
	"log/slog"
	"os"
	"os/exec"
	"os/signal"
	"syscall"

	"github.com/postilka/postilka/internal/config"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	logger.Info("main worker started",
		"version", config.Version,
	)

	// Запуск всех новых worker'ов
	workers := []struct {
		name string
		path string
	}{
		{"generation-worker", "generation-worker"},
		{"publisher-worker", "publisher-worker"},
		{"notification-worker", "notification-worker"},
		{"maintenance-worker", "maintenance-worker"},
		{"backup-worker", "backup-worker"},
	}

	workerProcesses := make([]*exec.Cmd, len(workers))

	// Запуск всех worker'ов
	for i, worker := range workers {
		cmd := exec.Command("go", "run", "./cmd/"+worker.path+"/main.go")
		cmd.Dir = "."

		// Передаем переменные окружения
		cmd.Env = append(os.Environ(), "GOMAXPROCS=1")

		if err := cmd.Start(); err != nil {
			logger.Error("failed to start "+worker.name, "error", err)
			os.Exit(1)
		}

		workerProcesses[i] = cmd
		logger.Info("started "+worker.name, "pid", cmd.Process.Pid)
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
			cmd.Wait()
		}
	}

	logger.Info("all workers stopped")
}
