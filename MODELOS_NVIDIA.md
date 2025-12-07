# Modelos NVIDIA NIM Recomendados (Dezembro 2025)

Abaixo estão os IDs de modelos recomendados para uso com a API NVIDIA NIM, baseados no ranking de performance para geração de código e suporte a Português.

## 🏆 Top 1: DeepSeek-V3 (ou Coder V2)
**ID Sugerido:** `deepseek-ai/deepseek-v3` (ou `deepseek-ai/deepseek-coder-v2-instruct`)
- **Descrição:** Melhor modelo aberto atual. Excelente em PT-BR e Código.
- **Uso:** Geral, Código Complexo, Raciocínio.

## 🥈 Top 2: Llama 3.1 405B
**ID Sugerido:** `meta/llama-3.1-405b-instruct`
- **Descrição:** Modelo denso mais robusto. Padrão corporativo.
- **Uso:** Arquitetura, Instruções Complexas, Estabilidade.

## 🥉 Top 3: Qwen 2.5 / Qwen 3
**ID Sugerido:** `qwen/qwen2.5-72b-instruct` (ou `qwen/qwen3-next-80b-a3b-thinking`)
- **Descrição:** Melhor custo-benefício e suporte nativo a PT-BR.
- **Uso:** Alta velocidade, Código Poliglota.

---

## Como Configurar
1. Obtenha sua API Key em [build.nvidia.com](https://build.nvidia.com).
2. Adicione ao arquivo `.env`:
   ```env
   NVIDIA_API_KEY=nvapi-...
   NVIDIA_MODEL_NAME=deepseek-ai/deepseek-r1
   ```
3. Teste a conexão:
   ```bash
   npm run prompt:nvidia
   ```
