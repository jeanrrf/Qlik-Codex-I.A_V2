#!/usr/bin/env python3
import curses
import os
import re
import subprocess
from pathlib import Path

# Config path settings
LOCAL_CONFIG = Path("config.toml").resolve()
GLOBAL_CONFIG = Path.home() / ".codex" / "config.toml"


def get_config_path():
    """Retorna o caminho do config.toml (local preferido, senão global)."""
    if LOCAL_CONFIG.exists():
        return LOCAL_CONFIG
    return GLOBAL_CONFIG


def load_profiles():
    """Lê o config.toml e retorna uma lista de perfis disponíveis."""
    profiles = []
    config_path = get_config_path()

    if not config_path.exists():
        # Fallback silencioso ou warning
        return []

    # Regex to match [profiles.name]
    pattern = re.compile(r'^\[profiles\.(.+?)\]')

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                match = pattern.match(stripped)
                if match:
                    profiles.append(match.group(1))
    except Exception:
        pass
        
    return profiles


def set_default_profile(profile_name):
    """Atualiza o perfil padrão e SINCRONIZA com o config global."""
    config_path = get_config_path()

    # Se não existe sequer o local, não temos o que editar (deveria existir)
    if not config_path.exists():
        return

    # 1. Lê o arquivo atual
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        return

    # 2. Filtra linhas antigas de profile
    profile_pattern = re.compile(r'^profile\s*=\s*".*"')
    new_lines = [line for line in lines if not profile_pattern.match(line.strip())]
    
    # Insere no topo. 
    # Tenta pular comentários iniciais (shebang ou cabeçalho)
    insert_idx = 0
    while insert_idx < len(new_lines) and new_lines[insert_idx].strip().startswith("#"):
        insert_idx += 1
        
    # Insere a nova configuração
    # Forçamos uma quebra de linha extra para separar visualmente se necessário
    new_lines.insert(insert_idx, f'profile = "{profile_name}"\n')
    
    # 3. Grava no arquivo original (Local)
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception:
        pass
        
    # 4. Sincroniza Global (Cópia de segurança para garantir que Codex leia)
    try:
        GLOBAL_CONFIG.parent.mkdir(parents=True, exist_ok=True)
        with open(GLOBAL_CONFIG, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception:
        pass


def run_codex(profile):
    """Define o perfil como padrão e executa o Codex."""
    config_path = get_config_path()
    
    # 1. Persistência
    set_default_profile(profile)
    
    # 2. Execução
    # Força a variável de ambiente CODEX_CONFIG apra garantir leitura correta
    env = os.environ.copy()
    env["CODEX_CONFIG"] = str(config_path)

    try:
        # shell=True necessário no Windows para resolver o comando 'codex' se for um .cmd/.bat
        subprocess.run(f"codex --profile {profile}", shell=True, env=env)
    except Exception as e:
        print(f"Erro crítico ao executar codex: {e}")
        input("Pressione ENTER para sair...")


def draw_menu(stdscr, selected, profiles):
    stdscr.clear()
    h, w = stdscr.getmaxyx()
    
    title = "SELECIONE O MODELO PARA ATIVAÇÃO (Use ↑ ↓ e ENTER)"
    # Centraliza título
    start_x_title = max(0, (w - len(title)) // 2)
    stdscr.addstr(0, start_x_title, title, curses.A_BOLD | curses.A_UNDERLINE)

    # Margem superior
    start_y = 2
    
    # Paginação simples se houver muitos perfis (evita crash)
    # Mostra janela ao redor do selecionado
    max_display = h - 4 # Título + Rodapé
    offset = 0
    if len(profiles) > max_display:
        if selected < max_display // 2:
            offset = 0
        elif selected > len(profiles) - (max_display // 2):
            offset = len(profiles) - max_display
        else:
            offset = selected - (max_display // 2)

    end_idx = min(len(profiles), offset + max_display)
    
    for idx in range(offset, end_idx):
        item = profiles[idx]
        display_y = start_y + (idx - offset)
        
        display_text = f" {item} "
        if idx == selected:
            # Item selecionado com destaque
            stdscr.addstr(display_y, 4, f"> {display_text.ljust(40)} <", curses.A_REVERSE | curses.A_BOLD)
        else:
            stdscr.addstr(display_y, 6, display_text)

    # Rodapé com instrução
    footer = f"Perfil selecionado será salvo em: {get_config_path().name}"
    start_x_footer = max(0, (w - len(footer)) // 2)
    stdscr.addstr(h - 1, start_x_footer, footer, curses.A_DIM)

    stdscr.refresh()


def menu_loop(stdscr, profiles):
    # Proteção: Lista vazia
    if not profiles:
        stdscr.clear()
        stdscr.addstr(2, 2, "Erro: Nenhum perfil encontrado no config.toml!", curses.A_BOLD)
        stdscr.addstr(4, 2, "Verifique se o arquivo está no diretório correto.")
        stdscr.addstr(6, 2, "Pressione qualquer tecla para sair.")
        stdscr.refresh()
        stdscr.getch()
        return

    curses.curs_set(0)
    if curses.has_colors():
        curses.start_color()
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)

    selected = 0
    
    while True:
        draw_menu(stdscr, selected, profiles)
        key = stdscr.getch()

        if key == curses.KEY_UP:
            if selected > 0:
                selected -= 1
        elif key == curses.KEY_DOWN:
            if selected < len(profiles) - 1:
                selected += 1
        elif key in (curses.KEY_ENTER, 10, 13):
            # Validação final de índice
            if 0 <= selected < len(profiles):
                chosen = profiles[selected]
                stdscr.clear()
                
                msg = f"Ativando perfil: {chosen}..."
                h, w = stdscr.getmaxyx()
                stdscr.addstr(h//2, max(0, (w - len(msg))//2), msg, curses.A_BOLD)
                stdscr.refresh()
                curses.napms(500)
                curses.endwin()
                
                run_codex(chosen)
                break


if __name__ == "__main__":
    import argparse
    import sys
    
    # Argument parsing para modo não-interativo
    parser = argparse.ArgumentParser(description="Codex Model Menu")
    parser.add_argument("--list", action="store_true", help="List available profiles and exit")
    args = parser.parse_args()

    # Carrega perfis
    try:
        profiles = load_profiles()
    except Exception as e:
        print(f"Error loading profiles: {e}")
        sys.exit(1)

    if args.list:
        print("\nAvailable Codex Profiles:\n")
        if not profiles:
            print("  (Nenhum perfil encontrado)")
        for p in profiles:
            print(f"  - {p}")
        print("")
    else:
        try:
            curses.wrapper(menu_loop, profiles)
        except curses.error as e:
             print(f"Error initializing Curses UI: {e}")
             print("Listing profiles instead:")
             for p in profiles:
                print(f"  - {p}")
