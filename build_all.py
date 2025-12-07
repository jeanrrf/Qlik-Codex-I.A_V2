
import os
import shutil
import subprocess
import sys
import platform

def print_step(step):
    print(f"\n{'='*50}")
    print(f"[BUILD] {step}")
    print(f"{'='*50}\n")

def run_command(command, cwd=None, shell=True):
    """Runs a shell command and checks for errors."""
    print(f"Running: {command} in {cwd or os.getcwd()}")
    try:
        # On Windows, shell=True is often needed for npm commands to be found
        result = subprocess.run(
            command, 
            cwd=cwd, 
            shell=shell, 
            check=True,
            text=True
        )
        return result.returncode
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Command failed: {command}")
        print(f"Exit code: {e.returncode}")
        sys.exit(e.returncode)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error running {command}: {e}")
        sys.exit(1)

def clean_dist():
    print_step("1/4 Limpando builds anteriores...")
    
    paths_to_clean = [
        os.path.join("web", "dist"),
        os.path.join("server", "dist")
    ]
    
    for path in paths_to_clean:
        if os.path.exists(path):
            print(f"Removing {path}...")
            try:
                shutil.rmtree(path)
                print(f"✓ Removed {path}")
            except Exception as e:
                print(f"Warning: Could not remove {path}: {e}")
        else:
            print(f"✓ {path} already clean")

def build_server():
    print_step("2/4 Buildando SERVER...")
    server_dir = os.path.join(os.getcwd(), "server")
    
    # Install dependencies
    run_command("npm install", cwd=server_dir)
    
    # Build
    run_command("npm run build", cwd=server_dir)

def build_web():
    print_step("3/4 Buildando WEB (Frontend)...")
    web_dir = os.path.join(os.getcwd(), "web")
    
    # Install dependencies
    run_command("npm install", cwd=web_dir)

    # Build
    run_command("npm run build", cwd=web_dir)

def get_current_branch():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except:
        return "main"

import argparse

def deploy_sequence(auto=False, skip_web=False, skip_vercel=False, commit_msg: str = "chore: production build (auto)", allow_empty_commit=False):
    """Prepare, commit, push and optionally trigger vercel deploy.

    Parameters:
      auto: when True, run non-interactive (answers 'yes' automatically)
      skip_web: passed from earlier decision (informational only)
      skip_vercel: skip the vercel step even when interactive/auto wants it
      commit_msg: commit message used in non-interactive flows
      allow_empty_commit: when True, create an empty commit if nothing changed
    """

    print_step("5/5 DEPLOY & SHIP")

    # Confirm deploy step if interactive
    if not auto:
        print("Deseja realizar o commit e push para producao? (y/n)")
        choice = input("> ").strip().lower()
        if choice != 'y':
            print("Skipping deploy.")
            return
    else:
        print("[AUTO] Iniciando deploy automatico...")

    # 1. Git Commit & Push
    branch = get_current_branch()
    print(f"\n[GIT] Branch atual detectada: {branch}")

    # resolve commit message (CLI/ENV populated message is passed in)
    msg = commit_msg
    if not auto:
        print("Digite a mensagem do commit (Enter para '{}'):".format(msg))
        input_msg = input("> ").strip()
        if input_msg:
            msg = input_msg

    print("\n[GIT] Adicionando arquivos...")
    run_command("git add .")

    # Check staged changes before committing
    staged = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True)
    staged_files = staged.stdout.strip()

    if not staged_files:
        if allow_empty_commit:
            print("[GIT] Nenhuma alteração staged — criando commit vazio por configuração.")
            run_command(f"git commit --allow-empty -m \"{msg}\"")
        else:
            print("[GIT] Nenhuma alteração staged — pulando commit.")
    else:
        print(f"[GIT] Commitando: '{msg}'...")
        # safe commit (do not use shell interpolation when possible)
        subprocess.run(["git", "commit", "-m", msg])

    print(f"[GIT] Pulling changes from origin/{branch}...")
    try:
        run_command(f"git pull origin {branch}")
    except Exception:
        print("[WARN] Git pull failed (maybe no upstream?). Continuing...")

    print(f"[GIT] Push para origin/{branch}...")
    run_command(f"git push origin {branch}")

    print("\n[INFO] O push para o Git deve disparar o deploy automatico no Render.")

    # 2. Vercel CLI
    # Vercel decision flow (ensure explicit opt-out available)
    run_vercel = auto and not skip_vercel
    if not auto and not skip_vercel:
        print("\nDeseja forcar deploy na Vercel via CLI? (y/n)")
        vercel_choice = input("> ").strip().lower()
        run_vercel = (vercel_choice == 'y')

    if run_vercel:
        print("[VERCEL] Iniciando deploy de producao...")
        try:
            # Try to use local vercel if available, else global
            run_command("vercel --prod")
        except Exception:
            print("[WARN] Falha ao rodar 'vercel --prod'. Verifique se a CLI esta instalada e logada.")

