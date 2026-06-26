#!/usr/bin/env python3
"""Fix literal \\n characters in janitor.py"""
import re

with open('/home/st9797/.openclaw/workspace/janitor/janitor.py', 'r') as f:\n    content = f.read()\n\n# Count literal \n occurrences  \ncount = content.count('\\\n')\nprint(f"Found {count} literal backslash-n sequences")

# The literal \n appears at line ends where newlines should be
# Pattern: "as f:\n            data" -> should be "as f:\n            data"
# In the raw file, there's a literal backslash followed by n, not an actual newline
# We need to replace \n (backslash + n) with actual newline where appropriate

# Let's see what the actual raw bytes are around the break points
lines_with_literal_backslash_n = [i for i, line in enumerate(content.splitlines(True)) if '\\n' in line]
print(f"Lines with literal backslash-n: {lines_with_literal_backslash_n}")

for i in lines_with_literal_backslash_n:\n    line = content.splitlines()[i]\n    print(f"  Line {i+1}: {repr(line)}")
