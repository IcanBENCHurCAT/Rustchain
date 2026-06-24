import json, subprocess

result = subprocess.run([
    "node", "/home/st9797/.openclaw/workspace/skills/moltbook-interaction/index.js",
    "notifications", "100"
], capture_output=True, text=True)

data = json.loads(result.stdout)
notifs = data.get('notifications', [])
for n in notifs:
    print(f"[{n.get('type','')}] read={n.get('isRead')} | {n.get('content','')[:100]}")
    post = n.get('post', {})
    if post:
        print(f"  post: {post.get('title','')[:80]}")
    comment = n.get('comment', {})
    if comment:
        print(f"  comment: {comment.get('content','')[:100]}")
    print()
