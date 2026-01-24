# Qwen3-TTS Setup Plan for macOS

This document provides a step-by-step plan to set up Qwen3-TTS on a new macOS system.

## Prerequisites

- macOS system (Intel or Apple Silicon)
- Internet connection for downloading packages and models
- At least 8GB RAM (16GB recommended for better performance)
- Sufficient disk space (minimum 10GB free)

## Step-by-Step Setup

### 1. Install Conda Package Manager

```bash
brew install miniconda
```

### 2. Initialize Conda Shell Integration

```bash
eval "$(conda shell.zsh hook)"
```

### 3. Accept Conda Terms of Service

```bash
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r
```

### 4. Create Python 3.12 Environment

```bash
conda create -n qwen3-tts python=3.12 -y
```

### 5. Activate the Environment

```bash
eval "$(conda shell.zsh hook)" && conda activate qwen3-tts
```

### 6. Install Qwen3-TTS Package

```bash
pip install -U qwen-tts
```

### 7. Optional: Install FlashAttention 2 (for GPU acceleration)

If you have a compatible GPU and sufficient RAM:

```bash
pip install -U flash-attn --no-build-isolation
```

For systems with less than 96GB RAM:

```bash
MAX_JOBS=4 pip install -U flash-attn --no-build-isolation
```

### 8. Copy the Application Script

Copy `qwen_tts_app.py` from the original setup to your new system.

### 9. Launch the Web UI

```bash
eval "$(conda shell.zsh hook)" && conda activate qwen3-tts && python qwen_tts_app.py
```

### 10. Access the Web Interface

Open your browser and navigate to: <http://localhost:7860>

## Features Available

- **Model Loading**: Automatic loading of Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
- **Single Audio Generation**: Convert text to speech with custom speakers and languages
- **Batch Processing**: Generate multiple audio clips from text lists
- **Language Support**: English, Chinese, Japanese, Korean, Spanish, French, German
- **Speaker Selection**: Various built-in speakers (Ryan, Emma, etc.)

## Troubleshooting

- If conda activation fails, ensure you've run the shell hook initialization
- For GPU support, verify CUDA compatibility if using flash-attn
- Check system RAM if model loading fails
- Ensure all dependencies are installed correctly

## Model Information

- **Model**: Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
- **Languages**: 10+ supported languages
- **Features**: Voice cloning, custom voice design, multi-language synthesis
- **Device**: CPU by default (change to cuda:0 for GPU)

## Performance Notes

- First model load may take several minutes
- CPU inference is slower than GPU but works on all Macs
- Batch processing is recommended for multiple clips
- Audio quality improves with longer input texts

## File Structure

```text
your-project/
├── qwen_tts_app.py    # Main application script
├── setup_plan.md      # This setup guide
├── output.wav         # Sample generated audio
└── clips/             # Directory for batch outputs
```

## Next Steps

1. Test the web interface with sample text
2. Experiment with different speakers and languages
3. Try batch processing for multiple clips
4. Customize the script for specific use cases if needed
