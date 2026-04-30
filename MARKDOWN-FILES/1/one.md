# 1

## safari

- open `safari`
- get iPhone/iPad
- sign into google

## terminal

- open `terminal`

## macOS desktop

- rm photos widget
- change computer name
  - `open "x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"`
- activate clipboard history

## terminal script to quit oepn apps (except terminal & finder)

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

## create some folders/files

```sh
mkdir -p Developer/macos-reset

touch .zprofile
touch .zshrc

cat .zprofile222
cat .zprofile
cat .zshrc
```

## auto login

```sh
open "x-apple.systempreferences:com.apple.preferences.users"

sudo defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser

sudo /usr/bin/osascript -e 'tell application "System Events" to log out'
```
