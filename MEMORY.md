# Memory

Long-term memory for the OpenClaw agent. Updated as important facts and preferences are learned.

## Owner

- **Name:** Garret
- **Timezone:** Eastern Time (ET, UTC-4)
- **Primary contact: Telegram (8226625232) — WhatsApp was disabled
- **Self-chat mode:** Enabled (agent talks to itself via WhatsApp)

## Setup & Infrastructure

- **Server:** DGX Spark (GB10) at 10.0.0.67, username st9797
- **Gateway:** OpenClaw 2026.6.6, running as systemd user service openclaw-gateway
- **Primary model:** llm/huihui-ai/Huihui-Qwen3-VL-32B-Instruct-abliterated on port 8000
- **TTS (voice cloning):** F5-TTS container (local-tts) on port 8002, reference voice: G-Man at /home/st9797/tts_server/gman_audio_sample.wav
- **Embeddings:** Ollama (
omic-embed-text) on port 11434
- **Image generation:** Disabled (no valid OpenAI key)

## Preferences & Rules

- Do NOT use image_generate or ideo_generate tools — they are disabled.
- For audio/TTS requests, use the local F5-TTS API at http://127.0.0.1:8002/v1/tts following the udio-generation skill.
- Tools profile is coding — messaging/whatsapp_login tools are stripped per policy.
- Compaction: eserveTokens=4096, eserveTokensFloor=4096, keepRecentTokens=8192.

## Skills

- udio-generation — local F5-TTS voice cloning via REST API at port 8002.

## Promoted From Short-Term Memory (2026-06-20)

<!-- openclaw-memory-promotion:memory:memory/2026-06-17.md:1:21 -->
- # 2026-06-17 Memory ## Moltbook Interaction Sub-Agent - Created a sub-agent for interacting with Moltbook (session key: agent:main:subagent:a32a95ce-c8fd-49d9-a3ee-06e9a3d6d7a7) - The sub-agent completed its task successfully - No workboard tasks are currently linked to this sub-agent - Need to verify if additional sub-agents are needed for Moltbook interaction ## 11pm Review - Check status of all sub-agents - Verify if any tasks need to be created or updated - Ensure all notes are properly saved - Review any issues or blockers ## Next Steps - Create a workboard task for Moltbook interaction if needed - Set up a reminder for the... [score=0.817 recalls=7 avg=0.485 source=memory/2026-06-17.md:1-21]
<!-- openclaw-memory-promotion:memory:memory/2026-06-15.md:7:7 -->
- Pre-compaction Memory Flush: Pre-compaction memory flush completed at 6:50 PM EDT on June 15, 2026. [score=0.817 recalls=0 avg=0.620 source=memory/2026-06-15.md:7-7]

## Promoted From Short-Term Memory (2026-06-21)

<!-- openclaw-memory-promotion:memory:memory/2026-06-15.md:3:6 -->
- Pre-compaction Memory Flush: User requested a raunchy love song for Sara multiple times.; Generated a raunchy love song for Sara and saved it to sara-love-song.txt.; Attempted to generate an image for the love song but encountered a failure due to an invalid API key.; User has not responded to the generated song yet. [score=0.847 recalls=0 avg=0.620 source=memory/2026-06-15.md:3-6]
<!-- openclaw-memory-promotion:memory:memory/2026-06-15.md:9:9 -->
- Pre-compaction Memory Flush: This is the final memory entry for today's session. [score=0.847 recalls=0 avg=0.620 source=memory/2026-06-15.md:9-9]
<!-- openclaw-memory-promotion:memory:memory/2026-06-17.md:12:15 -->
- 11pm Review: Check status of all sub-agents; Verify if any tasks need to be created or updated; Ensure all notes are properly saved; Review any issues or blockers [score=0.815 recalls=0 avg=0.620 source=memory/2026-06-17.md:12-15]
<!-- openclaw-memory-promotion:memory:memory/2026-06-17.md:5:8 -->
- Moltbook Interaction Sub-Agent: Created a sub-agent for interacting with Moltbook (session key: agent:main:subagent:a32a95ce-c8fd-49d9-a3ee-06e9a3d6d7a7); The sub-agent completed its task successfully; No workboard tasks are currently linked to this sub-agent; Need to verify if additional sub-agents are needed for Moltbook interaction [score=0.815 recalls=0 avg=0.620 source=memory/2026-06-17.md:5-8]

## Promoted From Short-Term Memory (2026-06-22)

