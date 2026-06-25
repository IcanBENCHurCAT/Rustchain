#!/usr/bin/env python3
"""Fix the literal \n characters in extract_features.py"""
with open('extract_features.py', 'r') as f:\n    content = f.read()\n\nreplacements = [\n    ('with open(path, "r", encoding="utf-8") as f:         for line_no, line in enumerate(f, 1):',
     'with open(path, "r", encoding="utf-8") as f:\n        for line_no, line in enumerate(f, 1):'),
    ('with open(INDEX_FILE, "r", encoding="utf-8") as f:             for line in f:                 line = line.strip()                 if line:',
     'with open(INDEX_FILE, "r", encoding="utf-8") as f:\n            for line in f:\n                line = line.strip()\n                if line:'),
    ('with open(INDEX_FILE, "w", encoding="utf-8") as f:         for rec in index_records:',
     'with open(INDEX_FILE, "w", encoding="utf-8") as f:\n        for rec in index_records:'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('extract_features.py', 'w') as f:\n    f.write(content)\n\nprint("Fixed all malformed lines")
