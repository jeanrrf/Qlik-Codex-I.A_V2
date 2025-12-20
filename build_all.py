
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
SERVER_DIR = ROOT_DIR / "server"
WEB_DIR = ROOT_DIR / "web"
WINDOWS = platform.system() == "Windows"


def print_step(step: str) -> None:
    print(f"\n{'=' * 50}")
    print(f"[BUILD] {step}")
    print(f"{'=' * 50}\n")


def bool_from_env(var_name: str, default: bool = False) -> bool:
    raw = os.getenv(var_name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def run_command(command, cwd: Path | None = None) -> None:
    """Run a shell command and exit on failure."""
    cmd_display = command if isinstance(command, str) else " ".join(command)
    print(f"[CMD] {cmd_display} (cwd={cwd or ROOT_DIR})")
    try:
        subprocess.run(
            command,
            cwd=cwd,
            shell=isinstance(command, str) or WINDOWS,
            check=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] Command failed with exit {exc.returncode}: {cmd_display}")
        sys.exit(exc.returncode)
    except Exception as exc:  # noqa: BLE001
        print(f"[ERROR] Unexpected error running {cmd_display}: {exc}")
        sys.exit(1)


def clean_dist() -> None:
    print_step("1/5 Cleaning previous builds")
    for path in (WEB_DIR / "dist", SERVER_DIR / "dist"):
        if path.exists():
            print(f"[CLEAN] Removing {path}")
            try:
                shutil.rmtree(path)
                print(f"[OK] Removed {path}")
            except Exception as exc:  # noqa: BLE001
                print(f"[WARN] Could not remove {path}: {exc}")
        else:
            print(f"[OK] {path} already clean")


def build_server(skip_install: bool) -> None:
    print_step("2/5 Building server")
    if not SERVER_DIR.exists():
        print("[ERROR] server/ directory not found. Run from repo root.")
        sys.exit(1)

    if not skip_install and (SERVER_DIR / "package.json").exists():
        run_command("npm install", cwd=SERVER_DIR)
    run_command("npm run build", cwd=SERVER_DIR)


def build_web(skip_install: bool) -> None:
    print_step("3/5 Building web (frontend)")
    if not WEB_DIR.exists():
        print("[ERROR] web/ directory not found. Run from repo root.")
        sys.exit(1)

    if not skip_install and (WEB_DIR / "package.json").exists():
        run_command("npm install", cwd=WEB_DIR)
    run_command("npm run build", cwd=WEB_DIR)


def get_current_branch() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except Exception:  # noqa: BLE001
        return "main"


def deploy_sequence(
    auto: bool = False,
    skip_web: bool = False,
    skip_vercel: bool = False,
    commit_msg: str = "chore: production build (auto)",
    allow_empty_commit: bool = False,
) -> None:
    """Prepare, commit, push and optionally trigger Vercel deploy."""

    print_step("5/5 Deploy & ship")

    if not auto:
        print("Deseja realizar commit + push para producao? (y/n)")
        choice = input("> ").strip().lower()
        if choice != "y":
            print("[INFO] Deploy skipped by user.")
            return
    else:
        print("[AUTO] Deploy automatico habilitado")

    branch = get_current_branch()
    print(f"\n[GIT] Branch detectada: {branch}")

    msg = commit_msg
    if not auto:
        print(f"Digite a mensagem do commit (Enter para '{msg}'):")
        input_msg = input("> ").strip()
        if input_msg:
            msg = input_msg

    print("\n[GIT] Adicionando arquivos...")
    run_command("git add .")

    staged = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True,
        text=True,
    )
    staged_files = staged.stdout.strip()

    if not staged_files:
        if allow_empty_commit:
            print("[GIT] Nenhuma alteracao staged -- criando commit vazio.")
            run_command(f'git commit --allow-empty -m "{msg}"')
        else:
            print("[GIT] Nenhuma alteracao staged -- pulando commit.")
    else:
        print(f"[GIT] Commitando: '{msg}'...")
        subprocess.run(["git", "commit", "-m", msg], check=False)

    print(f"[GIT] Pull origin/{branch}")
    pull_proc = subprocess.run(
        ["git", "pull", "origin", branch], capture_output=True, text=True
    )
    if pull_proc.returncode != 0:
        print(
            f"[WARN] Git pull falhou (exit {pull_proc.returncode}). "
            f"Continuando...\n{pull_proc.stdout}\n{pull_proc.stderr}"
        )

    print(f"[GIT] Push origin/{branch}")
    push_proc = subprocess.run(
        ["git", "push", "origin", branch], capture_output=True, text=True
    )
    if push_proc.returncode != 0:
        print(
            f"[WARN] Git push falhou (exit {push_proc.returncode}).\n"
            f"{push_proc.stdout}\n{push_proc.stderr}"
        )
    else:
        print(push_proc.stdout)

    print("\n[INFO] Push para Git deve disparar deploy automatico no Render.")

    run_vercel = auto and not skip_vercel
    if not auto and not skip_vercel:
        print("\nDeseja forcar deploy na Vercel via CLI? (y/n)")
        vercel_choice = input("> ").strip().lower()
        run_vercel = vercel_choice == "y"

    if run_vercel:
        print("[VERCEL] Iniciando deploy de producao...")
        try:
            run_command("vercel --prod")
        except Exception:  # noqa: BLE001
            print("[WARN] Falha ao rodar 'vercel --prod'. Verifique a CLI.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build and deploy Qlik Codex I.A root packages"
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Modo nao-interativo (nao pede confirmacao de deploy)",
    )
    parser.add_argument(
        "--skip-web",
        action="store_true",
        help="Nao builda o frontend (ex.: hospedado na Vercel)",
    )
    parser.add_argument(
        "--skip-vercel",
        action="store_true",
        help="Pula deploy Vercel mesmo em modo auto",
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Nao executa npm install antes do build",
    )
    parser.add_argument(
        "--build-only",
        action="store_true",
        help="Apenas builda server/web (pula passos de git/deploy)",
    )
    parser.add_argument(
        "--commit-msg",
        type=str,
        default=None,
        help="Mensagem de commit para modo auto ou padrao",
    )
    parser.add_argument(
        "--allow-empty-commit",
        action="store_true",
        help="Cria commit vazio se nao houver staged (forca CI)",
    )
    args = parser.parse_args()

    print("Iniciando build completo do Qlik Codex I.A (Python script)...")

    if not SERVER_DIR.exists() or not WEB_DIR.exists():
        print("[ERROR] Rode este script na raiz do repositorio.")
        sys.exit(1)

    skip_install = args.skip_install or bool_from_env("SKIP_INSTALL")

    try:
        clean_dist()
        build_server(skip_install=skip_install)

        skip_web_flag = args.skip_web or bool_from_env("SKIP_WEB_BUILD")
        serve_static_frontend = bool_from_env("SERVE_STATIC_FRONTEND", default=True)
        should_skip_web = skip_web_flag or not serve_static_frontend

        if should_skip_web:
            print_step("3/5 Skipping web build (config)")
            print(
                "[INFO] Frontend build pulado. "
                "Certifique-se de que ele sera publicado separadamente."
            )
        else:
            build_web(skip_install=skip_install)

        print_step("4/5 Finalizando build")
        print("[OK] Build local concluido")

        skip_vercel_flag = (
            args.skip_vercel or should_skip_web or bool_from_env("SKIP_VERCEL")
        )
        commit_msg = args.commit_msg or os.getenv(
            "COMMIT_MSG", "chore: production build (auto)"
        )
        allow_empty = args.allow_empty_commit or bool_from_env("ALLOW_EMPTY_COMMIT")

        if args.build_only:
            print("[INFO] build-only habilitado: pulando etapa de deploy.")
        else:
            deploy_sequence(
                auto=args.auto,
                skip_web=should_skip_web,
                skip_vercel=skip_vercel_flag,
                commit_msg=commit_msg,
                allow_empty_commit=allow_empty,
            )

        print("\n[FIM] Processo concluido.")
        print("Para rodar localmente: cd server && npm start")

    except KeyboardInterrupt:
        print("\n[ABORTED] Operacao cancelada pelo usuario.")
        sys.exit(1)


if __name__ == "__main__":
    main()
