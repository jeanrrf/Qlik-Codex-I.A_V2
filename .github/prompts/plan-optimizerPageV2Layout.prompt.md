
# Plano de Redesenho (OptimizerPageV2)

- Objetivo: redesenhar layout dos modos NVIDIA e Ultra Expert mantendo cores/efeitos atuais e melhorar ergonomia do toggle/execução.
- Contexto atual: header unificado; toggle com cards compactos; botões Exec/Stop integrados; NVIDIA e Ultra já possuem cores e glows.

## Itens de Interface
- Refatorar toggle de modos para duas colunas claras: NVIDIA (GPU) e Ultra Expert (full stack), com badges e chips.
- Melhorar hierarquia visual: ícone à esquerda, título + badge, helper e chips; hover/active coerentes com cores atuais.
- Garantir acessibilidade: estados disabled claros, foco visível.
- Alinhar Exec/Stop com o toggle para evitar “bug” visual ao selecionar NVIDIA (padding/gap consistentes).
- Manter badge NVIDIA (eye) e efeitos de pulse, apenas ajustar proporções se necessário.

## Ajustes Técnicos
- Revisar CSS do toggle: padding/gap, min-width, bordas; preservar gradientes/box-shadows de NVIDIA/Ultra.
- Revisar lógica de disabled (Ultra quota) e estado ativo (NVIDIA) para não alternar ícones incorretamente.
- Garantir que o botão Executar não mude de largura abruptamente ao alternar modos; usar largura mínima/auto.
- Conferir responsividade em 1280px e mobile: toggle colapsa em coluna única com wrap.

## Testes Visuais
- Desktop 1440px: alternar entre NVIDIA/Ultra e observar alinhamento de Exec/Stop e badge.
- Restrições: não alterar paleta; manter glows e pulsos atuais.

## Entregáveis
- Patch em `OptimizerPageV2.tsx` (markup dos botões) e `OptimizerPageV2.css` (estilos do toggle e exec).
- Verificação manual no navegador após `npm run dev` do web.
