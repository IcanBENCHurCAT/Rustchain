#!/usr/bin/env python3
"""
Gyao Workspace Cleanup Automation

A system agent that scans the workspace for abandoned/stale files,
cross-references them with workboard items, and enables safe deletion
via explicit commands.

Usage from OpenClaw main agent:
  1. Parse message for /janitor commands
  2. Route to corresponding Janitor method
  3. Format and return report to user

Commands:
  /janitor sweep            -> Full sweep report (DRY RUN)
  /janitor sweep --live     -> Execute all GREEN deletions (LIVE)
  /janitor sweep --live --target <name>
  /janitor sweep --live --target <name> --keep
  /janitor dump             -> Show all flagged items
  /janitor dump <name>      -> Show details of specific item
"""

import os
import re
import sys
import json
import yaml
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
import subprocess


WORKSPACE = Path.home() / ".openclaw" / "workspace"
CONFIG_PATH = Path(__file__).parent / "config.yaml"
AUDIT_LOG = Path(__file__).parent / "audit.log"


class JanitorConfig:
    """Loads and validates janitor configuration."""

    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or CONFIG_PATH
        self.age_threshold_days: int = 30
        self.excluded_patterns: List[str] = []
        self.protected_paths: List[str] = []
        self.protected_file_patterns: List[str] = []
        self.auto_delete_confidence_threshold: float = 0.9
        self._load()

    def _load(self) -> None:
        if not self.config_path.exists():
            return
        with open(self.config_path) as f:
            data = yaml.safe_load(f) or {}
        self.age_threshold_days = data.get("age_threshold_days", 30)
        self.excluded_patterns = data.get("excluded_patterns", [])
        self.protected_paths = data.get("protected_paths", [])
        self.protected_file_patterns = data.get("protected_file_patterns", [])
        self.auto_delete_confidence_threshold = data.get(
            "auto_delete_confidence_threshold", 0.9
        )


class WorkspaceEntry:
    """Represents a single file or directory entry in the workspace."""

    def __init__(self, path: Path, relative: str, stat):
        self.path = path
        self.relative = relative
        self.name = path.name
        self.is_dir = path.is_dir()
        self.size = stat.st_size
        self.mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        self.age_days = (
            datetime.now(tz=timezone.utc) - self.mtime
        ).days
        self.is_protected = False
        self.has_workboard_item = False
        self.workboard_item_status: Optional[str] = None
        self.workboard_item_id: Optional[str] = None
        self.safety_level: str = "GREEN"  # GREEN, YELLOW, RED, PROTECTED
        self.eligible: bool = True
        self.delete_reason: str = ""

    def __repr__(self) -> str:
        return f"<WorkspaceEntry {self.relative} age={self.age_days}d safety={self.safety_level}>"


class WorkboardChecker:
    """Checks workboard status for workspace paths."""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def check_path(self, entry: WorkspaceEntry) -> bool:
        """
        Check if a workboard item exists for this path.
        Returns True if a matching workboard item was found.
        """
        if entry.is_protected:
            return False
        return False

    def mark_from_workboard_data(self, scan_results: List[WorkspaceEntry]) -> None:
        """
        Fill in workboard status from data passed by the main agent.
        Main agent calls workboard_list() and passes results here.
        """
        pass


