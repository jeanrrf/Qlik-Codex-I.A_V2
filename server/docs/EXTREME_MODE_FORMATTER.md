# 🚀 QLIK FORMATTER & INDENTER — EXTREME MODE

## Versão Final — Ultra Profissional, Ultra Segura, Ultra Precisa

O **EXTREME MODE** é um sistema avançado de formatação de scripts Qlik que eleva o código ao padrão **Enterprise Internacional**, com foco absoluto em:

- ✅ **Formatação perfeita**
- ✅ **Indentação impecável**
- ✅ **Padronização universal**
- ✅ **Alinhamento inteligente**
- ✅ **Organização visual moderna**
- ❌ **ZERO alteração de lógica**

---

## ❗ REGRAS ABSOLUTAS (NÃO PODE DESCUMPRIR)

1. **Nunca alterar lógica, valores, cálculos ou estruturas funcionais**
2. **Nunca adicionar nada**
3. **Nunca remover nada**
4. **Nunca criar campos, tabelas, alias, variáveis ou funções**
5. **Nunca mover partes do código que alterem a execução**
6. **Nenhuma otimização lógica — apenas estética e clareza**

> **Se houver risco de alterar significado → NÃO MODIFIQUE**

---

## 🔥 EXTREME FORMATTING RULES

### ✔ 1) FUNÇÕES EM CAIXA ALTA (UPPERCASE)

**100%** das funções Qlik são convertidas para UPPERCASE:

```qlik
// ANTES
load id, left(nome, 10) as nome_curto, if(idade > 18, 'Maior', 'Menor') as categoria from dados;

// DEPOIS (EXTREME MODE)
LOAD
    id,
    LEFT(nome, 10)  AS nome_curto,
    IF(idade > 18, 'Maior', 'Menor') AS categoria
FROM dados;
```

**Lista completa de funções suportadas** (150+ funções):
- String: `LEFT`, `RIGHT`, `TRIM`, `UPPER`, `LOWER`, `REPLACE`, `SUBFIELD`, `MID`, `LEN`
- Numéricas: `NUM`, `FLOOR`, `CEIL`, `ROUND`, `ABS`, `MOD`, `DIV`, `SQRT`, `POW`
- Agregação: `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`, `MEDIAN`, `STDEV`
- Range: `RANGESUM`, `RANGEAVG`, `RANGEMIN`, `RANGEMAX`, `RANGECOUNT`
- Data: `DATE`, `TIMESTAMP`, `MAKEDATE`, `MONTHSTART`, `YEARSTART`, `ADDMONTHS`
- Condicionais: `IF`, `ALT`, `PICK`, `MATCH`, `MIXMATCH`, `WILDMATCH`
- Mapeamento: `APPLYMAP`, `MAPSUBSTRING`
- Inter-record: `PEEK`, `PREVIOUS`, `EXISTS`, `FIELDVALUE`, `LOOKUP`
- E mais 100+ funções...

### ✔ 2) ALINHAMENTO VERTICAL DE "AS"

Obrigatório alinhar verticalmente o conjunto `campo AS novo_nome` dentro de cada bloco. O alinhamento deve se basear no campo mais longo do bloco.

**Exemplo Correto (Template Oficial):**

```qlik
Fato_Entrada:
LOAD
    codEmp           AS "Fato_Entrada.Empresa",
    codFil           AS "Fato_Entrada.Filial",
    codFor           AS "Fato_Entrada.CodFornecedor",
    numNfc           AS "Fato_Entrada.NumeroNota",
    codSnf           AS "Fato_Entrada.SerieNota",
    %ChaveNotaFiscal AS "Fato_Entrada.ChaveNotaFiscal",
    tnsPro           AS "Fato_Entrada.cfop",
    pesLiq           AS "Fato_Entrada.PesoLiquido",
    DataEntrada      AS "Fato_Entrada.DataEntrada",
    DataEmissao      AS "Fato_Entrada.DataEmissao",
    codPro           AS "Fato_Entrada.CodProduto",
    codDer           AS "Fato_Entrada.CodDerivacao",
    proFor           AS "Fato_Entrada.CodProdutoFornecedor",
    cplIpc           AS "Fato_Entrada.DescricaoComplementar",
    NUM(qtdRec)      AS "Fato_Entrada.Qtd",
    uniNfc           AS "Fato_Entrada.UnidadeMedida",
    NUM(preUni)      AS "Fato_Entrada.PrecoUnitario",
    NUM(vlrBru)      AS "Fato_Entrada.ValorBruto",
    NUM(vlrDsc)      AS "Fato_Entrada.ValorDesconto",
    NUM(vlrLiq)      AS "Fato_Entrada.ValorLiquido"
FROM [lib://Dados/Entradas.qvd]
(qvd);
```