def main():
    parser = argparse.ArgumentParser(description="Build and Deploy Qlik Codex I.A")
    parser.add_argument("--auto", action="store_true", help="Run in non-interactive mode (auto deploy)")
    parser.add_argument("--skip-web", action="store_true", help="Skip building the frontend (useful when frontend is deployed separately, e.g. Vercel)")
    parser.add_argument("--skip-vercel", action="store_true", help="Skip triggering Vercel deploy (useful when frontend build is managed elsewhere)")
    parser.add_argument("--commit-msg", type=str, default=None, help="Custom commit message to use in non-interactive mode or default")
    parser.add_argument("--allow-empty-commit", action="store_true", help="Create an empty commit if there are no changes (useful for forcing CI)" )
    args = parser.parse_args()

    print("Iniciando build completo do Qlik Codex I.A (Python Script)...")
    
    # Ensure we are in the project root
    if not os.path.exists("server") or not os.path.exists("web"):
        print("[ERROR] Please run this script from the project root directory.")
        sys.exit(1)

    try:
        clean_dist()
        build_server()

        # Decide whether to build the frontend
        # Priority: CLI flag --skip-web > SKIP_WEB_BUILD env var > SERVE_STATIC_FRONTEND env (false -> skip)
        skip_web_flag = args.skip_web
        skip_web_env = os.getenv("SKIP_WEB_BUILD", "").lower() in ("1", "true", "yes")
        serve_static_frontend_env = os.getenv("SERVE_STATIC_FRONTEND", "true").lower() in ("1", "true", "yes")

        should_skip_web = skip_web_flag or skip_web_env or (not serve_static_frontend_env)

        if should_skip_web:
            print_step("3/4 Skipping WEB (frontend build) by configuration")
            print("[INFO] Frontend build skipped. Frontend should be hosted independently (eg. Vercel).")
        else:
            build_web()
        
        print_step("4/4 Finalizando Build...")
        print("[SUCESSO] Build local completo!")
        
        # Deploy Sequence
        # Evaluate skip_vercel from env or CLI
        # If frontend build is skipped there's no need to trigger Vercel deployment by default
        skip_vercel_flag = args.skip_vercel or should_skip_web or os.getenv("SKIP_VERCEL", "").lower() in ("1", "true", "yes")
        commit_msg = args.commit_msg or os.getenv("COMMIT_MSG", "chore: production build (auto)")
        allow_empty = args.allow_empty_commit or os.getenv("ALLOW_EMPTY_COMMIT", "").lower() in ("1", "true", "yes")

        deploy_sequence(auto=args.auto, skip_web=should_skip_web, skip_vercel=skip_vercel_flag, commit_msg=commit_msg, allow_empty_commit=allow_empty)
        
        print("\n[FIM] Processo concluido.")
        print("Para rodar localmente: cd server && npm start")
        
    except KeyboardInterrupt:
        print("\n[ABORTED] Operacao cancelada pelo usuario.")
        sys.exit(1)

if __name__ == "__main__":
    main()