class Janitor:
    """Main Janitor class - scan, analyze, report, and execute."""

    KNOWN_PROJECTS = [
        "automated-content",
        "social-media",
        "conyers-tutor",
        "conyers-visual-geo",
        "map-snap",
        "surveillance-rpg",
    ]

    def __init__(self, config: Optional[JanitorConfig] = None):
        self.config = config or JanitorConfig()
        self.entries: List[WorkspaceEntry] = []
        self.wb_checker = WorkboardChecker()

    # ------------------------------------------------------------------ Scanning

    def scan_workspace(self) -> List[WorkspaceEntry]:
        """Walk the workspace and collect all file/dir entries."""
        self.entries = []
        workspace = WORKSPACE

        for item in sorted(workspace.iterdir()):
            if item.name.startswith("."):
                continue
            if item.name in self.config.excluded_patterns:
                continue

            stat = item.stat()
            entry = WorkspaceEntry(item, item.name, stat)

            if self._is_protected(item):
                entry.is_protected = True
                entry.safety_level = "PROTECTED"
                entry.eligible = False
                entry.delete_reason = "Protected path"

            self.entries.append(entry)

        return self.entries

    def _is_protected(self, path: Path) -> bool:
        """Check if a path is in the protected list."""
        name = path.name
        try:
            rel = str(path.relative_to(WORKSPACE))
        except ValueError:
            rel = name

        if name in self.config.protected_paths:
            return True
        if rel in self.config.protected_paths:
            return True

        # Directory match (with or without trailing slash)
        for pp in self.config.protected_paths:
            if pp.endswith("/"):
                if name == pp.rstrip("/"):
                    return True
            else:
                if name == pp:
                    return True

        # Pattern match on protected file patterns
        for pattern in self.config.protected_file_patterns:
            if re.match(pattern.lstrip("*").lstrip(".") + "$", name):
                return True

        return False

    # ----------------------------------------------------------- Workboard Integration

    def populate_workboard_status(
        self, workboard_items: List[Dict[str, Any]], board_map: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Fill in workboard status for scanned entries.
        Called by the main agent after fetching workboard data.
        """
        for entry in self.entries:
            if entry.is_protected or not entry.eligible:
                continue

            name_match = False
            for item in workboard_items:
                title = item.get("title", "").lower()
                item_id = item.get("id", "")
                status = item.get("status", "blocked")

                # Match by name (case-insensitive, partial)
                if entry.name.lower() in title or title in entry.name.lower():
                    name_match = True

                # Also match against known project directory names
                for proj in self.KNOWN_PROJECTS:
                    if proj in entry.name.lower() or proj in title:
                        name_match = True
                        break

                if name_match:
                    entry.has_workboard_item = True
                    entry.workboard_item_status = status
                    entry.workboard_item_id = item_id
                    break

            # Assign safety level based on workboard status
            if entry.has_workboard_item:
                status = entry.workboard_item_status
                if status in ("ready", "running", "todo"):
                    entry.safety_level = "RED"
                    entry.eligible = False
                    entry.delete_reason = f"Active workboard item ({status})"
                elif status in ("blocked", "done"):
                    entry.safety_level = "YELLOW"
                    entry.delete_reason = f"Workboard item exists ({status}) -- review needed"
                elif status == "archived":
                    entry.safety_level = "GREEN"
                else:
                    entry.safety_level = "YELLOW"
                    entry.delete_reason = f"Unknown workboard status ({status})"

            # If no workboard item, use age to determine eligibility
            if not entry.has_workboard_item:
                if entry.age_days >= self.config.age_threshold_days * 2:
                    entry.safety_level = "GREEN"
                    entry.delete_reason = f"Orphaned, {entry.age_days} days old"
                elif entry.age_days >= self.config.age_threshold_days:
                    entry.safety_level = "YELLOW"
                    entry.delete_reason = f"No workboard item, {entry.age_days} days old"
                else:
                    entry.eligible = False
                    entry.delete_reason = f"Only {entry.age_days} days old (threshold: {self.config.age_threshold_days})"

    # --------------------------------------------------------------- Reporting

    def get_report(self) -> str:
        """Generate a formatted sweep report."""
        now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M %Z")
        lines: List[str] = [
            "JANITOR SWEEP REPORT",
            f"Date: {now}",
            f"Workspace: {WORKSPACE}",
            "",
        ]

        green = [e for e in self.entries if e.safety_level == "GREEN" and e.eligible and not e.is_protected]
        yellow = [e for e in self.entries if e.safety_level == "YELLOW"]
        red = [e for e in self.entries if e.safety_level == "RED"]
        protected = [e for e in self.entries if e.is_protected]

        total_scanned = len([e for e in self.entries if not e.is_protected])

        # ELIGIBLE FOR DELETION (GREEN)
        lines.append("=== ELIGIBLE FOR DELETION (GREEN) ===")
        if green:
            lines.append(f"[{len(green)} items]")
            for i, e in enumerate(green, 1):
                size_str = self._format_size(e.size)
                lines.append(f"{i}. [{e.age_days}d] `{e.name}`")
                lines.append(f"   - Type: {'directory' if e.is_dir else 'file'}")
                lines.append(f"   - Workboard: {'yes' if e.has_workboard_item else 'none'}")
                lines.append(f"   - Age: {e.age_days} days")
                lines.append(f"   - Size: {size_str}")
                lines.append(f"   - Reason: {e.delete_reason}")
                lines.append("")
        else:
            lines.append("[none -- workspace is clean!]")
            lines.append("")

        # REVIEW NEEDED (YELLOW)
        lines.append("=== REQUIRES REVIEW (YELLOW) ===")
        if yellow:
            lines.append(f"[{len(yellow)} items]")
            for i, e in enumerate(yellow, 1):
                size_str = self._format_size(e.size)
                lines.append(f"{i}. [{e.age_days}d] `{e.name}`")
                lines.append(f"   - Type: {'directory' if e.is_dir else 'file'}")
                lines.append(f"   - Workboard: {'yes' if e.has_workboard_item else 'none'}")
                lines.append(f"   - Age: {e.age_days} days")
                lines.append(f"   - Size: {size_str}")
                lines.append(f"   - Reason: {e.delete_reason}")
                lines.append("")
        else:
            lines.append("[none]")
            lines.append("")

        # PROTECTED / ACTIVE (SKIP)
        lines.append("=== PROTECTED / ACTIVE (SKIP) ===")
        all_skipped = red + protected
        if all_skipped:
            for e in all_skipped:
                if e.is_protected:
                    lines.append(f"- `{e.name}` -- Protected path -- never delete")
                else:
                    lines.append(f"- `{e.name}` -- Active workboard project ({e.workboard_item_status})")
            lines.append("")
        else:
            lines.append("[none]")
            lines.append("")

        # SUMMARY
        lines.append("=== SUMMARY ===")
        lines.append(f"Total items scanned: {total_scanned}")
        lines.append(f"Eligible (GREEN): {len(green)}")
        lines.append(f"Review needed (YELLOW): {len(yellow)}")
        lines.append(f"Skipped -- active (RED): {len(red)}")
        lines.append(f"Skipped -- protected: {len(protected)}")
        lines.append("")
        if green:
            lines.append("Run `/janitor sweep --live` to delete eligible items")
        else:
            lines.append("OK -- No items need cleanup.")

        return chr(10).join(lines)

    def get_dump_details(self, name: str) -> str:
        """Show details for a specific target by name."""
        for e in self.entries:
            if e.name.lower() == name.lower():
                lines: List[str] = [
                    f"DETAIL: `{e.name}`",
                    "",
                    f"- Type: {'directory' if e.is_dir else 'file'}",
                    f"- Path: `{e.path}`",
                    f"- Age: {e.age_days} days",
                    f"- Size: {self._format_size(e.size)}",
                    f"- Last modified: {e.mtime.strftime('%Y-%m-%d %H:%M %Z')}",
                    f"- Safety level: {e.safety_level}",
                    f"- Eligible: {'YES' if e.eligible else 'NO'}",
                    f"- Reason: {e.delete_reason}",
                    "",
                ]
                if e.is_protected:
                    lines.append("This item is PROTECTED and cannot be deleted.")
                elif e.has_workboard_item:
                    lines.append(
                        f"Workboard item: `{e.workboard_item_id}` "
                        f"(status: {e.workboard_item_status})"
                    )
                if e.eligible:
                    lines.append(f"Would run: `rm {'-rf ' if e.is_dir else ''}{e.path}`")
                return chr(10).join(lines)

        return f"No workspace entry found matching `{name}`."

    def get_dry_run_commands(self) -> List[str]:
        """Return the exact shell commands that would execute for all GREEN items."""
        commands: List[str] = []
        for e in self.entries:
            if e.safety_level == "GREEN" and e.eligible:
                if e.is_dir:
                    commands.append(f"rm -rf {e.path}")
                else:
                    commands.append(f"rm {e.path}")
        return commands

    # --------------------------------------------------------------- Execution

    def execute_sweep(
        self, targets: Optional[List[str]] = None, keep: Optional[List[str]] = None
    ) -> str:
        """
        Execute live deletion of GREEN items.

        Args:
            targets: Specific names to delete (None = all GREEN)
            keep: Names to skip from the target list

        Returns:
            Report string of what was done
        """
        red_names = {e.name for e in self.entries if e.safety_level == "RED"}
        if targets and any(t in red_names for t in targets):
            bad = [t for t in targets if t in red_names]
            return (
                f"BLOCKED: Cannot delete RED items: {', '.join(bad)}.\n"
                "These have active workboard items. Review with `/janitor dump`."
            )

        candidates: List[WorkspaceEntry] = []
        for e in self.entries:
            if e.safety_level == "GREEN" and e.eligible:
                if e.is_protected:
                    continue
                if keep and e.name in keep:
                    continue
                if targets and e.name not in targets:
                    continue
                candidates.append(e)

        if not candidates:
            return "No items selected for deletion."

        results: List[str] = ["LIVE SWEEP EXECUTED", ""]

        for e in candidates:
            try:
                if e.is_dir:
                    subprocess.run(
                        ["rm", "-rf", str(e.path)],
                        check=True, capture_output=True, text=True
                    )
                else:
                    e.path.unlink()

                audit_entry = (
                    f"{datetime.now(tz=timezone.utc).isoformat()} | "
                    f"rm {'-rf ' if e.is_dir else ''}{e.name} | "
                    f"age={e.age_days}d | safety=GREEN\n"
                )
                with open(AUDIT_LOG, "a") as f:
                    f.write(audit_entry)

                results.append(f"Deleted: `{e.name}` ({self._format_size(e.size)}, {e.age_days}d)")
            except Exception as ex:
                results.append(f"Failed: `{e.name}` -- {ex}")

        results.append("")
        results.append(f"Total: {len(candidates)} items removed")
        return chr(10).join(results)

    # ------------------------------------------------------------------ Helpers

    def _format_size(self, size_bytes: int) -> str:
        """Format byte size to human-readable."""
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"

    # --------------------------------------------------------------- Command Parser

    @staticmethod
    def parse_command(message: str) -> Dict[str, Any]:
        """
        Parse a /janitor command from message text.

        Returns dict with:
          - action: "sweep" or "dump"
          - mode: "dry" or "live"
          - targets: list of names to target
          - keep: list of names to skip
          - raw: full command string
        """
        result: Dict[str, Any] = {
            "action": None,
            "mode": "dry",
            "targets": [],
            "keep": [],
            "raw": None,
        }

        match = re.match(
            r"^/janitor\s+(sweep|dump)\s*(.*)$",
            message, re.IGNORECASE | re.DOTALL
        )
        if not match:
            return result

        action = match.group(1).lower()
        args = match.group(2).strip()

        result["action"] = action
        result["raw"] = f"/janitor {action}"

        tokens = args.split()
        i = 0
        while i < len(tokens):
            token = tokens[i]
            if token.lower() == "--live":
                result["mode"] = "live"
                result["raw"] += " --live"
            elif token.lower() == "--target":
                i += 1
                if i < len(tokens):
                    target = tokens[i].strip("'\"")
                    result["targets"].append(target)
                    result["raw"] += f" --target {target}"
                i += 1
                if i < len(tokens):
                    keep_name = tokens[i].strip("'\"")
                    result["keep"].append(keep_name)
                    result["raw"] += f" --keep {keep_name}"
            elif token.lower() == "all":
                pass
            elif not token.startswith("--"):
                if action == "dump" and not result["targets"]:
                    result["targets"].append(token)
                elif result["mode"] == "live" and not result["targets"]:
                    result["targets"].append(token)
            i += 1

        return result


# ---------------------------------------------------------------------- CLI

def main() -> None:
    """CLI entry point for standalone testing."""
    if len(sys.argv) < 2:
        print("Usage: janitor.py <command>")
        print("Commands:")
        print("  sweep         -> Full sweep report (DRY RUN)")
        print("  sweep --live  -> Execute all GREEN deletions")
        print("  dump [name]   -> Show details")
        sys.exit(0)

    if "--help" in sys.argv or "-h" in sys.argv or "help" in sys.argv:
        print("Janitor - Workspace Cleanup Automation")
        print()
        print("Usage: janitor.py <command> [options]")
        print("Commands:")
        print("  sweep         -> Full sweep report (DRY RUN)")
        print("  sweep --live  -> Execute all GREEN deletions (LIVE)")
        print("  dump [name]   -> Show details")
        print()
        print("Options:")
        print("  --help, -h    Show this help message")
        sys.exit(0)

    cmd = sys.argv[1].lower()
    args = sys.argv[2:]

    j = Janitor()
    j.scan_workspace()

    if cmd == "sweep":
        is_live = "--live" in args

        if is_live:
            print("LIVE MODE -- this will DELETE files permanently.")
            targets = [a for a in args if not a.startswith("--")]
            if targets:
                confirm = input(f"Delete {len(targets)} item(s)? [yes/no]: ")
                if confirm.lower() != "yes":
                    print("Cancelled.")
                    return
            print(j.execute_sweep(targets=targets if targets else None))
        else:
            print(j.get_report())

    elif cmd == "dump":
        name = " ".join(args) if args else None
        if name:
            print(j.get_dump_details(name))
        else:
            print(j.get_report())

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
