import torch
import soundfile as sf
import gradio as gr
from qwen_tts import Qwen3TTSModel
import os

class QwenTTSApp:
    def __init__(self):
        self.model = None
        self.device = "cpu"  # Change to "cuda:0" if GPU available
        self.dtype = torch.bfloat16
        self.attn_implementation = "eager"  # Use "flash_attention_2" if available

    def load_model(self, model_name="Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"):
        """Load the TTS model"""
        if self.model is None:
            print(f"Loading model: {model_name}")
            self.model = Qwen3TTSModel.from_pretrained(
                model_name,
                device_map=self.device,
                dtype=self.dtype,
                attn_implementation=self.attn_implementation,
            )
            print("Model loaded successfully!")
        return "Model loaded successfully!"

    def generate_speech(self, text, language="English", speaker="Ryan", output_file="output.wav"):
        """Generate speech from text"""
        if self.model is None:
            return None, "Please load the model first!"

        try:
            print(f"Generating speech for: '{text}' in {language} by {speaker}")
            wavs, sr = self.model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
            )

            # Save the audio
            sf.write(output_file, wavs[0], sr)
            print(f"Audio saved to: {output_file}")
            return output_file, f"Audio generated successfully! Saved as {output_file}"

        except Exception as e:
            return None, f"Error generating audio: {str(e)}"

    def batch_generate(self, texts, language="English", speaker="Ryan", output_dir="clips"):
        """Generate multiple audio clips"""
        if self.model is None:
            return "Please load the model first!"

        os.makedirs(output_dir, exist_ok=True)
        results = []

        for i, text in enumerate(texts):
            output_file = os.path.join(output_dir, f"clip_{i+1}.wav")
            file_path, message = self.generate_speech(text.strip(), language, speaker, output_file)
            if file_path:
                results.append(f"Clip {i+1}: {message}")
            else:
                results.append(f"Clip {i+1}: Failed - {message}")

        return "\n".join(results)

def create_gradio_interface():
    """Create a Gradio web interface"""
    app = QwenTTSApp()

    with gr.Blocks(title="Qwen3-TTS Custom Voice Generator") as interface:
        gr.Markdown("# Qwen3-TTS Custom Voice Generator")
        gr.Markdown("Generate high-quality speech using Qwen3-TTS model")

        with gr.Row():
            model_name = gr.Textbox(
                label="Model Name",
                value="Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
                placeholder="Enter model name"
            )
            load_btn = gr.Button("Load Model", variant="primary")

        status_text = gr.Textbox(label="Status", interactive=False)

        with gr.Row():
            with gr.Column():
                text_input = gr.Textbox(
                    label="Text to Generate",
                    placeholder="Enter the text you want to convert to speech",
                    lines=3
                )
                language = gr.Dropdown(
                    choices=["English", "Chinese", "Japanese", "Korean", "Spanish", "French", "German"],
                    value="English",
                    label="Language"
                )
                speaker = gr.Textbox(
                    label="Speaker",
                    value="Ryan",
                    placeholder="Speaker name (e.g., Ryan, Emma, etc.)"
                )
                generate_btn = gr.Button("Generate Speech", variant="primary")

            with gr.Column():
                audio_output = gr.Audio(label="Generated Audio")
                output_message = gr.Textbox(label="Output Message", interactive=False)

        with gr.Row():
            with gr.Column():
                batch_text = gr.Textbox(
                    label="Batch Text (one per line)",
                    placeholder="Enter multiple texts, one per line",
                    lines=5
                )
                batch_output_dir = gr.Textbox(
                    label="Output Directory",
                    value="clips",
                    placeholder="Directory to save batch clips"
                )
                batch_btn = gr.Button("Generate Batch Clips")

            with gr.Column():
                batch_output = gr.Textbox(label="Batch Results", interactive=False, lines=10)

        # Event handlers
        load_btn.click(
            fn=app.load_model,
            inputs=[model_name],
            outputs=[status_text]
        )

        generate_btn.click(
            fn=app.generate_speech,
            inputs=[text_input, language, speaker],
            outputs=[audio_output, output_message]
        )

        batch_btn.click(
            fn=lambda texts, lang, spk, out_dir: app.batch_generate(
                [t.strip() for t in texts.split('\n') if t.strip()],
                lang, spk, out_dir
            ),
            inputs=[batch_text, language, speaker, batch_output_dir],
            outputs=[batch_output]
        )

    return interface

if __name__ == "__main__":
    # Create and launch the web interface
    interface = create_gradio_interface()
    interface.launch(server_name="0.0.0.0", server_port=7860, share=False)