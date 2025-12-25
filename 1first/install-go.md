Here’s the **clean, correct way to install Go (Golang) on macOS using
Homebrew**, tuned for **zsh** 👇 (This fits nicely with your existing Go +
tooling workflow.)

---

## 1️⃣ Install Go via Homebrew

```bash
brew install go
```

That’s it — Homebrew handles everything.

---

## 2️⃣ Verify installation

```bash
go version
```

Example:

```text
go version go1.22.x darwin/arm64
```

---

## 3️⃣ Confirm Homebrew Go is being used

```bash
which go
```

Expected:

```text
/opt/homebrew/bin/go   # Apple Silicon
```

If you see something else → PATH issue.

---

## 4️⃣ Set up Go environment (modern way)

**You do NOT need `GOPATH` anymore** unless you want it.

Go modules are default.

Recommended minimal setup:

```bash
mkdir -p ~/go/{bin,src,pkg}
```

Optional (only if you want a fixed GOPATH):

```bash
echo 'export GOPATH=$HOME/go' >> ~/.zshrc
echo 'export PATH="$GOPATH/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

> ⚠️ GOPATH is optional in modern Go (1.18+)

---

## 5️⃣ Test with a hello world

```bash
mkdir ~/dev/hello-go
cd ~/dev/hello-go

go mod init hello
```

Create `main.go`:

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go 👋")
}
```

Run:

```bash
go run .
```

---

## 6️⃣ Install Go tools (optional but useful)

```bash
go install golang.org/x/tools/gopls@latest
go install github.com/go-delve/delve/cmd/dlv@latest
```

Make sure:

```bash
which gopls
which dlv
```

---

## 7️⃣ Upgrade Go later

```bash
brew upgrade go
```

---

## ❌ Things NOT to do

- ❌ Don’t install Go manually from `.pkg` **and** Homebrew
- ❌ Don’t set old-style GOPATH workflows unless needed
- ❌ Don’t commit `vendor/` unless required

---

## ✅ Sanity check

```bash
go env GOROOT GOPATH
```

GOROOT should be Homebrew-managed.

---

## Want more?

I can:

- Set up **multiple Go versions** with `goenv`
- Configure Go for **VS Code / Neovim**
- Tune Go for **backend APIs, CLIs, or WASM**
- Compare **Go vs Node/Bun** for your use case

Just tell me 🚀
