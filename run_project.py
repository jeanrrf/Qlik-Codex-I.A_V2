import argparse
import os
import platform
import subprocess
import sys
import time
from pathlib import Path


WINDOWS = platform.system() == "Windows"


def run_command(
    command: str,
    cwd: str | Path | None = None,
    *,
    shell: bool = True,
    ignore_error: bool = False,
) -> None:
    """Runs a command in the current terminal and waits for it to finish."""
    print(f"[CMD] {command} (cwd={cwd or '.'})")
    try:
        subprocess.check_call(command, cwd=cwd, shell=shell)
        print(f"[OK] {command}")
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] {command} failed: {exc}")
        if not ignore_error:
            sys.exit(1)


def open_new_terminal(command: str, title: str = "Terminal", cwd: str | Path | None = None, inline: bool = False) -> None:
    """Opens a new terminal window (or inline process) and runs the command."""
    if inline or not WINDOWS:
        print(f"[INFO] Running inline: {title}")
        subprocess.Popen(command, cwd=cwd, shell=True)
        return

    print(f"[INFO] Opening new terminal for: {title}")
    cmd_str: str = f'start powershell -NoExit -Command "cd \'{cwd}\'; {command}"'
    subprocess.Popen(cmd_str, shell=True)


def kill_ports() -> None:
    """Kills processes running on ports 3000 and 5173."""
    print("\n[STEP] Freeing ports 3000 and 5173")
    run_command("npx kill-port 3000 5173", shell=True, ignore_error=True)


def install_dependencies(root_dir: Path, server_dir: Path, web_dir: Path) -> None:
    print("\n[STEP] Installing dependencies")
    if (root_dir / "package.json").exists():
        run_command("npm install", cwd=root_dir)
    if (server_dir / "package.json").exists():
        run_command("npm install", cwd=server_dir)
    if (web_dir / "package.json").exists():
        run_command("npm install", cwd=web_dir)


def build_project(server_dir: Path, web_dir: Path) -> None:
    print("\n[STEP] Building project")
    if (server_dir / "package.json").exists():
        run_command("npm run build", cwd=server_dir)
    if (web_dir / "package.json").exists():
        run_command("npm run build", cwd=web_dir)


def start_servers(server_dir: Path, web_dir: Path, inline: bool, wait_seconds: int) -> None:
    print("\n[STEP] Starting development servers")
    open_new_terminal("npm run dev", title="Backend Server", cwd=server_dir, inline=inline)
    time.sleep(wait_seconds)
    open_new_terminal("npm run dev", title="Frontend Web", cwd=web_dir, inline=inline)
    print("\n[OK] Dev servers started")
    print("   - Backend: http://localhost:3000")
    print("   - Frontend: http://localhost:5173")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Orchestrate root dev workflows (server + web)")
    parser.add_argument(
        "--mode",
        choices=["full", "reload", "quick", "kill"],
        help="Run non-interactive mode (default reload)",
    )
    parser.add_argument(
        "--inline",
        action="store_true",
        help="Run dev servers inline (no new Windows terminals)",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip build step for full/reload flows",
    )
    parser.add_argument(
        "--wait",
        type=int,
        default=2,
        help="Seconds to wait before starting the frontend dev server",
    )
    return parser.parse_args()


def resolve_mode(args: argparse.Namespace) -> str:
    default_mode = "reload"
    if args.mode:
        return args.mode

    print("[MENU] Qlik Codex I.A Automation")
    print("--------------------------------------")
    print("1. Full Setup (Install + Build + Start)")
    print("2. Reload All (Kill Ports + Build + Start) [default]")
    print("3. Quick Start (Kill Ports + Start)")
    print("4. Kill Ports Only")
    print("--------------------------------------")

    choice = input("Select an option (1-4) [Default: 2]: ").strip() or "2"
    mapping = {
        "1": "full",
        "2": "reload",
        "3": "quick",
        "4": "kill",
    }
    resolved = mapping.get(choice, choice.lower())
    if resolved not in mapping.values():
        print("[ERROR] Invalid option.")
        sys.exit(1)
    return resolved or default_mode


def main() -> None:
    args = parse_args()

    root_dir = Path.cwd()
    server_dir = root_dir / "server"
    web_dir = root_dir / "web"

    mode = resolve_mode(args)

    if mode == "full":
        kill_ports()
        install_dependencies(root_dir, server_dir, web_dir)
        if not args.skip_build:
            build_project(server_dir, web_dir)
        start_servers(server_dir, web_dir, inline=args.inline, wait_seconds=args.wait)
    elif mode == "reload":
        kill_ports()
        if not args.skip_build:
            build_project(server_dir, web_dir)
        start_servers(server_dir, web_dir, inline=args.inline, wait_seconds=args.wait)
    elif mode == "quick":
        kill_ports()
        start_servers(server_dir, web_dir, inline=args.inline, wait_seconds=args.wait)
    elif mode == "kill":
        kill_ports()
        print("[OK] Ports killed.")


if __name__ == "__main__":
    main()
