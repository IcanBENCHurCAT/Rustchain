---
name: audio-generation
description: Clone voices and synthesize speech/audio using the local F5-TTS container API.
---

# Audio Generation & Voice Cloning Skill

Use this skill when the user requests text-to-speech (TTS), audio synthesis, or voice cloning. The system is equipped with a local F5-TTS container service.

## API Endpoint
* **URL**: http://127.0.0.1:8002/v1/tts
* **Method**: POST
* **Content-Type**: pplication/json

### Request Payload Schema:
`json
{
   text: The target text to synthesize into speech.,
  ref_text: The exact transcript matching the reference audio.,
  ref_audio_b64: Base64 encoded string of the reference WAV audio.
}
`

### Response Schema:
`json
{
  audio_b64: Base64 encoded synthesized WAV audio data.,
  format: wav
}
`

## Voice References
1. **G-Man (Default / Custom Voice)**:
   * **WAV Path**: /home/st9797/tts_server/gman_audio_sample.wav
   * **Transcript**: The dark storm clouds rolled slowly over the ancient valley, casting long, eerie shadows across the forgotten ruins in the quiet of the night. A soft glow illuminated the dusty
2. **Standard English voice**:
   * **WAV Path**: /home/st9797/tts_server/F5-TTS/src/f5_tts/infer/examples/basic/basic_ref_en.wav
   * **Transcript**: Some call me nature, others call me mother nature.

## Synthesis Best Practices & Workflow

1. **Chunking Large Text**: F5-TTS performs best on shorter audio segments. For text longer than 40-50 words (e.g. poems, articles, songs):
   * Split the text into stanzas, paragraphs, or sentences.
   * Generate each segment sequentially to avoid timeout or audio degradation.
   * Save individual files temporarily (e.g., part_0.wav, part_1.wav).
2. **Audio Concatenation**: Concatenate the parts using python's built-in wave module:
   * Read parameters from the first part (getparams()).
   * Insert silence (pcm binary '\x00') between parts for natural pacing (e.g., 0.8s of silence = sample_rate * 0.8 * channels * sample_width bytes).
   * Write out the combined WAV.
3. **Run Environment**: Ensure scripts executing this API are run locally on the gateway host.
