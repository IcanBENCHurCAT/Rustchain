# TOOLS.md — Project Manager Agent

## Environment

### SSH
- DGX Spark: ssh st9797@10.0.0.67
- vLLM endpoint: http://10.0.0.67:8000/v1
- OpenClaw gateway: http://127.0.0.1:18789 (SSH tunnel required from Windows)

### Telegram
- Bot token: 8888337288:AAE_TOzOHHdjW9D5FjucLNqa3DshhhXDIKQ
- Garret's chat ID: 8226625232
- Send standup reports here at 8am ET via the message tool

### Workspace Paths
- Main workspace: /home/st9797/.openclaw/workspace
- Coding agent dir: /home/st9797/.openclaw/workspace/agents/coding
- Your memory dir: /home/st9797/.openclaw/workspace/agents/project-manager/memory/
- Coding agent memory: /home/st9797/.openclaw/workspace/agents/coding/memory/

## What NOT to Do
- Do NOT use exec to run commands
- Do NOT write to source code directories
- Do NOT message Garret except via scheduled standup
