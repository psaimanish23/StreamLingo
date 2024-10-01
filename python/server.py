import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
import asyncio
import websockets
import numpy as np
from transformers import MBartForConditionalGeneration, MBart50TokenizerFast
from faster_whisper import WhisperModel
from gtts import gTTS
import io


# Define paths
model_name = "facebook/mbart-large-50-many-to-many-mmt"
model = WhisperModel("large-v3", device="auto")
translation_model = MBartForConditionalGeneration.from_pretrained(model_name)
tokenizer = MBart50TokenizerFast.from_pretrained(model_name)

client_buffers = {}

async def audio_handler(websocket, path):
    client_buffers[websocket] = bytearray()

    try:
        async for message in websocket:
            buffer = client_buffers[websocket]
            buffer.extend(message)

            if len(buffer) >= get_dynamic_buffer_size():  # Dynamic buffer size
                audio_data = np.frombuffer(buffer, dtype=np.int16).astype(np.float32) / 32768.0

                # Transcribe and translate
                transcription_text = transcribe_audio(audio_data)
                translation_text = translate_text(transcription_text, translation_model, tokenizer, "hi_IN")

                print(f"Transcription: {transcription_text}, Translation: {translation_text}")

                # Stream translated speech
                await stream_translated_speech(websocket, translation_text, "hi")

                client_buffers[websocket] = bytearray()

    finally:
        del client_buffers[websocket]  # Clean up when client disconnects

def transcribe_audio(audio_buffer):
    segments, info = model.transcribe(audio_buffer)
    return ''.join([segment.text for segment in segments]).strip()

def translate_text(text, model, tokenizer, target_lang):
    tokenizer.src_lang = "en_XX"
    encoded_text = tokenizer(text, return_tensors="pt")
    generated_tokens = model.generate(
        **encoded_text,
        forced_bos_token_id=tokenizer.lang_code_to_id[target_lang]
    )
    return tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0].strip()

async def stream_translated_speech(websocket, text, dest_lang):
    converter = gTTS(text, lang=dest_lang, slow=False)
    speech_buffer = io.BytesIO()
    converter.write_to_fp(speech_buffer)
    speech_buffer.seek(0)
    audio_data = speech_buffer.read()
    await websocket.send(audio_data)

def get_dynamic_buffer_size():
    return 16000 * 5  # Placeholder for dynamic buffer size logic

async def main():
    async with websockets.serve(audio_handler, "localhost", 8000):
        print("Server listening on ws://localhost:8000")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
