# Cursor - macOS Installation Guide

This guide explains how to configure **Cursor**, the AI-powered code editor, to work with the Z.AI GLM Coding Plan.

## Prerequisites

- **Cursor**: Ensure you have the Cursor editor installed on your macOS.
- **Z.AI API Key**: Obtain your API key from the [Z.AI Developer Console](https://docs.z.ai/).

## Configuration Steps

To use Z.AI models within Cursor, you need to configure it as an OpenAI-compatible provider:

1. **Open Settings**:
   Launch Cursor and open the settings by clicking the gear icon in the top right or pressing `Cmd + Shift + J`.

2. **Navigate to Models**:
   Go to **"Models"** in the sidebar.

3. **Configure OpenAI Protocol**:
   Scroll down to find the **"OpenAI"** section and ensure it is toggled on.

4. **Add Custom Models**:
   Click on **"Add Model"** and enter the following model names in **UPPERCASE**:
   - `GLM-4.7`
   - `GLM-4.5-AIR`

5. **Set API Key and Base URL**:
   - **OpenAI API Key**: Enter the API key you obtained from Z.AI.
   - **Override OpenAI Base URL**: Click on **"Configure"** (or look for the input field) and replace the default URL with:
     `http://api.z.ai/api/coding/paas/v4`

6. **Save**:
   The settings should save automatically. Ensure you have selected one of the GLM models as your active model.

## Visual Sanity Check

To verify the configuration:

1. **Open Chat/Composer**:
   Press `Cmd + L` (Chat) or `Cmd + I` (Composer).
   
2. **Select Model**:
   Ensure the model dropdown shows **GLM-4.7** or **GLM-4.5-AIR**.

3. **Test Request**:
   Ask a question like `How do I implement a debounced search in React?` and wait for the response.

4. **Visual Cues**:
   - The selected model name should be clearly visible in the AI input area.
   - Cursor's AI features (Chat, Composer, Tab) should now be powered by Z.AI.

---

## References

- [Cursor GLM Coding Plan Guide](https://docs.z.ai/devpack/tool/cursor)

*Note: In Cursor, it is crucial to enter the model names in uppercase for them to be correctly identified and routed through the Z.AI endpoint.*
