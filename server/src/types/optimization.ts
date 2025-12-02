/**
 * Sistema de otimização com 112 etapas granulares
 * Cada etapa tem timeout e suporte a rotação de provedores
 */

export type OptimizationStepId =
  // PRÉ-VALIDAÇÃO (1-15)
  | "pre_001_parse_script_syntax"
  | "pre_002_extract_metadata"
  | "pre_003_identify_tables"
  | "pre_004_map_fields"
  | "pre_005_detect_sql_blocks"
  | "pre_006_analyze_joins"
  | "pre_007_check_where_clauses"
  | "pre_008_identify_variables"
  | "pre_009_map_set_statements"
  | "pre_010_detect_loops"
  | "pre_011_find_duplicates"
  | "pre_012_measure_complexity"
  | "pre_013_security_scan"
  | "pre_014_forbidden_commands_check"
  | "pre_015_baseline_metrics"

  // ANÁLISE ESTRUTURAL (16-35)
  | "struct_016_table_dependency_graph"
  | "struct_017_field_lineage_map"
  | "struct_018_join_optimization_candidates"
  | "struct_019_redundant_load_detection"
  | "struct_020_cartesian_product_check"
  | "struct_021_synthetic_key_analysis"
  | "struct_022_circular_reference_check"
  | "struct_023_concatenation_review"
  | "struct_024_resident_load_check"
  | "struct_025_noconcatenate_usage"
  | "struct_026_qualify_prefix_analysis"
  | "struct_027_mapping_load_review"
  | "struct_028_applymap_efficiency"
  | "struct_029_peek_function_usage"
  | "struct_030_previous_function_check"
  | "struct_031_exists_function_analysis"
  | "struct_032_interval_match_review"
  | "struct_033_hierarchy_function_check"
  | "struct_034_calendar_function_optimize"
  | "struct_035_aggregation_early_calc"

  // OTIMIZAÇÃO DE PERFORMANCE (36-65)
  | "perf_036_sql_pushdown_opportunities"
  | "perf_037_where_clause_optimization"
  | "perf_038_join_order_optimization"
  | "perf_039_reduce_field_count"
  | "perf_040_drop_unused_fields"
  | "perf_041_rename_consolidation"
  | "perf_042_qualify_reduction"
  | "perf_043_subfield_optimization"
  | "perf_044_text_function_reduce"
  | "perf_045_date_parsing_optimize"
  | "perf_046_number_format_simplify"
  | "perf_047_if_statement_flatten"
  | "perf_048_nested_if_optimize"
  | "perf_049_pick_match_review"
  | "perf_050_set_analysis_cache"
  | "perf_051_variable_calculation_cache"
  | "perf_052_loop_unrolling"
  | "perf_053_for_each_optimize"
  | "perf_054_temp_table_reduce"
  | "perf_055_resident_to_sql"
  | "perf_056_qvd_buffer_optimize"
  | "perf_057_store_qvd_placement"
  | "perf_058_incremental_load_setup"
  | "perf_059_binary_load_check"
  | "perf_060_partial_reload_config"
  | "perf_061_section_access_optimize"
  | "perf_062_reduce_section_access"
  | "perf_063_star_is_eliminate"
  | "perf_064_explicit_field_list"
  | "perf_065_load_inline_optimize"

  // QUALIDADE DE CÓDIGO (66-85)
  | "quality_066_naming_conventions"
  | "quality_067_indentation_fix"
  | "quality_068_comment_cleanup"
  | "quality_069_variable_naming"
  | "quality_070_table_naming"
  | "quality_071_field_naming"
  | "quality_072_remove_dead_code"
  | "quality_073_consolidate_duplicates"
  | "quality_074_standardize_date_format"
  | "quality_075_standardize_number_format"
  | "quality_076_consistent_quotes"
  | "quality_077_semicolon_consistency"
  | "quality_078_line_break_normalize"
  | "quality_079_whitespace_cleanup"
  | "quality_080_comment_style_standard"
  | "quality_081_section_organization"
  | "quality_082_dependency_ordering"
  | "quality_083_modular_structure"
  | "quality_084_error_handling_add"
  | "quality_085_trace_statement_add"

  // VALIDAÇÃO PÓS-OTIMIZAÇÃO (86-105)
  | "post_086_syntax_validation"
  | "post_087_semantic_validation"
  | "post_088_table_integrity_check"
  | "post_089_field_integrity_check"
  | "post_090_join_integrity_verify"
  | "post_091_where_logic_preserve"
  | "post_092_calculation_equivalence"
  | "post_093_data_type_preservation"
  | "post_094_null_handling_check"
  | "post_095_edge_case_validation"
  | "post_096_performance_regression_test"
  | "post_097_memory_usage_estimate"
  | "post_098_execution_time_estimate"
  | "post_099_security_revalidation"
  | "post_100_forbidden_commands_recheck"
  | "post_101_sql_injection_scan"
  | "post_102_variable_scope_check"
  | "post_103_circular_dependency_final"
  | "post_104_synthetic_key_final"
  | "post_105_breaking_change_analysis"

  // GERAÇÃO DE RESULTADOS (106-112)
  | "result_106_generate_diff"
  | "result_107_calculate_risk_score"
  | "result_108_generate_explanation"
  | "result_109_create_rollback_plan"
  | "result_110_generate_test_cases"
  | "result_111_create_documentation"
  | "result_112_final_summary";

