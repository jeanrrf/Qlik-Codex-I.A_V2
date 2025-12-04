"""
Automated helper to update backend and frontend in one go:
- git pull --rebase
- npm install + build for server/ and web/
- git add/commit/push

Usage:
  python tools/auto_ship.py --commit "chore: deploy"

Safeguards:
- Aborts on first failing command
- Skips commit/push if nothing changed
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"\n$ {' '.join(cmd)} (cwd={cwd or Path.cwd()})")
    result = subprocess.run(cmd, cwd=cwd, text=True)
    if result.returncode != 0:
        sys.exit(result.returncode)


def has_changes(root: Path) -> bool:
    res = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=root,
        text=True,
        capture_output=True,
    )
    return bool(res.stdout.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description="Auto install/build/commit/push for server and web")
    parser.add_argument("--commit", "--message", dest="message", default="chore: auto ship", help="Commit message")
    parser.add_argument("--no-pull", action="store_true", help="Skip git pull --rebase")
    parser.add_argument("--no-push", action="store_true", help="Skip git push")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    server_dir = repo_root / "server"
    web_dir = repo_root / "web"

    if not args.no_pull:
        run(["git", "pull", "--rebase"], cwd=repo_root)

    for project in (server_dir, web_dir):
        run(["npm", "install"], cwd=project)
        run(["npm", "run", "build"], cwd=project)

    # Stage everything (keep it simple)
    run(["git", "add", "."], cwd=repo_root)

    if not has_changes(repo_root):
        print("No changes to commit.")
        return

    run(["git", "commit", "-m", args.message], cwd=repo_root)

    if not args.no_push:
        run(["git", "push"], cwd=repo_root)
    else:
        print("Push skipped (--no-push).")


if __name__ == "__main__":
    main()
