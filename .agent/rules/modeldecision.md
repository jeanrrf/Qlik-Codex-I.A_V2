---
trigger: glob
description: MODEL DECISION — TASK CHOICE FOR MISSION
globs: **/*
---

# ================================
# MODEL DECISION — TASK CHOICE FOR MISSION
# ================================
# Automatically select the best AI model based on the workflow type,
# task complexity, context triggers, UI/UX needs, or debugging depth.
# All communication with the user must be in Brazilian Portuguese.

decide_model:
  rules:

    # ---------------------------
    # ULTRA PRO+ (112-step systems)
    # Deep reasoning, architecture, multi-phase optimization
    # ---------------------------
    - when:
        workflow: ["ultra_pro", "112_steps", "deep_optimization", "full_scan"]
      use_model: "Gemini 3 Pro (High)"
      otherwise: "Claude Sonnet 4.5 (Thinking)"

    # ---------------------------
    # Server Auto-Fix & Runtime Healing
    # ---------------------------
    - when:
        workflow: ["server_auto_fix", "runtime_repair", "dependency_fix"]
        event: ["on_server_error", "on_unexpected_exit", "on_log_pattern"]
      use_model: "Gemini 3 Pro (High)"

    # ---------------------------
    # UI/UX Design, Visual Refactor, Full Redesign
    # ---------------------------
    - when:
        workflow: ["uiux_expert", "designer_refactor", "screen_redesign"]
      use_model: "Claude Opus 4.5 (Thinking)"

    # ---------------------------
    # Massive Refactors / Large Code Transformations
    # ---------------------------
    - when:
        workflow: ["refactor", "deep_refactor", "architecture_rewrite"]
      use_model: "Gemini 3 Pro (High)"

    # ---------------------------
    # Documentation, Explanation, Summaries, Clarity
    # ---------------------------
    - when:
        workflow: ["documentation", "explanation", "summary", "report"]
      use_model: "Claude Sonnet 4.5"

    # ---------------------------
    # Diagram Generation & Tree Visualizations
    # ---------------------------
    - when:
        workflow: ["diagram", "tree_visualization", "architecture_map"]
      use_model: "Claude Sonnet 4.5 (Thinking)"

    # ---------------------------
    # Large Monorepos / Large-Scale Architecture
    # ---------------------------
    - when:
        workflow: ["large_project", "monorepo_analysis", "system_design"]
      use_model: "Claude Opus 4.5 (Thinking)"

    # ---------------------------
    # Fast Execution / Lightweight Tasks
    # ---------------------------
    - when:
        workflow: ["quick_task", "fast_operation", "utility_run"]
      use_model: "Gemini 3 Pro (Low)"

    # ---------------------------
    # Creative Exploration (optional fallback)
    # ---------------------------
    - when:
        workflow: ["creative", "experimental", "sandbox"]
      use_model: "GPT-OSS 120B (Medium)"

    # ---------------------------
    # Fallback (safety)
    # ---------------------------
    - default: "Gemini 3 Pro (High)"