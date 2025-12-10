#!/usr/bin/env python3
import os
import subprocess
import sys
import re
from pathlib import Path

CONFIG_PATH = Path.home() / ".codex" / "config.toml"


def load_profiles():
    """Lê o config.toml e retorna uma lista de perfis disponíveis."""
    if not CONFIG_PATH.exists():
        print(f"Erro: arquivo não encontrado: {CONFIG_PATH}")
        sys.exit(1)

    profiles = []
    pattern = re.compile(r'^\[profiles\.(.*?)\]')

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            match = pattern.match(line.strip())
            if match:
                profiles.append(match.group(1))

    return profiles


def list_profiles():
    """Lista os perfis."""
    profiles = load_profiles()
    print("\nPerfis disponíveis:\n")
    for p in profiles:
        print(f"  - {p}")
    print("\nUse: python codex_runner.py run <perfil>\n")


def run_profile(profile_name: str):
    """Executa o Codex com o perfil selecionado."""
    profiles = load_profiles()

    if profile_name not in profiles:
        print(f"Erro: perfil '{profile_name}' não existe.\n")
        print("Perfis disponíveis:")
        for p in profiles:
            print(f"  - {p}")
        sys.exit(1)

    print(f"\nExecutando Codex com o perfil: {profile_name}\n")
    subprocess.run(["codex", "--profile", profile_name])


def main():
    if len(sys.argv) == 1:
        print("Uso:")
        print("  python codex_runner.py list")
        print("  python codex_runner.py run <perfil>")
        sys.exit(0)

    command = sys.argv[1]

    if command == "list":
        list_profiles()
    elif command == "run":
        if len(sys.argv) < 3:
            print("Erro: especifique um perfil.")
            print("Uso: python codex_runner.py run <perfil>")
            sys.exit(1)

        run_profile(sys.argv[2])
    else:
        print("Comando inválido.")
        print("Use:")
        print("  python codex_runner.py list")
        print("  python codex_runner.py run <perfil>")


if __name__ == "__main__":
    main()
