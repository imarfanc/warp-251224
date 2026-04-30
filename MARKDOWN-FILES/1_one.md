---
title: "1"
sort: 1
category: "macOS reset"
description: "the first file in the macOS reset project"
date: 2026-04-11
tags:
  - macOS
  - reset
  - 1
  - one
  - first
  - initial
---

## safari

`open safari`

- [_arfan-vals-list.val.run_](https://arfan-vals-list.val.run)
- get iphone
- sign into google

## terminal

`open terminal`

## download warp-251224 repo

- [https://github.com/imarfanc/warp-251224](https://github.com/imarfanc/warp-251224)
- [https://github.com/imarfanc/warp-251224/archive/refs/heads/main.zip](https://github.com/imarfanc/warp-251224/archive/refs/heads/main.zip)

```sh
mkdir -p ~/Developer/gh
cd ~/Developer/gh
curl -fsSL https://github.com/imarfanc/warp-251224/archive/refs/heads/main.zip -o warp-251224.zip
unzip warp-251224.zip
rm warp-251224.zip
```

## macOS desktop

- rm photos widget
- change computer name
  `open "x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"`
- activate clipboard history

## terminal script to quit open apps (except terminal & finder)

```sh
osascript -e 'tell application "System Events" to set quitApps to name of every process whose background only is false' \
          -e 'set skipList to {"Finder", "Terminal"}' \
          -e 'repeat with appName in quitApps' \
          -e '  if appName is not in skipList then' \
          -e '    try' \
          -e '      tell application appName to quit' \
          -e '    end try' \
          -e '  end if' \
          -e 'end repeat'
```
