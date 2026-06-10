package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const defaultPort = 8080

func main() {
	root, err := os.Getwd()
	if err != nil {
		logFatal("failed to get working directory", map[string]string{"error": err.Error()})
	}

	port := defaultPort
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 {
			port = n
		}
	}

	done := make(chan struct{})
	var shutdownOnce sync.Once
	var requestShutdown func(string)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/shutdown", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
		go requestShutdown("UI")
	})
	mux.Handle("/", http.FileServer(http.Dir(root)))

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	shutdown := func(reason string) {
		shutdownOnce.Do(func() {
			fmt.Println()
			logEvent("warn", "shutting down", map[string]string{"reason": reason})

			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := server.Shutdown(ctx); err != nil {
				logEvent("warn", "shutdown error", map[string]string{"error": err.Error()})
			}

			logEvent("info", "bye 👋", nil)
			close(done)
		})
	}
	requestShutdown = shutdown

	ln, err := net.Listen("tcp", server.Addr)
	if err != nil {
		logFatal("failed to listen", map[string]string{"addr": server.Addr, "error": err.Error()})
	}

	go func() {
		if err := server.Serve(ln); err != nil && err != http.ErrServerClosed {
			logFatal("server error", map[string]string{"error": err.Error()})
		}
	}()

	printStartupBanner(port, root)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		shutdown(sig.String())
	}()

	watchStdinForEOF(func() { shutdown("Ctrl+D") })

	<-done
	os.Exit(0)
}

func watchStdinForEOF(onEOF func()) {
	if !stdinIsInteractive() {
		return
	}

	go func() {
		buf := make([]byte, 256)
		for {
			_, err := os.Stdin.Read(buf)
			if err == io.EOF {
				onEOF()
				return
			}
			if err != nil {
				return
			}
		}
	}()
}

func stdinIsInteractive() bool {
	fi, err := os.Stdin.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}

func stdoutIsTTY() bool {
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}

func terminalWidth() int {
	if cols, err := strconv.Atoi(os.Getenv("COLUMNS")); err == nil && cols >= 40 {
		return cols
	}
	return 80
}

func hasGum() bool {
	_, err := exec.LookPath("gum")
	return err == nil
}

func gum(args ...string) string {
	cmd := exec.Command("gum", args...)
	cmd.Env = append(os.Environ(), "CLICOLOR_FORCE=1")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSuffix(string(out), "\n")
}

func gumLog(level, msg string, kv map[string]string) bool {
	args := []string{"log", "--time", "kitchen", "--level", level, "--structured", msg}
	for k, v := range kv {
		args = append(args, k, v)
	}
	cmd := exec.Command("gum", args...)
	cmd.Env = append(os.Environ(), "CLICOLOR_FORCE=1")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run() == nil
}

func logEvent(level, msg string, kv map[string]string) {
	if kv == nil {
		kv = map[string]string{}
	}
	if hasGum() && gumLog(level, msg, kv) {
		return
	}
	if !stdoutIsTTY() || os.Getenv("NO_COLOR") != "" {
		pairs := formatKVPairs(kv)
		if pairs != "" {
			fmt.Printf("%s %s %s\n", strings.ToUpper(level), msg, pairs)
		} else {
			fmt.Printf("%s %s\n", strings.ToUpper(level), msg)
		}
		return
	}

	colorFor := map[string]string{
		"info":  "\x1b[36m",
		"warn":  "\x1b[33m",
		"error": "\x1b[31m",
		"debug": "\x1b[2m",
	}
	color := colorFor[level]
	if color == "" {
		color = "\x1b[0m"
	}
	reset := "\x1b[0m"
	dim := "\x1b[2m"
	ts := dim + time.Now().Format("15:04:05") + reset
	pairs := formatKVPairsColored(kv, dim, reset)
	line := fmt.Sprintf("%s %s%-5s%s %s", ts, color, strings.ToUpper(level), reset, msg)
	if pairs != "" {
		line += " " + pairs
	}
	fmt.Println(line)
}

func formatKVPairs(kv map[string]string) string {
	if len(kv) == 0 {
		return ""
	}
	parts := make([]string, 0, len(kv))
	for k, v := range kv {
		parts = append(parts, fmt.Sprintf("%s=%s", k, v))
	}
	return strings.Join(parts, " ")
}

func formatKVPairsColored(kv map[string]string, dim, reset string) string {
	if len(kv) == 0 {
		return ""
	}
	parts := make([]string, 0, len(kv))
	for k, v := range kv {
		parts = append(parts, dim+k+"="+reset+v)
	}
	return strings.Join(parts, " ")
}

func logFatal(msg string, kv map[string]string) {
	logEvent("error", msg, kv)
	os.Exit(1)
}

func printStartupBanner(port int, root string) {
	base := fmt.Sprintf("http://localhost:%d/", port)
	cols := terminalWidth()
	boxWidth := max(40, min(cols-2, 120))
	lines := []string{
		fmt.Sprintf("warp-251224  %s", base),
		"",
		fmt.Sprintf("Serving:  %s", root),
		"Index:    HTML/repo-overview.html",
		"",
		"press Ctrl+D (or Ctrl+C) to stop",
	}

	if hasGum() && boxWidth >= 40 {
		args := []string{
			"style",
			"--border", "rounded",
			"--border-foreground", "39",
			"--padding", "0 2",
			"--margin", "1 0",
			"--width", strconv.Itoa(boxWidth),
		}
		args = append(args, lines...)
		if banner := gum(args...); banner != "" {
			fmt.Println(banner)
			return
		}
	}

	fmt.Printf("\x1b[1mwarp-251224\x1b[0m \x1b[32m%s\x1b[0m\n", base)
	fmt.Printf("  \x1b[2mServing:\x1b[0m  %s\n", root)
	fmt.Printf("  \x1b[2mIndex:\x1b[0m    HTML/repo-overview.html\n")
	fmt.Println("\x1b[2m  press Ctrl+D (or Ctrl+C) to stop\x1b[0m")
}
