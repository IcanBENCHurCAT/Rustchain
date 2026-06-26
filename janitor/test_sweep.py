#!/usr/bin/env python3
"""
Janitor - Test Sweep Script
Validates that the janitor can scan the workspace without errors.
Runs a dry-run sweep and reports results.

Usage:
  python3 test_sweep.py          # Full test suite
  python3 test_sweep.py --quick   # Quick sanity check only
"""

import sys
import os
import subprocess
import traceback
from pathlib import Path

JANITOR_DIR = Path(__file__).resolve().parent
JANITOR_PY = JANITOR_DIR / "janitor.py"


def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_pass(msg):
    print(f"  PASS: {msg}")


def print_fail(msg):
    print(f"  FAIL: {msg}")


def print_info(msg):
    print(f"  INFO: {msg}")


def test_cli_help():
    result = subprocess.run(
        [sys.executable, str(JANITOR_PY), "--help"],
        capture_output=True, text=True, timeout=15
    )
    assert result.returncode == 0, f"Help exited with code {result.returncode}"
    assert "janitor" in result.stdout.lower() or "sweep" in result.stdout.lower()
    print_pass("CLI help command works")


def test_cli_sweep():
    result = subprocess.run(
        [sys.executable, str(JANITOR_PY), "sweep"],
        capture_output=True, text=True, timeout=30
    )
    assert result.returncode == 0, f"Sweep exited with code {result.returncode}\n{result.stderr}"
    output = result.stdout
    assert "JANITOR SWEEP REPORT" in output, "Missing sweep report header"
    assert "ELIGIBLE FOR DELETION" in output, "Missing ELIGIBLE section"
    assert "REQUIRES REVIEW" in output, "Missing REVIEW section"
    assert "PROTECTED / ACTIVE" in output, "Missing PROTECTED section"
    assert "SUMMARY" in output, "Missing SUMMARY section"
    print_pass("Sweep command runs and produces a valid report")
    lines = output.strip().split("\n")[:10]
    print_info("First 10 lines of report:")
    for line in lines:
        print(f"    {line}")


def test_cli_dump():
    result = subprocess.run(
        [sys.executable, str(JANITOR_PY), "dump"],
        capture_output=True, text=True, timeout=15
    )
    assert result.returncode == 0, f"Dump exited with code {result.returncode}"
    assert "JANITOR SWEEP REPORT" in result.stdout
    print_pass("Dump command works")


def test_module_import():
    try:
        sys.path.insert(0, str(JANITOR_DIR))
        from janitor import Janitor, JanitorConfig, WorkspaceEntry

        config = JanitorConfig()
        j = Janitor(config=config)
        entries = j.scan_workspace()
        assert len(entries) > 0, "Scan returned no entries"
        report = j.get_report()
        assert "JANITOR SWEEP REPORT" in report
        commands = j.get_dry_run_commands()
        assert isinstance(commands, list)
        print_pass("Module import and programmatic API works")
        print_info(f"  Scanned {len(entries)} workspace entries")
    except Exception as e:
        print_fail(f"Module import failed: {e}")
        raise


def test_config_file():
    config_path = JANITOR_DIR / "config.yaml"
    assert config_path.exists(), "config.yaml not found"

    try:
        import yaml
        with open(config_path) as f:
            data = yaml.safe_load(f)
        assert "age_threshold_days" in data, "Missing age_threshold_days"
        assert "protected_paths" in data, "Missing protected_paths"
        print_pass("config.yaml exists and is valid YAML")
        print_info(f"  Age threshold: {data['age_threshold_days']} days")
        print_info(f"  Protected paths: {len(data['protected_paths'])} entries")
    except ImportError:
        print_info("PyYAML not installed, skipping YAML validation")
    except Exception as e:
        print_fail(f"Config validation failed: {e}")
        raise


def test_python_syntax():
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", str(JANITOR_PY)],
        capture_output=True, text=True, timeout=10
    )
    assert result.returncode == 0, f"Syntax check failed: {result.stderr}"
    print_pass("Python syntax is valid")


def test_cron_syntax():
    cron_py = JANITOR_DIR / "cron_setup.py"
    assert cron_py.exists(), "cron_setup.py not found"

    result = subprocess.run(
        [sys.executable, "-m", "py_compile", str(cron_py)],
        capture_output=True, text=True, timeout=10
    )
    assert result.returncode == 0, f"Cron setup syntax check failed: {result.stderr}"
    print_pass("cron_setup.py syntax is valid")


def main():
    quick = "--quick" in sys.argv

    all_passed = True
    tests = []

    try:
        print_header("Janitor Test Suite")
        print_info(f"Janitor dir: {JANITOR_DIR}")
        print_info(f"Python: {sys.executable} ({sys.version.split()[0]})")

        tests.append(("Python syntax", test_python_syntax))
        tests.append(("Cron syntax", test_cron_syntax))
        tests.append(("Config file", test_config_file))
        tests.append(("CLI help", test_cli_help))

        if not quick:
            tests.append(("CLI sweep (dry-run)", test_cli_sweep))
            tests.append(("CLI dump", test_cli_dump))
            tests.append(("Module import", test_module_import))

        print(f"\nRunning {len(tests)} test(s)...\n")

        for name, func in tests:
            func()
    except Exception as e:
        print_fail(f"Test failed: {e}")
        all_passed = False

    print_header("Results")
    status = "ALL PASSED" if all_passed else "SOME FAILED"
    print(f"  Status: {status}")
    print(f"  Tests run: {len(tests)}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
