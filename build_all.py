
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

def deploy_sequence(auto=False):
    print_step("5/5 DEPLOY & SHIP")
    
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
    
    msg = "chore: production build (auto)"
    if not auto:
        print("Digite a mensagem do commit (Enter para 'chore: production build'):")
        input_msg = input("> ").strip()
        if input_msg:
            msg = input_msg
        
    print("\n[GIT] Adicionando arquivos...")
    run_command("git add .")
    
    print(f"[GIT] Commitando: '{msg}'...")
    # Allow empty commits just in case
    subprocess.run("git commit -m \"" + msg + "\"", shell=True)
    
    print(f"[GIT] Pulling changes from origin/{branch}...")
    try:
        run_command(f"git pull origin {branch}")
    except:
        print("[WARN] Git pull failed (maybe no upstream?). Continuing...")

    print(f"[GIT] Push para origin/{branch}...")
    run_command(f"git push origin {branch}")
    
    print("\n[INFO] O push para o Git deve disparar o deploy automatico no Render.")
    
    # 2. Vercel CLI
    run_vercel = auto
    if not auto:
        print("\nDeseja forcar deploy na Vercel via CLI? (y/n)")
        vercel_choice = input("> ").strip().lower()
        run_vercel = (vercel_choice == 'y')
    
    if run_vercel:
        print("[VERCEL] Iniciando deploy de producao...")
        try:
            # Try to use local vercel if available, else global
            run_command("vercel --prod")
        except:
            print("[WARN] Falha ao rodar 'vercel --prod'. Verifique se a CLI esta instalada e logada.")

def main():
    parser = argparse.ArgumentParser(description="Build and Deploy Qlik Codex I.A")
    parser.add_argument("--auto", action="store_true", help="Run in non-interactive mode (auto deploy)")
    args = parser.parse_args()

    print("Iniciando build completo do Qlik Codex I.A (Python Script)...")
    
    # Ensure we are in the project root
    if not os.path.exists("server") or not os.path.exists("web"):
        print("[ERROR] Please run this script from the project root directory.")
        sys.exit(1)

    try:
        clean_dist()
        build_server()
        build_web()
        
        print_step("4/4 Finalizando Build...")
        print("[SUCESSO] Build local completo!")
        
        # Deploy Sequence
        deploy_sequence(auto=args.auto)
        
        print("\n[FIM] Processo concluido.")
        print("Para rodar localmente: cd server && npm start")
        
    except KeyboardInterrupt:
        print("\n[ABORTED] Operacao cancelada pelo usuario.")
        sys.exit(1)

if __name__ == "__main__":
    main()
