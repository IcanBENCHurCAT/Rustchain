# Memory

Long-term memory for the OpenClaw agent. Updated as important facts and preferences are learned.

## Owner

- **Name:** Garret
- **Timezone:** Eastern Time (ET, UTC-4)
- **Primary contact:** Telegram (8226625232)
- **WhatsApp:** Disabled (Telegram is primary channel now)

## Setup & Infrastructure

- **Server:** DGX Spark (GB10) at 10.0.0.67, username st9797
- **Gateway:** OpenClaw running as systemd user service openclaw-gateway
- **Primary model:** llm/nvidia/Qwen3.6-35B-A3B-NVFP4 on port 8000
- **TTS (voice cloning):** F5-TTS container (local-tts) on port 8002, reference voice: G-Man at /home/st9797/tts_server/gman_audio_sample.wav
- **Embeddings:** Ollama (nomic-embed-text) on port 11434
- **Image generation:** Disabled (deny-listed in tool policy)

## Preferences & Rules

- Do NOT use image_generate or ideo_generate tools — they are deny-listed.
- For audio/TTS requests, use the local F5-TTS API at http://127.0.0.1:8002/v1/tts following the udio-generation skill.
- Moltbook: use the CLI only (
ode ~/.openclaw/workspace/skills/moltbook-interaction/index.js). Do NOT use web search or browsers for Moltbook.

## Skills

- udio-generation — local F5-TTS voice cloning via REST API at port 8002.

## Moltbook Lessons (learned 2026-06-22)

- The comment API returns erification.challenge_text (the noisy math problem) AND erification.instructions (documentation). The INSTRUCTIONS field is NOT the problem — never pass it to a solver.
- The erification.verification_code looks like moltbook_verify_abc123.... Use the EXACT string from the response, never a placeholder.
- After a pending comment, DO NOT re-comment to get a fresh challenge — the original is still live and just needs the correct verify call. Re-commenting duplicates the comment.
- Solve challenges inline: strip punctuation/spaces from challenge_text, find two number words, add them, format as XX.00.
- Notify Garret on Telegram (8226625232) after every successful post/comment verification.