**Pontos-chave:**
- Colunas visualmente alinhadas
- Todos os `AS` na mesma coluna dentro do bloco
- Vírgula perfeitamente posicionada
- **Extreme estética = Extreme credibilidade**

### ✔ 3) INDENTAÇÃO POR BLOCOS (4 ESPAÇOS)

```qlik
// ANTES
if vAno = 2024 then
load * from dados;
end if

// DEPOIS (EXTREME MODE)
IF vAno = 2024 THEN
    LOAD * FROM dados;
END IF
```

**Regras:**
- Um bloco `LOAD` deve começar limpo
- Funções grandes (IF aninhados) → multi-linha clara
- Cada bloco separado por **1 linha vazia somente**
- Nunca mais de 1 linha vazia
- Parênteses organizados verticalmente

### ✔ 4) PADRONIZAÇÃO DE ESPAÇOS

```qlik
// ANTES
load * where idade>18 and salario<>0 and ativo=1;

// DEPOIS (EXTREME MODE)
LOAD *
WHERE idade > 18 AND salario <> 0 AND ativo = 1;
```

**Regras:**
- 1 espaço ao redor de operadores: `field = 1`, `value > 0`, `qty <> ''`
- 0 espaços antes de vírgulas
- 1 espaço depois de vírgulas
- Nunca múltiplos espaços inconsistentes

### ✔ 5) FORMATAÇÃO AVANÇADA DE FUNÇÕES ENCAIXADAS

```qlik
// ANTES
load rangemin(num(if(value>0,value,0))) as resultado from dados;

// DEPOIS (EXTREME MODE)
LOAD
    RANGEMIN(
        NUM(
            IF(
                value > 0,
                value,
                0
            )
        )
    ) AS resultado
FROM dados;
```

**Funções grandes → sempre multi-linha, modernas, elegantes e legíveis**

### ✔ 6) TRATAMENTO DE BLOCOS QLIK

- `LOAD`, `JOIN`, `RESIDENT`, `CONCATENATE`, `MAPPING` → organizados
- Sempre preservar a ordem original
- Nunca mover blocos
- Melhor legibilidade sem alterar execução

### ✔ 7) KEYWORDS EM CAIXA ALTA

Todos os keywords Qlik em UPPERCASE:
- `LOAD`, `SELECT`, `FROM`, `RESIDENT`, `WHERE`
- `GROUP BY`, `ORDER BY`, `JOIN`, `LEFT JOIN`, `INNER JOIN`
- `IF`, `THEN`, `ELSEIF`, `ELSE`, `END IF`
- `FOR`, `TO`, `NEXT`, `DO`, `WHILE`, `LOOP`
- `SUB`, `END SUB`, `CALL`
- `SET`, `LET`, `QUALIFY`, `UNQUALIFY`
- `STORE`, `DROP TABLE`, `DROP FIELD`, `CONCATENATE`

---

## 🛡 EXTREME SAFETY MODE

O formatter verifica antes de aplicar:

- ✅ Se existe risco de alterar execução → **NÃO ALTERA**
- ✅ Se há blocos incompletos → **NÃO REORGANIZA LOGICAMENTE**
- ✅ Se há campos sensíveis → **NÃO TOCA**
- ✅ Se uma função está truncada → **NÃO ALTERA SINTAXE**

### **REGRA CLARA:**
> **"FORMATA, EMBELEZA, ORGANIZA — MAS NUNCA ALTERA A LÓGICA OU OS RESULTADOS DO SCRIPT."**

---

## 📊 AÇÕES RASTREADAS (Actions)

O EXTREME MODE retorna lista detalhada de ações aplicadas:

