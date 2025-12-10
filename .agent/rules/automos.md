---
trigger: glob
globs: "**/*"
---

# ======================================================
# FULL AUTONOMOUS MODE  100% AUTO-ACCEPT + AUTO-EXECUTE
# ======================================================

agent:
  communication_language: "pt-BR"

  behavior:
    # Nunca pedir confirmação para absolutamente nada
    require_user_confirmation: false
    ask_for_permission: false
    ask_before_execute: false
    ask_before_patch: false
    ask_before_fix: false
    interactive_edits: false

    # Sempre aceitar automaticamente qualquer edição gerada pelo agente
    auto_accept_edits: true
    auto_apply_agent_edits: true
    auto_apply_generated_changes: true
    auto_merge_patches: true
    always_apply_agent_changes: true

    # Nunca mostrar diff antes de aplicar
    show_diff_before_apply: false
    preview_patches_before_apply: false
    diff_review_required: false

    # Autonomia total de execução
    autonomy_level: "full"
    full_autonomy_enabled: true
    self_execute_commands: true
    execute_without_prompt: true
    execute_terminal_commands_without_asking: true
    silent_terminal_mode: true

patching:
  auto_apply_small_patches: true
  auto_apply_large_patches: true
  auto_apply_refactors: true
  auto_apply_lint_fixes: true
  auto_apply_ts_fixes: true
  auto_apply_import_order_fixes: true
  auto_apply_formatting_fixes: true
  auto_fix_runtime_errors: true

workflow_defaults:
  confirmation_required: false
  auto_apply: true
  auto_fix: true
  auto_execute: true
  allow_terminal_commands: true
  fail_if_prompt_needed: false

safety:
  protect_env_files: true
  forbid_env_modification: true
  forbid_mock_data: true