export interface OptimizationStep {
  id: OptimizationStepId;
  name: string;
  description: string;
  category: "pre_validation" | "structural_analysis" | "performance" | "quality" | "post_validation" | "result_generation";
  estimatedDuration: number; // em ms
  timeout: number; // em ms
  critical: boolean; // se falhar, interrompe?
  retryable: boolean; // pode tentar com outro provider?
}

export interface SubStepExecution {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "running" | "success" | "error";
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

export interface StepExecutionResult {
  stepId: OptimizationStepId;
  status: "pending" | "running" | "success" | "timeout" | "error" | "skipped";
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  provider?: "google" | "nvidia";
  model?: string;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
  subSteps?: SubStepExecution[];
}

export interface ProviderAttempt {
  provider: "google" | "nvidia";
  model: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  duration: number;
}

export interface OptimizationProgress {
  requestId: string;
  totalSteps: number;
  currentStep: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  startTime: Date;
  lastUpdate: Date;
  estimatedTimeRemaining?: number;
  steps: StepExecutionResult[];
  providerAttempts: ProviderAttempt[];
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

export interface ProviderRotationConfig {
  maxAttemptsPerStep: number; // 4 tentativas antes do fallback
  providerOrder: Array<"google" | "nvidia">;
  neverRetryProvider: boolean; // nunca repetir o mesmo provider
  timeoutPerStep: number; // timeout padrão em ms
  globalTimeout: number; // timeout total do processo
}

export const OPTIMIZATION_STEPS: OptimizationStep[] = [
  // PRÉ-VALIDAÇÃO (1-15)
  { id: "pre_001_parse_script_syntax", name: "Parse de Sintaxe", description: "Analisa e valida a sintaxe básica do script", category: "pre_validation", estimatedDuration: 500, timeout: 3000, critical: true, retryable: true },
  { id: "pre_002_extract_metadata", name: "Extração de Metadados", description: "Extrai informações estruturais do script", category: "pre_validation", estimatedDuration: 800, timeout: 5000, critical: true, retryable: true },
  { id: "pre_003_identify_tables", name: "Identificação de Tabelas", description: "Mapeia todas as tabelas no script", category: "pre_validation", estimatedDuration: 600, timeout: 4000, critical: true, retryable: true },
  { id: "pre_004_map_fields", name: "Mapeamento de Campos", description: "Cria mapa de todos os campos e suas origens", category: "pre_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "pre_005_detect_sql_blocks", name: "Detecção de SQL", description: "Identifica blocos SQL nativos", category: "pre_validation", estimatedDuration: 400, timeout: 3000, critical: true, retryable: true },
  { id: "pre_006_analyze_joins", name: "Análise de Joins", description: "Examina todas as operações de join", category: "pre_validation", estimatedDuration: 900, timeout: 6000, critical: true, retryable: true },
  { id: "pre_007_check_where_clauses", name: "Verificação de Where", description: "Analisa cláusulas WHERE e filtros", category: "pre_validation", estimatedDuration: 500, timeout: 4000, critical: true, retryable: true },
  { id: "pre_008_identify_variables", name: "Identificação de Variáveis", description: "Mapeia todas as variáveis e seus usos", category: "pre_validation", estimatedDuration: 600, timeout: 4000, critical: false, retryable: true },
  { id: "pre_009_map_set_statements", name: "Mapeamento de SET", description: "Analisa statements SET e configurações", category: "pre_validation", estimatedDuration: 400, timeout: 3000, critical: false, retryable: true },
  { id: "pre_010_detect_loops", name: "Detecção de Loops", description: "Identifica estruturas de loop e iteração", category: "pre_validation", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "pre_011_find_duplicates", name: "Busca de Duplicatas", description: "Detecta código duplicado", category: "pre_validation", estimatedDuration: 800, timeout: 5000, critical: false, retryable: true },
  { id: "pre_012_measure_complexity", name: "Medição de Complexidade", description: "Calcula métricas de complexidade", category: "pre_validation", estimatedDuration: 600, timeout: 4000, critical: false, retryable: true },
  { id: "pre_013_security_scan", name: "Scan de Segurança", description: "Verifica vulnerabilidades básicas", category: "pre_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "pre_014_forbidden_commands_check", name: "Comandos Proibidos", description: "Verifica comandos SQL perigosos", category: "pre_validation", estimatedDuration: 400, timeout: 3000, critical: true, retryable: true },
  { id: "pre_015_baseline_metrics", name: "Métricas Base", description: "Estabelece baseline de performance", category: "pre_validation", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },

  // ANÁLISE ESTRUTURAL (16-35)
  { id: "struct_016_table_dependency_graph", name: "Grafo de Dependências", description: "Constrói grafo de dependências entre tabelas", category: "structural_analysis", estimatedDuration: 1000, timeout: 7000, critical: true, retryable: true },
  { id: "struct_017_field_lineage_map", name: "Lineage de Campos", description: "Mapeia origem e transformações de campos", category: "structural_analysis", estimatedDuration: 1200, timeout: 8000, critical: true, retryable: true },
  { id: "struct_018_join_optimization_candidates", name: "Candidatos para Join", description: "Identifica joins otimizáveis", category: "structural_analysis", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "struct_019_redundant_load_detection", name: "Loads Redundantes", description: "Detecta carregamentos desnecessários", category: "structural_analysis", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "struct_020_cartesian_product_check", name: "Produto Cartesiano", description: "Verifica junções sem chave", category: "structural_analysis", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "struct_021_synthetic_key_analysis", name: "Chaves Sintéticas", description: "Analisa chaves sintéticas geradas", category: "structural_analysis", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
  { id: "struct_022_circular_reference_check", name: "Referências Circulares", description: "Detecta dependências circulares", category: "structural_analysis", estimatedDuration: 600, timeout: 5000, critical: true, retryable: true },
  { id: "struct_023_concatenation_review", name: "Revisão de Concatenação", description: "Analisa uso de CONCATENATE", category: "structural_analysis", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "struct_024_resident_load_check", name: "Loads Resident", description: "Verifica uso de LOAD RESIDENT", category: "structural_analysis", estimatedDuration: 600, timeout: 4000, critical: false, retryable: true },
  { id: "struct_025_noconcatenate_usage", name: "NoConcatenate", description: "Analisa uso de NOCONCATENATE", category: "structural_analysis", estimatedDuration: 400, timeout: 3000, critical: false, retryable: true },
  { id: "struct_026_qualify_prefix_analysis", name: "Qualify/Prefix", description: "Examina uso de QUALIFY e prefixos", category: "structural_analysis", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "struct_027_mapping_load_review", name: "Mapping Loads", description: "Revisa tabelas de mapeamento", category: "structural_analysis", estimatedDuration: 600, timeout: 4000, critical: false, retryable: true },
  { id: "struct_028_applymap_efficiency", name: "Eficiência ApplyMap", description: "Analisa uso de ApplyMap", category: "structural_analysis", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "struct_029_peek_function_usage", name: "Função Peek", description: "Verifica uso de Peek()", category: "structural_analysis", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "struct_030_previous_function_check", name: "Função Previous", description: "Analisa uso de Previous()", category: "structural_analysis", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "struct_031_exists_function_analysis", name: "Função Exists", description: "Examina uso de Exists()", category: "structural_analysis", estimatedDuration: 600, timeout: 4000, critical: false, retryable: true },
  { id: "struct_032_interval_match_review", name: "IntervalMatch", description: "Revisa uso de IntervalMatch", category: "structural_analysis", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "struct_033_hierarchy_function_check", name: "Funções Hierarchy", description: "Analisa Hierarchy() e similares", category: "structural_analysis", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "struct_034_calendar_function_optimize", name: "Funções Calendar", description: "Otimiza funções de calendário", category: "structural_analysis", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "struct_035_aggregation_early_calc", name: "Agregações Antecipadas", description: "Identifica oportunidades de agregação prévia", category: "structural_analysis", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },

  // OTIMIZAÇÃO DE PERFORMANCE (36-65) - continua com padrão similar
  { id: "perf_036_sql_pushdown_opportunities", name: "SQL Pushdown", description: "Identifica cálculos para mover ao SQL", category: "performance", estimatedDuration: 1000, timeout: 7000, critical: false, retryable: true },
  { id: "perf_037_where_clause_optimization", name: "Otimização Where", description: "Otimiza cláusulas WHERE", category: "performance", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "perf_038_join_order_optimization", name: "Ordem de Joins", description: "Otimiza ordem de execução de joins", category: "performance", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "perf_039_reduce_field_count", name: "Redução de Campos", description: "Remove campos desnecessários", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_040_drop_unused_fields", name: "Drop de Campos", description: "Adiciona DROP FIELDS para campos não usados", category: "performance", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "perf_041_rename_consolidation", name: "Consolidação Rename", description: "Simplifica operações de rename", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_042_qualify_reduction", name: "Redução Qualify", description: "Minimiza uso desnecessário de Qualify", category: "performance", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "perf_043_subfield_optimization", name: "Otimização SubField", description: "Otimiza uso de SubField()", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_044_text_function_reduce", name: "Funções de Texto", description: "Reduz uso de funções de texto", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_045_date_parsing_optimize", name: "Parse de Datas", description: "Otimiza conversões de data", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_046_number_format_simplify", name: "Formatos Numéricos", description: "Simplifica formatação de números", category: "performance", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "perf_047_if_statement_flatten", name: "Achatamento If", description: "Simplifica if statements aninhados", category: "performance", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "perf_048_nested_if_optimize", name: "If Aninhado", description: "Otimiza estruturas if complexas", category: "performance", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "perf_049_pick_match_review", name: "Pick/Match", description: "Revisa uso de Pick() e Match()", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_050_set_analysis_cache", name: "Cache Set Analysis", description: "Otimiza set analysis para cache", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_051_variable_calculation_cache", name: "Cache de Variáveis", description: "Cacheia cálculos de variáveis", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_052_loop_unrolling", name: "Desenrolamento Loop", description: "Desenrola loops quando possível", category: "performance", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "perf_053_for_each_optimize", name: "Otimização For Each", description: "Otimiza loops For Each", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_054_temp_table_reduce", name: "Tabelas Temp", description: "Reduz uso de tabelas temporárias", category: "performance", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "perf_055_resident_to_sql", name: "Resident para SQL", description: "Converte loads resident em SQL quando possível", category: "performance", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "perf_056_qvd_buffer_optimize", name: "Buffer QVD", description: "Otimiza uso de buffer de QVD", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_057_store_qvd_placement", name: "Posicionamento Store", description: "Otimiza posicionamento de STORE", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_058_incremental_load_setup", name: "Carga Incremental", description: "Configura carga incremental", category: "performance", estimatedDuration: 1000, timeout: 7000, critical: false, retryable: true },
  { id: "perf_059_binary_load_check", name: "Binary Load", description: "Verifica uso de Binary Load", category: "performance", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "perf_060_partial_reload_config", name: "Partial Reload", description: "Configura partial reload", category: "performance", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "perf_061_section_access_optimize", name: "Section Access", description: "Otimiza section access", category: "performance", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "perf_062_reduce_section_access", name: "Redução Section Access", description: "Minimiza overhead de section access", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_063_star_is_eliminate", name: "Eliminação Star Is", description: "Remove uso de * em loads", category: "performance", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "perf_064_explicit_field_list", name: "Lista Explícita", description: "Usa lista explícita de campos", category: "performance", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "perf_065_load_inline_optimize", name: "Inline Optimize", description: "Otimiza loads inline", category: "performance", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },

  // QUALIDADE DE CÓDIGO (66-85)
  { id: "quality_066_naming_conventions", name: "Convenções de Nome", description: "Padroniza nomenclatura", category: "quality", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "quality_067_indentation_fix", name: "Correção Indentação", description: "Corrige indentação do código", category: "quality", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "quality_068_comment_cleanup", name: "Limpeza Comentários", description: "Organiza e limpa comentários", category: "quality", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "quality_069_variable_naming", name: "Nome de Variáveis", description: "Padroniza nomes de variáveis", category: "quality", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "quality_070_table_naming", name: "Nome de Tabelas", description: "Padroniza nomes de tabelas", category: "quality", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "quality_071_field_naming", name: "Nome de Campos", description: "Padroniza nomes de campos", category: "quality", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "quality_072_remove_dead_code", name: "Código Morto", description: "Remove código não usado", category: "quality", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "quality_073_consolidate_duplicates", name: "Consolidar Duplicatas", description: "Une código duplicado", category: "quality", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "quality_074_standardize_date_format", name: "Formato Data", description: "Padroniza formatos de data", category: "quality", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "quality_075_standardize_number_format", name: "Formato Número", description: "Padroniza formatos numéricos", category: "quality", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "quality_076_consistent_quotes", name: "Aspas Consistentes", description: "Padroniza uso de aspas", category: "quality", estimatedDuration: 400, timeout: 3000, critical: false, retryable: true },
  { id: "quality_077_semicolon_consistency", name: "Ponto e Vírgula", description: "Padroniza uso de ;", category: "quality", estimatedDuration: 400, timeout: 3000, critical: false, retryable: true },
  { id: "quality_078_line_break_normalize", name: "Quebras de Linha", description: "Normaliza quebras de linha", category: "quality", estimatedDuration: 400, timeout: 3000, critical: false, retryable: true },
  { id: "quality_079_whitespace_cleanup", name: "Limpeza Espaços", description: "Remove espaços desnecessários", category: "quality", estimatedDuration: 400, timeout: 3000, critical: false, retryable: true },
  { id: "quality_080_comment_style_standard", name: "Estilo Comentários", description: "Padroniza estilo de comentários", category: "quality", estimatedDuration: 500, timeout: 4000, critical: false, retryable: true },
  { id: "quality_081_section_organization", name: "Organização Seções", description: "Organiza seções do script", category: "quality", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "quality_082_dependency_ordering", name: "Ordem Dependências", description: "Ordena por dependências", category: "quality", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "quality_083_modular_structure", name: "Estrutura Modular", description: "Cria estrutura modular", category: "quality", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "quality_084_error_handling_add", name: "Error Handling", description: "Adiciona tratamento de erros", category: "quality", estimatedDuration: 800, timeout: 6000, critical: false, retryable: true },
  { id: "quality_085_trace_statement_add", name: "Trace Statements", description: "Adiciona traces para debug", category: "quality", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },

  // VALIDAÇÃO PÓS-OTIMIZAÇÃO (86-105)
  { id: "post_086_syntax_validation", name: "Validação Sintaxe", description: "Valida sintaxe final", category: "post_validation", estimatedDuration: 600, timeout: 5000, critical: true, retryable: true },
  { id: "post_087_semantic_validation", name: "Validação Semântica", description: "Valida semântica do código", category: "post_validation", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
  { id: "post_088_table_integrity_check", name: "Integridade Tabelas", description: "Verifica integridade de tabelas", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "post_089_field_integrity_check", name: "Integridade Campos", description: "Verifica integridade de campos", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "post_090_join_integrity_verify", name: "Integridade Joins", description: "Verifica integridade de joins", category: "post_validation", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
  { id: "post_091_where_logic_preserve", name: "Preservação Lógica", description: "Verifica preservação de lógica WHERE", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "post_092_calculation_equivalence", name: "Equivalência Cálculos", description: "Verifica equivalência de cálculos", category: "post_validation", estimatedDuration: 900, timeout: 6000, critical: true, retryable: true },
  { id: "post_093_data_type_preservation", name: "Tipos de Dados", description: "Verifica preservação de tipos", category: "post_validation", estimatedDuration: 600, timeout: 5000, critical: true, retryable: true },
  { id: "post_094_null_handling_check", name: "Tratamento Null", description: "Verifica handling de null", category: "post_validation", estimatedDuration: 500, timeout: 4000, critical: true, retryable: true },
  { id: "post_095_edge_case_validation", name: "Casos Edge", description: "Valida casos extremos", category: "post_validation", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
  { id: "post_096_performance_regression_test", name: "Regressão Performance", description: "Testa regressão de performance", category: "post_validation", estimatedDuration: 1000, timeout: 7000, critical: false, retryable: true },
  { id: "post_097_memory_usage_estimate", name: "Estimativa Memória", description: "Estima uso de memória", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "post_098_execution_time_estimate", name: "Estimativa Tempo", description: "Estima tempo de execução", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: false, retryable: true },
  { id: "post_099_security_revalidation", name: "Revalidação Segurança", description: "Revalida aspectos de segurança", category: "post_validation", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
  { id: "post_100_forbidden_commands_recheck", name: "Recheck Comandos", description: "Verifica novamente comandos proibidos", category: "post_validation", estimatedDuration: 500, timeout: 4000, critical: true, retryable: true },
  { id: "post_101_sql_injection_scan", name: "SQL Injection", description: "Scan de SQL injection", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "post_102_variable_scope_check", name: "Escopo Variáveis", description: "Verifica escopo de variáveis", category: "post_validation", estimatedDuration: 600, timeout: 5000, critical: false, retryable: true },
  { id: "post_103_circular_dependency_final", name: "Dependências Circulares", description: "Verificação final de ciclos", category: "post_validation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "post_104_synthetic_key_final", name: "Chaves Sintéticas Final", description: "Verificação final de chaves sintéticas", category: "post_validation", estimatedDuration: 600, timeout: 5000, critical: true, retryable: true },
  { id: "post_105_breaking_change_analysis", name: "Análise Breaking Changes", description: "Analisa mudanças incompatíveis", category: "post_validation", estimatedDuration: 900, timeout: 6000, critical: true, retryable: true },

  // GERAÇÃO DE RESULTADOS (106-112)
  { id: "result_106_generate_diff", name: "Geração Diff", description: "Gera diff unificado", category: "result_generation", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
  { id: "result_107_calculate_risk_score", name: "Score de Risco", description: "Calcula score de risco final", category: "result_generation", estimatedDuration: 600, timeout: 5000, critical: true, retryable: true },
  { id: "result_108_generate_explanation", name: "Explicação", description: "Gera explicação em PT-BR", category: "result_generation", estimatedDuration: 1000, timeout: 7000, critical: true, retryable: true },
  { id: "result_109_create_rollback_plan", name: "Plano Rollback", description: "Cria plano de rollback", category: "result_generation", estimatedDuration: 700, timeout: 5000, critical: true, retryable: true },
  { id: "result_110_generate_test_cases", name: "Casos de Teste", description: "Gera casos de teste", category: "result_generation", estimatedDuration: 900, timeout: 6000, critical: false, retryable: true },
  { id: "result_111_create_documentation", name: "Documentação", description: "Cria documentação completa", category: "result_generation", estimatedDuration: 1000, timeout: 7000, critical: false, retryable: true },
  { id: "result_112_final_summary", name: "Sumário Final", description: "Gera sumário final da otimização", category: "result_generation", estimatedDuration: 800, timeout: 6000, critical: true, retryable: true },
];

export const DEFAULT_ROTATION_CONFIG: ProviderRotationConfig = {
  maxAttemptsPerStep: 4,
  providerOrder: ["google", "nvidia"],
  neverRetryProvider: true,
  timeoutPerStep: 180000, // 3 minutos por tarefa (180000ms)
  globalTimeout: 900000, // 15 minutos total (900000ms)
};
