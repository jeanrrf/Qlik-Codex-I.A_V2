import subprocess
import os
import sys
import time
import platform

def run_command(command, cwd=None, shell=True, ignore_error=False) -> None:
    """Runs a command in the current terminal and waits for it to finish."""
    print(f"🚀 Executing: {command} in {cwd or '.'}")
    try:
        subprocess.check_call(command, cwd=cwd, shell=shell)
        print(f"✅ Success: {command}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error executing {command}: {e}")
        if not ignore_error:
            sys.exit(1)

def open_new_terminal(command, title="Terminal", cwd=None) -> None:
    """Opens a new terminal window and runs the command."""
    print(f"🖥️  Opening new terminal for: {title}")
    
    if platform.system() == "Windows":
        cmd_str: str = f'start powershell -NoExit -Command "cd \'{cwd}\'; {command}"'
        subprocess.Popen(cmd_str, shell=True)
    else:
        print(f"⚠️  Auto-open terminal not fully supported on {platform.system()}.")
        print(f"Please run manually: cd {cwd} && {command}")

def kill_ports() -> None:
    """Kills processes running on ports 3000 and 5173."""
    print("\n💀 Killing existing processes on ports 3000 and 5173...")
    # Using npx kill-port which is available in the project
    run_command("npx kill-port 3000 5173", shell=True, ignore_error=True)

def install_dependencies(root_dir, server_dir, web_dir) -> None:
    print("\n📦 Installing Dependencies...")
    if os.path.exists(os.path.join(root_dir, "package.json")):
        run_command("npm install", cwd=root_dir)
    if os.path.exists(os.path.join(server_dir, "package.json")):
        run_command("npm install", cwd=server_dir)
    if os.path.exists(os.path.join(web_dir, "package.json")):
        run_command("npm install", cwd=web_dir)

def build_project(server_dir, web_dir) -> None:
    print("\n🔨 Building Project...")
    if os.path.exists(os.path.join(server_dir, "package.json")):
        run_command("npm run build", cwd=server_dir)
    if os.path.exists(os.path.join(web_dir, "package.json")):
        run_command("npm run build", cwd=web_dir)

def start_servers(server_dir, web_dir) -> None:
    print("\n🚀 Starting Development Servers...")
    open_new_terminal("npm run dev", title="Backend Server", cwd=server_dir)
    time.sleep(2)
    open_new_terminal("npm run dev", title="Frontend Web", cwd=web_dir)
    print("\n✅ All systems go! Check the new terminal windows.")
    print("   - Backend: http://localhost:3000")
    print("   - Frontend: http://localhost:5173")

def main() -> None:
    root_dir: str = os.getcwd()
    server_dir: str = os.path.join(root_dir, "server")
    web_dir: str = os.path.join(root_dir, "web")

    print("🔥 Qlik Codex I.A Automation Script 🔥")
    print("--------------------------------------")
    print("1. Full Setup (Install + Build + Start)")
    print("2. Reload All (Kill Ports + Build + Start)")
    print("3. Quick Start (Kill Ports + Start)")
    print("4. Kill Ports Only")
    print("--------------------------------------")
    
    choice: str = input("Select an option (1-4) [Default: 2]: ").strip()
    if not choice:
        choice = "2"

    if choice == "1":
        kill_ports()
        install_dependencies(root_dir, server_dir, web_dir)
        build_project(server_dir, web_dir)
        start_servers(server_dir, web_dir)
    elif choice == "2":
        kill_ports()
        build_project(server_dir, web_dir)
        start_servers(server_dir, web_dir)
    elif choice == "3":
        kill_ports()
        start_servers(server_dir, web_dir)
    elif choice == "4":
        kill_ports()
        print("✅ Ports killed.")
    else:
        print("❌ Invalid option.")

if __name__ == "__main__":
    main()

