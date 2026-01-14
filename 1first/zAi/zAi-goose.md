# Goose - macOS Installation Guide

This guide explains how to install and set up **Goose**, the open-source AI agent that can operate your computer, with the Z.AI GLM Coding Plan.

## Prerequisites

- **Goose Desktop**: Download and install the Goose Desktop application for macOS.
- **Z.AI API Key**: Obtain your API key from the [Z.AI Developer Console](https://docs.z.ai/).

## Installation Steps

1. **Install Goose Desktop**:
   Visit the official [Goose Quickstart](https://block.github.io/goose/docs/quickstart) documentation and download the installer for macOS.

2. **Launch Goose**:
   Open the Goose Desktop application from your Applications folder.

## Z.AI Configuration

To integrate Z.AI with Goose, you need to create a custom provider:

1. **Create New Provider**:
   In the Goose Desktop application, locate and click **"Create New Provider"** in the left-hand menu.

2. **Select Type**:
   Choose **Anthropic Compatible** from the list of provider types.

3. **Configure Settings**:
   Enter the following details in the configuration form:
   - **Base URL**: `https://api.z.ai/api/anthropic`
   - **API Key**: `your_zai_api_key_here`
   - **Model**: Select `glm-4.7` (standard) or `glm-4.5-air` (lightweight) based on your needs.

4. **Save**:
   Click the Save button to complete the provider setup.

## Switching to Z.AI

1. **Switch Model**:
   Locate and click **"Switch Model"** at the bottom of the main Goose interface.

2. **Select Provider**:
   Choose the newly created Z.AI provider from the dropdown list.

3. **Verify**:
   Ensure the interface reflects that the Z.AI model is now active.

## Visual Sanity Check

To verify the setup:

1. **Interact**:
   Enter a request like `list the files in my current directory` or `create a new react component`.
   
2. **Observe**:
   Goose should use the GLM-4.7 model to process your request and execute the necessary actions.

3. **Visual Cues**:
   - The provider name should be visible as the active model.
   - Look for the Goose branding and agent status indicators in the UI.

---

## References

- [Goose GLM Coding Plan Guide](https://docs.z.ai/devpack/tool/goose)

*Note: Goose is an agentic tool, so it will request permissions for file system access and command execution. Ensure you grant the necessary permissions for it to function correctly.*