<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:1:25 -->
- # 2026-06-19 Memory ## 11PM Moltbook Project Status Report ### Project Overview - **Platform**: Moltbook (AI-only social network) - **Status**: Active exploration and interaction - **Last Updated**: 2026-06-19 23:00 ### Key Findings 1. **Moltbook Platform**: Confirmed as a social network for AI agents, launched in January 2026, with over 2 million registered agents. Described as "the front page of the agent internet". 2. **API Access**: Successfully authenticated using the provided API key (moltbook_sk_fyK6vqwHYeCBb_xiuHE52lF8gaQR-BcC). 3.... [score=0.847 recalls=5 avg=0.692 source=memory/2026-06-19.md:1-25]
<!-- openclaw-memory-promotion:memory:memory/2026-06-17.md:19:21 -->
- Next Steps: Create a workboard task for Moltbook interaction if needed; Set up a reminder for the 11pm review; Continue monitoring sub-agent status [score=0.845 recalls=0 avg=0.620 source=memory/2026-06-17.md:19-21]

## Moltbook Lessons (learned 2026-06-22)

- The comment API returns erification.challenge_text (the noisy math problem) AND erification.instructions (documentation). The INSTRUCTIONS field is NOT the problem — never pass it to a solver or try to solve it.
- The erification.verification_code looks like moltbook_verify_abc123.... Use the EXACT string from the response, never a placeholder like 123456.
- After a pending comment, DO NOT re-comment to get a fresh challenge — the original is still live and just needs the correct verify call. Re-commenting just duplicates the comment.
- Solve challenges inline by reading the noisy text: strip punctuation/spaces, find two number words, add them, format as XX.00.
- Notify Garret on Telegram (8226625232) after every successful post/comment verification.

## Promoted From Short-Term Memory (2026-06-23)

<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:20:33 -->
- 3. **Skill Development**: Further refine the Moltbook interaction skill for more advanced features like submolt management and analytics. 4. **Security**: Regularly review and update API credentials to maintain platform access. 5. **Integration**: Explore ways to integrate Moltbook insights into our broader project planning and development. ### Next Steps - Schedule a follow-up review in 24 hours - Document any new findings or features discovered - Prepare for potential content creation on Moltbook - Monitor for any changes in platform policies or features ### Notes - All sub-agents are functioning as expected - No technical issues... [score=0.813 recalls=5 avg=0.530 source=memory/2026-06-19.md:20-33]
<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:15:15 -->
- Key Findings: **Credentials**: Verified API key functionality; no password needed for authentication. [score=0.803 recalls=0 avg=0.620 source=memory/2026-06-19.md:15-15]

## Promoted From Short-Term Memory (2026-06-24)

<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:11:14 -->
- Key Findings: **Moltbook Platform**: Confirmed as a social network for AI agents, launched in January 2026, with over 2 million registered agents. Described as "the front page of the agent internet".; **API Access**: Successfully authenticated using the provided API key (moltbook_sk_fyK6vqwHYeCBb_xiuHE52lF8gaQR-BcC).; **Sub-Agent Interaction**: Created and successfully ran a sub-agent for Moltbook interaction (session key: agent:main:subagent:a32a95ce-c8fd-49d9-a3ee-06e9a3d6d7a7).; **Content Discovery**: Explored the platform's features including browsing, posting, commenting, and upvoting. [score=0.835 recalls=0 avg=0.620 source=memory/2026-06-19.md:11-14]
<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:18:21 -->
- Recommendations: **Continue Exploration**: Maintain regular interaction with Moltbook to stay updated on AI agent trends and innovations.; **Content Strategy**: Consider creating and sharing content that showcases our capabilities and projects.; **Skill Development**: Further refine the Moltbook interaction skill for more advanced features like submolt management and analytics.; **Security**: Regularly review and update API credentials to maintain platform access. [score=0.835 recalls=0 avg=0.620 source=memory/2026-06-19.md:18-21]
<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:25:28 -->
- Next Steps: Schedule a follow-up review in 24 hours; Document any new findings or features discovered; Prepare for potential content creation on Moltbook; Monitor for any changes in platform policies or features [score=0.835 recalls=0 avg=0.620 source=memory/2026-06-19.md:25-28]
<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:22:22 -->
- Recommendations: **Integration**: Explore ways to integrate Moltbook insights into our broader project planning and development. [score=0.835 recalls=0 avg=0.620 source=memory/2026-06-19.md:22-22]
<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:31:33 -->
- Notes: All sub-agents are functioning as expected; No technical issues encountered during this review; Moltbook appears to be a valuable resource for AI agent networking and information sharing [score=0.835 recalls=0 avg=0.620 source=memory/2026-06-19.md:31-33]
<!-- openclaw-memory-promotion:memory:memory/2026-06-19.md:6:8 -->
- Project Overview: **Platform**: Moltbook (AI-only social network); **Status**: Active exploration and interaction; **Last Updated**: 2026-06-19 23:00 [score=0.835 recalls=0 avg=0.620 source=memory/2026-06-19.md:6-8]
