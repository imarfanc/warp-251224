package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

func main() {
	if path, err := exec.LookPath("gum"); err != nil {
		fmt.Fprintln(os.Stderr, "tip: install gum for a nicer UI →  brew install gum")
	} else {
		ver, _ := exec.Command(path, "--version").Output()
		fmt.Fprintf(os.Stderr, "gum: %s (%s)\n", strings.TrimSpace(string(ver)), path)
	}

	root, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	const port = 8080
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: http.FileServer(http.Dir(root)),
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	done := make(chan struct{})
	var shutdownOnce sync.Once
	shutdown := func() {
		shutdownOnce.Do(func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = server.Shutdown(ctx)
			printStopped()
			close(done)
		})
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		shutdown()
	}()

	watchStdinForEOF(shutdown)

	<-done
	os.Exit(0)
}

func watchStdinForEOF(shutdown func()) {
	if !stdinIsInteractive() {
		return
	}

	go func() {
		buf := make([]byte, 256)
		for {
			_, err := os.Stdin.Read(buf)
			if err == io.EOF {
				shutdown()
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

func printStopped() {
	fmt.Fprintln(os.Stderr, "\nServer stopped.")
	if path, err := exec.LookPath("gum"); err == nil {
		_ = exec.Command(path, "style", "--faint", "Server stopped").Run()
	}
}