```typescript
{
  formatted: string,           // Script formatado
  actions: [
    {
      id: 'upper-kw',
      applied: true,
      description: '✅ EXTREME: Keywords padronizados em CAIXA ALTA',
      risk: 'low'
    },
    {
      id: 'upper-func',
      applied: true,
      description: '✅ EXTREME: Funções Qlik em CAIXA ALTA',
      risk: 'low'
    },
    {
      id: 'align-as',
      applied: true,
      description: '✅ EXTREME: Alinhamento vertical de AS',
      risk: 'low'
    },
    {
      id: 'op-spacing',
      applied: true,
      description: '✅ EXTREME: Espaçamento padronizado em operadores',
      risk: 'low'
    },
    {
      id: 'indent',
      applied: true,
      description: '✅ EXTREME: Indentação de 4 espaços em blocos',
      risk: 'low'
    }
  ]
}
```

---

## 🎯 USO DA API

### Via Service (Local Formatter)

```typescript
import { applyLocalAdvancedFormatting } from './services/qlikFormatterService';

const script = `load id,left(nome,10) as nome from dados;`;
const { formatted, actions } = applyLocalAdvancedFormatting(script);

console.log(formatted);
// LOAD
//     id,
//     LEFT(nome, 10) AS nome
// FROM dados;
```

### Via SSE Progress (Para UI com feedback em tempo real)

```typescript
import { formatWithProgress } from './services/qlikFormatterService';

const result = await formatWithProgress(script, {
  onProgress: (percent, message) => {
    console.log(`${percent}% - ${message}`);
  }
});
```

---

## 🧪 TESTES

Todos os testes passam com cobertura completa:

```bash
npm test -- qlikFormatterService.spec.ts

✓ 🔥 EXTREME: uppercases Qlik functions while preserving field names
✓ 🔥 EXTREME: applies vertical AS alignment
✓ 🔥 EXTREME: adds proper spacing around operators
✓ 🔥 EXTREME: formats nested functions with intelligent breaks
✓ 🔥 EXTREME: preserves keywords in UPPERCASE
✓ 🔥 EXTREME: applies 4-space indentation to blocks
✓ 🔥 EXTREME: returns detailed action list
```

---

## 🏁 FINALIDADE

Entregar ao usuário um código Qlik:

- ✅ **Perfeito**
- ✅ **Elegante**
- ✅ **Legível**
- ✅ **Profissional**
- ✅ **Moderno**
- ✅ **Seguro**
- ✅ **Com zero impacto lógico**

### Um padrão que pareceria escrito por um **Qlik Architect Senior com mais de 10 anos de experiência**.

---

## 📝 EXEMPLO COMPLETO: ANTES vs DEPOIS

### ANTES (Script original)
```qlik
load id,nome,if(idade>18,'Maior','Menor') as cat,left(endereco,50) as end,num(salario) as sal from [lib://dados.qvd](qvd) where ativo='S' and salario>0;
```

### DEPOIS (EXTREME MODE)
```qlik
LOAD
    id,
    nome,
    IF(idade > 18, 'Maior', 'Menor') AS cat,
    LEFT(endereco, 50)               AS end,
    NUM(salario)                     AS sal
FROM [lib://dados.qvd] (qvd)
WHERE ativo = 'S' AND salario > 0;
```

---

## 🔍 IMPLEMENTAÇÃO

### Arquivos principais:
- **Service**: `server/src/services/qlikFormatterService.ts`
- **Testes**: `server/test/qlikFormatterService.spec.ts`
- **Documentação**: `server/docs/EXTREME_MODE_FORMATTER.md` (este arquivo)

### Funções principais:
- `applyLocalAdvancedFormatting(script: string)` - Formatter local principal
- `uppercaseQlikFunctions(line: string)` - Uppercase de funções
- `normalizeOperatorSpacing(line: string)` - Espaçamento de operadores
- `formatNestedFunction(expr: string)` - Formatação de funções aninhadas
- `formatWithProgress(script: string, opts?)` - Com progresso SSE

---

## ✅ [FIM — QLIK FORMATTER & INDENTER EXTREME MODE]

**Desenvolvido por:** PRO-DEV-ENGINE ENTERPRISE (Sonnet 4.5 Edition)  
**Projeto:** Qlik Codex I.A — AINEX Pipeline  
**Versão:** 1.0.0 EXTREME  
**Data:** Dezembro 2025
