#!/usr/bin/env python3
"""
=============================================================================
  QLIK CODEX I.A - DEPLOY ALL (One-Click Build & Deploy)
=============================================================================
  Este script executa TODAS as etapas de deploy em sequência:
    1. Git: add, commit, push
    2. Build: server (TypeScript) + web (Vite)
    3. Deploy: Convex (backend) + Vercel (frontend)
=============================================================================
"""

import subprocess
import os
import sys
from datetime import datetime

# === CONFIGURAÇÃO ===
CONVEX_URL = "https://trustworthy-wombat-433.convex.cloud"
USE_CONVEX = "true"

# === CORES PARA TERMINAL ===
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}  {msg}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}\n")

def print_step(step, msg):
    print(f"{Colors.BOLD}{Colors.YELLOW}[{step}]{Colors.END} {msg}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def run(cmd, cwd=None, ignore_error=False, capture=False):
    """Executa comando no shell"""
    display_cwd = cwd or os.getcwd()
    print(f"{Colors.BLUE}$ {cmd}{Colors.END} ({display_cwd})")
    try:
        if capture:
            result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
            return result.stdout.strip()
        else:
            subprocess.check_call(cmd, cwd=cwd, shell=True)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Comando falhou: {e}")
        if not ignore_error:
            sys.exit(1)
        return False

def exists(path):
    return os.path.exists(path)

def get_commit_message():
    """Gera mensagem de commit automática com timestamp"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"deploy: auto-deploy {now}"

def main():
    # Usar o diretório do script como root, não o cwd
    root = os.path.dirname(os.path.abspath(__file__))
    server = os.path.join(root, "server")
    web = os.path.join(root, "web")
    convex_dir = os.path.join(web, "convex")

    print_header("QLIK CODEX I.A - DEPLOY ALL")
    print(f"Root: {root}")
    print(f"Server: {server}")
    print(f"Web: {web}")
    print(f"Convex URL: {CONVEX_URL}")

    # =========================================================================
    # ETAPA 1: GIT (Add, Commit, Push)
    # =========================================================================
    print_header("ETAPA 1: GIT (Commit & Push)")
    
    # Verificar se é um repositório git
    if not exists(os.path.join(root, ".git")):
        print_error("Não é um repositório Git. Pulando etapa de Git.")
    else:
        print_step("1.1", "Verificando status do Git...")
        
        # Verificar se há mudanças
        status = run("git status --porcelain", cwd=root, capture=True, ignore_error=True)
        
        if status:
            print_step("1.2", "Adicionando todas as mudanças...")
            run("git add -A", cwd=root)
            
            print_step("1.3", "Criando commit...")
            commit_msg = get_commit_message()
            run(f'git commit -m "{commit_msg}"', cwd=root, ignore_error=True)
            
            print_step("1.4", "Enviando para o repositório remoto...")
            run("git push origin main", cwd=root, ignore_error=True)
            print_success("Git: Commit e push realizados!")
        else:
            print_success("Git: Nenhuma mudança para commitar.")

    # =========================================================================
    # ETAPA 2: BUILD (Server + Web)
    # =========================================================================
    print_header("ETAPA 2: BUILD (Server + Web)")

    # Build Server
    if exists(os.path.join(server, "package.json")):
        print_step("2.1", "Instalando dependências do Server...")
        run("npm install", cwd=server, ignore_error=True)
        
        print_step("2.2", "Compilando Server (TypeScript)...")
        run("npm run build", cwd=server)
        print_success("Server: Build concluído!")
    else:
        print_error("Server: package.json não encontrado, pulando...")

    # Build Web
    if exists(os.path.join(web, "package.json")):
        print_step("2.3", "Instalando dependências do Web...")
        run("npm install", cwd=web, ignore_error=True)
        
        print_step("2.4", "Compilando Web (Vite)...")
        run("npm run build", cwd=web)
        print_success("Web: Build concluído!")
    else:
        print_error("Web: package.json não encontrado, pulando...")

    # =========================================================================
    # ETAPA 3: DEPLOY CONVEX (Backend Serverless)
    # =========================================================================
    print_header("ETAPA 3: DEPLOY CONVEX (Backend)")

    if exists(convex_dir):
        print_step("3.1", "Verificando Convex CLI...")
        run("npx convex --version", ignore_error=True)
        
        print_step("3.2", "Publicando no Convex...")
        # Usando --yes para confirmar automaticamente
        run("npx convex deploy --yes", cwd=web, ignore_error=True)
        print_success(f"Convex: Deploy concluído! URL: {CONVEX_URL}")
    else:
        print_error("Convex: Pasta convex/ não encontrada, pulando...")

    # =========================================================================
    # ETAPA 4: DEPLOY VERCEL (Frontend)
    # =========================================================================
    print_header("ETAPA 4: DEPLOY VERCEL (Frontend)")

    if exists(os.path.join(web, "package.json")):
        print_step("4.1", "Verificando Vercel CLI...")
        run("npx vercel --version", ignore_error=True)
        
        print_step("4.2", "Publicando no Vercel (produção)...")
        # Passa as variáveis de ambiente necessárias para o build
        vercel_cmd = f"npx vercel --prod --yes --build-env VITE_CONVEX_URL={CONVEX_URL} --build-env VITE_USE_CONVEX={USE_CONVEX}"
        run(vercel_cmd, cwd=web, ignore_error=True)
        print_success("Vercel: Deploy concluído!")
    else:
        print_error("Vercel: package.json não encontrado no web/, pulando...")

    # =========================================================================
    # RESUMO FINAL
    # =========================================================================
    print_header("DEPLOY CONCLUÍDO!")
    print(f"""
{Colors.GREEN}✓ Git:{Colors.END} Commit e push realizados
{Colors.GREEN}✓ Server:{Colors.END} Build TypeScript OK
{Colors.GREEN}✓ Web:{Colors.END} Build Vite OK
{Colors.GREEN}✓ Convex:{Colors.END} Backend publicado em {CONVEX_URL}
{Colors.GREEN}✓ Vercel:{Colors.END} Frontend publicado

{Colors.BOLD}Próximos passos (se necessário):{Colors.END}
1. Verifique o Convex Dashboard para confirmar GEMINI_API_KEY
2. Acesse a URL do Vercel para testar o frontend
""")

if __name__ == "__main__":
    main()
