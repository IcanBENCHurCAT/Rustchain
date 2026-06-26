#!/usr/bin/env python3
"""Fix literal \n in janitor.py"""

with open('/home/st9797/.openclaw/workspace/janitor/janitor.py', 'rb') as f:\n    data = f.read()\n\n# Fix broken line: "as f:\n            data = yaml"
old1 = b'as f:\n            data = yaml.safe_load(f) or {}\n        self.age_threshold_days'\nnew1 = b'as f:\n            data = yaml.safe_load(f) or {}\n        self.age_threshold_days'\ndata = data.replace(old1, new1)\n\n# Fix broken line: "as f:\n                    f.write"  
old2 = b'as f:\n                    f.write(audit_entry)\n\n                results.append'\nnew2 = b'as f:\n                    f.write(audit_entry)\n\n                results.append'\ndata = data.replace(old2, new2)\n\nwith open('/home/st9797/.openclaw/workspace/janitor/janitor.py', 'wb') as f:\n    f.write(data)\n\nprint("Fixed both broken lines")
