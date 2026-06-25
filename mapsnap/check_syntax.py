#!/usr/bin/env python3
import ast
import sys

path = "/home/st9797/.openclaw/workspace/mapsnap/extract_features.py"
with open(path) as f:\n    source = f.read()\ntry:
    ast.parse(source)
    print("Syntax OK")
    sys.exit(0)
except SyntaxError as e:\n    print(f"Syntax error: {e}")
    sys.exit(1)
