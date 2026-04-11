Here’s the **correct and clean way to install Python on macOS using Homebrew**,
avoiding the common path/version issues 👇 (I’ll tailor this for **zsh on
macOS**, which you’re already using.)

---

## 1️⃣ Make sure Homebrew is installed

```bash
brew --version
```

If not installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 2️⃣ Update Homebrew

Always do this first:

```bash
brew update
```

---

## 3️⃣ Install Python (recommended way)

```bash
brew install python
```

✔ This installs:

- `python3`
- `pip3`
- `venv`
- Latest **stable Python 3.x**

---

## 4️⃣ Verify the installation

```bash
python3 --version
pip3 --version
```

You should see something like:

```text
Python 3.12.x
pip 23.x
```

---

## 5️⃣ Make `python` point to `python3` (important)

macOS **does not ship `python` anymore**, only `python3`. Create a safe alias:

```bash
echo 'alias python=python3' >> ~/.zshrc
echo 'alias pip=pip3' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
python --version
pip --version
```

---

## 6️⃣ Confirm Homebrew Python is being used

This is **critical** to avoid system Python issues.

```bash
which python3
```

Expected:

```text
/opt/homebrew/bin/python3   # Apple Silicon
```

If you see `/usr/bin/python3` → ❌ that’s the system Python.

---

## 7️⃣ Fix PATH if needed (very common issue)

### Apple Silicon (M1/M2/M3)

```bash
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Re-check:

```bash
which python3
```

---

## 8️⃣ Use virtual environments (best practice)

Never install packages globally.

```bash
python3 -m venv venv
source venv/bin/activate
```

Deactivate:

```bash
deactivate
```

---

## 9️⃣ Upgrade pip & essentials (inside venv)

```bash
pip install --upgrade pip setuptools wheel
```

---

## ❌ Things NOT to do

- ❌ Don’t use `sudo pip install`
- ❌ Don’t modify `/usr/bin/python`
- ❌ Don’t mix system Python with Homebrew Python

---

## ✅ Final sanity check

```bash
python -c "import sys; print(sys.executable)"
```

Should point to Homebrew or your virtualenv.

---

If you want, I can also:

- Set up **pyenv** (multiple Python versions)
- Clean up a **broken Python install**
- Configure Python for **Node/Electron tooling** (useful given your stack)

Just tell me 👍
