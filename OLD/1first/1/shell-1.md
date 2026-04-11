# macOS Snapshot

## Prerequisites

https://github.com/imarfanc/warp-251224

## Create Dirs

```bash
mkdir -p ~/Developer
mkdir -p ~/Developer/init-macOS
cd ~/Developer/init-macOS
```

## Check macOS Dirs

```bash
chmod +x '$HOME/Developer/gh/warp-251224/1first/1/dir-list.sh'
$HOME/Developer/gh/warp-251224/1first/1/dir-list.sh
```

## Check Current Versions

```bash
printf "%-10s | %-15s\n" "Tool" "Version"
printf "%-10s | %-15s\n" "----------" "---------------"
printf "%-10s | %-15s\n" "curl" "$(curl -V | head -n 1 | awk '{print $2}')"
printf "%-10s | %-15s\n" "git" "$(git --version | awk '{print $3}')"
printf "%-10s | %-15s\n" "gh" "$(gh --version | head -n 1 | awk '{print $3}')"
printf "%-10s | %-15s\n" "Go" "$(go version 2>/dev/null | awk '{print $3}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "Python" "$(python3 --version 2>/dev/null | awk '{print $2}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "uv" "$(uv --version 2>/dev/null || echo 'Not installed')"
printf "%-10s | %-15s\n" "Node.js" "$(node -v 2>/dev/null || echo 'Not installed')"
printf "%-10s | %-15s\n" "npm" "$(npm -v 2>/dev/null || echo 'Not installed')"
printf "%-10s | %-15s\n" "Deno" "$(deno --version 2>/dev/null | head -n 1 | awk '{print $2}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "vt" "$(vt --version 2>/dev/null | head -n 1 | awk '{print $2}' || echo 'Not installed')"
printf "%-10s | %-15s\n" "Bun" "$(bun --version 2>/dev/null || echo 'Not installed')"
```
