# Z.AI Coding Tool Helper - macOS Installation Guide

This guide explains how to install and use the **Z.AI Coding Tool Helper** on macOS. This tool is a bridge for various AI coding agents like Claude Code, Crush, and others.

## Prerequisites

- **Node.js**: Version 18.0.0 or higher is required.
  ```bash
  node -v
  ```
  If you need to install or upgrade Node.js, use [Homebrew](https://brew.sh/): `brew install node`.

## Installation & Usage

You can use the Coding Tool Helper without global installation using `npx`, or install it globally for frequent use.

### Method 1: Using npx (Recommended)
Run the following command to start the helper instantly:
```bash
npx @z_ai/coding-helper
```

### Method 2: Global Installation
If you plan to use it regularly:
```bash
npm install -g @z_ai/coding-helper
```
Then launch it by typing:
```bash
coding-helper
```

## Z.AI Configuration

1. **Obtain API Key**:
   Visit the [Z.AI Open Platform](https://docs.z.ai/) to get your API key.

2. **Setup**:
   When you first run the helper, it will prompt you for your Z.AI API key. Alternatively, you can set it as an environment variable:
   ```bash
   export ZAI_API_KEY="your_actual_api_key_here"
   ```

3. **Select Integration**:
   The helper supports various tools. Follow the on-screen prompts to configure it for your preferred agent (e.g., Claude Code, Crush).

## Visual Sanity Check

To verify the Coding Tool Helper is working correctly:

1. **Launch**:
   Run `npx @z_ai/coding-helper`.
   
2. **Interactive Menu**:
   You should see an interactive terminal menu with options to select different AI coding tools.

3. **Connection Check**:
   Select an option and ensure it can communicate with the Z.AI backend. You should see a status message indicating a successful connection.

4. **Visual Cues**:
   - The interface uses a clean TUI with keyboard navigation.
   - Look for the Z.AI branding and version number in the header.

---

## References

- [Claude Code GLM Coding Plan Guide](https://docs.z.ai/devpack/tool/claude)

*Note: For issues with network connectivity, ensure your firewall allows Node.js to access `api.z.ai`.*
