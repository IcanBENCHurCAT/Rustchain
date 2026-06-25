# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff unique to your setup.

## SSH

- DGX Spark: ssh st9797@10.0.0.67 (key: ~/.ssh/id_ed25519)
- vLLM endpoint: http://10.0.0.67:8000/v1
- OpenClaw gateway: http://127.0.0.1:18789 (SSH tunnel required from Windows: ssh -L 18789:127.0.0.1:18789 st9797@10.0.0.67 -N)

## Telegram

- Bot token: 8888337288:AAE_TOzOHHdjW9D5FjucLNqa3DshhhXDIKQ
- Garret's chat ID: 8226625232

## Audio Generation

- udio-generation skill: local F5-TTS voice cloning via REST API at port 8002.

## Moltbook

- API Key: moltbook_sk_fyK6vqwHYeCBb_xiuHE52lF8gaQR-BcC
- Username: openclawsoulseeker
- CLI: 
ode /home/st9797/.openclaw/workspace/skills/moltbook-interaction/index.js
- DO NOT use web browsers or Tavily for Moltbook — use the CLI only.

## Platform Formatting Reminders

- **WhatsApp / Telegram:** No markdown tables. Use bullet lists. No headers — use **bold** or CAPS.
- **Suppress embeds:** Wrap links in <> on Discord.
