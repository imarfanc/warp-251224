import torch
import soundfile as sf
import gradio as gr
from qwen_tts import Qwen3TTSModel
import os

class QwenTTSApp:
    def __init__(self):
        self.model = None
        self.current_model_name = None
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        if self.device == "mps":
            print("Using MPS device for acceleration")
        self.dtype = torch.bfloat16
        self.attn_implementation = "eager"  # Use "flash_attention_2" if available

    def load_model(self, model_name):
        """Load or reload the TTS model if needed"""
        if self.model is None or self.current_model_name != model_name:
            print(f"Loading model: {model_name}")
            # Clear memory if a model was already loaded
            if self.model is not None:
                del self.model
                if self.device == "mps":
                    torch.mps.empty_cache()
                elif self.device.startswith("cuda"):
                    torch.cuda.empty_cache()
            
            self.model = Qwen3TTSModel.from_pretrained(
                model_name,
                device_map=self.device,
                dtype=self.dtype,
                attn_implementation=self.attn_implementation,
            )
            self.current_model_name = model_name
            print(f"Model {model_name} loaded successfully!")
        return f"Model {model_name} loaded successfully!"

    def generate_custom_voice(self, text, language="English", speaker="Ryan", output_file="output_custom.wav"):
        """Generate speech using CustomVoice model"""
        self.load_model("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice")
        try:
            wavs, sr = self.model.generate_custom_voice(text, language=language, speaker=speaker)
            sf.write(output_file, wavs[0], sr)
            return output_file, f"Success: {output_file}"
        except Exception as e:
            return None, f"Error: {str(e)}"

    def generate_voice_design(self, text, instruct, language="English", output_file="output_design.wav"):
        """Generate speech using VoiceDesign model"""
        self.load_model("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign")
        try:
            wavs, sr = self.model.generate_voice_design(text, language=language, instruct=instruct)
            sf.write(output_file, wavs[0], sr)
            return output_file, f"Success: {output_file}"
        except Exception as e:
            return None, f"Error: {str(e)}"

    def generate_voice_clone(self, text, ref_audio, ref_text=None, language="English", output_file="output_clone.wav"):
        """Generate speech using Base model (Cloning)"""
        self.load_model("Qwen/Qwen3-TTS-12Hz-1.7B-Base")
        try:
            # ref_audio in Gradio is typically a file path
            # x_vector_only_mode=True is required if ref_text is not provided
            x_vector_only_mode = not bool(ref_text)
            wavs, sr = self.model.generate_voice_clone(
                text=text,
                language=language,
                ref_audio=ref_audio,
                ref_text=ref_text if ref_text else "",
                x_vector_only_mode=x_vector_only_mode
            )
            sf.write(output_file, wavs[0], sr)
            return output_file, f"Success: {output_file}"
        except Exception as e:
            return None, f"Error: {str(e)}"

# Custom CSS for dark mode and styling
CSS = """
#header { text-align: center; margin-bottom: 20px; }
.gradio-container { max-width: 900px !important; margin: 0 auto !important; }
"""

def create_gradio_interface():
    """Create a multi-tab Gradio web interface"""
    app = QwenTTSApp()
    
    with gr.Blocks() as interface:
        gr.Markdown("# 🎙️ Qwen3-TTS Studio", elem_id="header")
        gr.Markdown("Advanced Speech Synthesis with Voice Design and Cloning capabilities.")

        with gr.Tabs():
            # Standard TTS Tab
            with gr.TabItem("Standard TTS"):
                with gr.Row():
                    with gr.Column():
                        tts_text = gr.Textbox(label="Text to Generate", placeholder="Enter text here...", lines=3)
                        with gr.Row():
                            tts_lang = gr.Dropdown(
                                choices=["Auto", "English", "Chinese", "Japanese", "Korean", "Spanish", "French", "German", "Italian", "Portuguese", "Russian"],
                                value="Auto", label="Language"
                            )
                            tts_speaker = gr.Textbox(label="Speaker", value="Ryan")
                        tts_btn = gr.Button("Generate Audio", variant="primary")
                    with gr.Column():
                        tts_audio = gr.Audio(label="Output")
                        tts_msg = gr.Textbox(label="Status", interactive=False)

            # Voice Design Tab
            with gr.TabItem("Voice Design"):
                gr.Markdown("Create a unique voice by describing it in natural language.")
                with gr.Row():
                    with gr.Column():
                        vd_instruct = gr.Textbox(
                            label="Voice Description (Instruct)", 
                            placeholder="e.g., A calm middle-aged man with a deep, soothing voice...", 
                            lines=2
                        )
                        vd_text = gr.Textbox(label="Target Text", placeholder="What should the voice say?", lines=2)
                        vd_lang = gr.Dropdown(
                            choices=["Auto", "English", "Chinese", "Japanese", "Korean", "Spanish", "French", "German", "Italian", "Portuguese", "Russian"],
                            value="Auto", label="Language"
                        )
                        vd_btn = gr.Button("Design & Generate", variant="primary")
                    with gr.Column():
                        vd_audio = gr.Audio(label="Output")
                        vd_msg = gr.Textbox(label="Status", interactive=False)

            # Voice Clone Tab
            with gr.TabItem("Voice Clone"):
                gr.Markdown("Clone a voice using a short reference audio clip.")
                with gr.Row():
                    with gr.Column():
                        vc_ref_audio = gr.Audio(label="Reference Audio", type="filepath")
                        vc_ref_text = gr.Textbox(label="Reference Text (Optional)", placeholder="Full transcript of the reference audio for better quality")
                        vc_text = gr.Textbox(label="Target Text", placeholder="Content to synthesize in the cloned voice", lines=2)
                        vc_lang = gr.Dropdown(
                            choices=["Auto", "English", "Chinese", "Japanese", "Korean", "Spanish", "French", "German", "Italian", "Portuguese", "Russian"],
                            value="Auto", label="Language"
                        )
                        vc_btn = gr.Button("Clone & Generate", variant="primary")
                    with gr.Column():
                        vc_audio = gr.Audio(label="Output")
                        vc_msg = gr.Textbox(label="Status", interactive=False)

        # Event handlers
        tts_btn.click(
            fn=app.generate_custom_voice,
            inputs=[tts_text, tts_lang, tts_speaker],
            outputs=[tts_audio, tts_msg]
        )
        
        vd_btn.click(
            fn=app.generate_voice_design,
            inputs=[vd_text, vd_instruct, vd_lang],
            outputs=[vd_audio, vd_msg]
        )
        
        vc_btn.click(
            fn=app.generate_voice_clone,
            inputs=[vc_text, vc_ref_audio, vc_ref_text, vc_lang],
            outputs=[vc_audio, vc_msg]
        )

    return interface

if __name__ == "__main__":
    interface = create_gradio_interface()
    interface.launch(
        server_name="0.0.0.0", 
        server_port=7860, 
        share=False,
        theme=gr.themes.Soft(primary_hue="orange", secondary_hue="gray", neutral_hue="slate"),
        css=CSS
    )