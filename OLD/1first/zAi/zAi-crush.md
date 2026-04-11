# Crush - macOS Installation Guide

This guide explains how to install and set up **Crush**, the glamorous AI coding agent for your terminal by Charmbracelet.

## Prerequisites

- **Homebrew**: Recommended for easy installation on macOS.
- **API Keys**: You will need an API key from an LLM provider (Anthropic, OpenAI, etc.).

## Installation Steps

1. **Install via Homebrew**:
   Add the Charmbracelet tap and install Crush:
   ```bash
   brew install charmbracelet/tap/crush
   ```

2. **Alternative: Install via Go**:
   If you have Go installed:
   ```bash
   go install github.com/charmbracelet/crush@latest
   ```

## Z.AI Configuration

To use Crush with the **Z.AI GLM Coding Plan**, follow these steps:

1. **Obtain Z.AI API Key**:
   Get your API key from the [Z.AI Developer Console](https://docs.z.ai/api-key).

2. **Set Environment Variable**:
   Add your Z.AI API key to your shell configuration (e.g., `~/.zshrc`):
   ```bash
   export ZAI_API_KEY="your_zai_api_key_here"
   ```

3. **Configure the Endpoint**:
   Crush needs to be pointed to the Z.AI API endpoint. You can typically do this by modifying the configuration file at `~/.config/crush/config.json`:
   ```json
   {
     "providers": {
       "zai": {
         "base_url": "https://api.z.ai/api/coding/pass/v4",
         "api_key": "$ZAI_API_KEY",
         "models": ["glm-4.7"]
       }
     },
     "default_provider": "zai"
   }
   ```

4. **Select the Model**:
   When launching Crush for the first time or via configuration, select the **glm-4.7** model for the best coding performance.

## Visual Sanity Check

To verify the installation and visual interface:

1. **Launch Crush**:
   Run the following command in your terminal:
   ```bash
   crush
   ```

2. **Observe the TUI**:
   You should see a beautiful, colorful terminal interface (typical of Charm tools).
   
3. **Test the Connection**:
   Type a simple request like `explain the current directory` and watch for the AI response.

4. **Visual Cues**:
   - Look for the 💘 icon in the header.
   - The interface should respond to your theme's colors.
   - Syntax highlighting should be active in code snippets provided by the agent.

---

## References

- [Crush GLM Coding Plan Guide](https://docs.z.ai/devpack/tool/crush)

*Note: Crush uses glamour and bubbles for its UI, so ensure your terminal supports true color and Unicode icons for the best experience.*
