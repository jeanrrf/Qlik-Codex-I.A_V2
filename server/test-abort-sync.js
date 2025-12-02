/**
 * TESTE: Sincronização Backend/Frontend com Abort Signal
 * 
 * Este script testa se o backend realmente para quando:
 * 1. O cliente desconecta (fecha conexão SSE)
 * 2. O AbortController.abort() é chamado
 * 
 * Simula um cenário real onde o usuário clica "Parar" no frontend.
 */

const http = require('http');

// Configurações
const HOST = 'localhost';
const PORT = 3000; // Ajuste conforme sua porta
const AUTH_TOKEN = process.env.TEST_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBxbGlrY29kZXguY29tIiwicm9sZSI6Ik9XTkVSIiwiaWF0IjoxNzM3MDAwMDAwfQ.fake-signature';

// Script de teste grande (vai demorar para processar)
const LARGE_SCRIPT = `
LET vQVDPath = 'lib://DataFiles/QVDs/';
LET vStartDate = Date(Today() - 365);
LET vEndDate = Date(Today());

// ============================================
// TABELA 1: VENDAS
// ============================================
Vendas:
LOAD
    ID_Venda,
    Data_Venda,
    ID_Cliente,
    ID_Produto,
    Quantidade,
    Valor_Unitario,
    Valor_Total,
    ID_Vendedor,
    ID_Loja,
    Status_Venda,
    Tipo_Pagamento
FROM [$(vQVDPath)Vendas.qvd] (qvd)
WHERE Data_Venda >= '$(vStartDate)' 
  AND Data_Venda <= '$(vEndDate)';

// ============================================
// TABELA 2: CLIENTES
// ============================================
Clientes:
LOAD
    ID_Cliente,
    Nome_Cliente,
    CPF_CNPJ,
    Email,
    Telefone,
    Cidade,
    Estado,
    Pais,
    Data_Cadastro,
    Segmento,
    Status_Cliente
FROM [$(vQVDPath)Clientes.qvd] (qvd);

// ============================================
// TABELA 3: PRODUTOS
// ============================================
Produtos:
LOAD
    ID_Produto,
    Nome_Produto,
    Categoria,
    Subcategoria,
    Marca,
    Fornecedor,
    Preco_Custo,
    Preco_Venda,
    Estoque_Atual,
    Status_Produto
FROM [$(vQVDPath)Produtos.qvd] (qvd);

// ============================================
// TABELA 4: LOJAS
// ============================================
Lojas:
LOAD
    ID_Loja,
    Nome_Loja,
    Cidade,
    Estado,
    Regiao,
    Gerente,
    Data_Abertura
FROM [$(vQVDPath)Lojas.qvd] (qvd);

// ============================================
// ANÁLISE COMPLEXA (vai demorar)
// ============================================
FOR i = 1 to 100
    TRACE Loop $(i) de 100;
NEXT;
`.repeat(10); // Repete 10x para ficar bem grande

console.log('🧪 TESTE: Sincronização Backend/Frontend\n');
console.log('Script size:', LARGE_SCRIPT.length, 'chars');
console.log('Estimated lines:', LARGE_SCRIPT.split('\n').length);
console.log('\n🚀 Iniciando otimização...\n');

// Cria requisição POST
const postData = JSON.stringify({
  script: LARGE_SCRIPT,
  mode: 'ultra-expert',
  llmOptions: {
    temperature: 0.2,
    maxTokens: 8000
  }
});

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/scripts/optimize',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

let eventCount = 0;
let lastEventType = null;
let startTime = Date.now();

const req = http.request(options, (res) => {
  console.log('📡 Status Code:', res.statusCode);
  console.log('📡 Headers:', res.headers);
  console.log('');

  let buffer = '';

  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    lines.forEach(line => {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          eventCount++;
          lastEventType = data.type;

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[${elapsed}s] Event #${eventCount}: ${data.type}`);

          if (data.type === 'substep') {
            console.log(`  └─ ${data.substep.name} (${data.substep.status})`);
          } else if (data.type === 'script_analysis') {
            console.log(`  └─ Lines: ${data.scriptInfo?.lineCount || 'N/A'}`);
          } else if (data.type === 'step_complete') {
            console.log(`  └─ Step: ${data.step.id} - ${data.step.duration}ms`);
          }

          // SIMULA DESCONEXÃO APÓS 10 EVENTOS
          if (eventCount === 10) {
            console.log('\n⚠️  SIMULANDO DESCONEXÃO DO CLIENTE (após 10 eventos)...\n');
            req.destroy(); // Fecha conexão abruptamente
          }
        } catch (err) {
          console.error('❌ Parse error:', err.message);
        }
      }
    });
  });

  res.on('end', () => {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Stream encerrado após ${totalTime}s`);
    console.log(`📊 Total de eventos recebidos: ${eventCount}`);
    console.log(`📊 Último tipo de evento: ${lastEventType}`);
  });
});

req.on('error', (err) => {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⛔ Conexão abortada após ${totalTime}s (esperado)`);
  console.log(`📊 Eventos recebidos antes do abort: ${eventCount}`);
  console.log(`📊 Último evento: ${lastEventType}`);

  console.log('\n📝 VERIFICAÇÃO:');
  console.log('   1. Abra os logs do servidor');
  console.log('   2. Procure por "[SSE] Client disconnected - aborting optimization"');
  console.log('   3. Confirme que aparecem mensagens "⛔ Optimization aborted at [contexto]"');
  console.log('   4. Backend deve ter parado de processar após a desconexão\n');
});

req.write(postData);
req.end();

// Timeout de segurança (30s)
setTimeout(() => {
  console.log('\n⏱️  TIMEOUT - Forçando encerramento do teste');
  process.exit(0);
}, 30000);
