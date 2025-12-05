// Gera um CSV sintético com ~500 linhas para testes locais (substitui o QVD quando não se tem Qlik Desktop/Server).
// Saída: ../data/Fato_Vendas_Complexo.csv
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'data');
const outFile = path.join(outDir, 'Fato_Vendas_Complexo.csv');

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max, decimals = 2) => Number((min + Math.random() * (max - min)).toFixed(decimals));

const clientes = [
  ['Alpha Corp', 'Enterprise'],
  ['Beta LLC', 'Mid-Market'],
  ['Gamma SA', 'SMB'],
  ['Delta ME', 'Micro'],
  ['Sigma Partners', 'Enterprise'],
  ['Omega Retail', 'Mid-Market'],
  ['Nova Health', 'Enterprise'],
  ['Atlas Fin', 'Mid-Market'],
  ['Helix Edu', 'SMB'],
  ['Prisma Labs', 'Enterprise'],
];

const produtos = [
  ['Sensor Pro', 'IoT'],
  ['Vision Edge', 'AI/ML'],
  ['DataLake X', 'Data'],
  ['SecureID', 'Security'],
  ['QuantumOps', 'Infra'],
  ['FlowSuite', 'Automation'],
  ['OmniDesk', 'Productivity'],
  ['Insight360', 'Analytics'],
  ['PulseCare', 'Health'],
  ['EduStream', 'Education'],
];

const regioes = [
  ['Sudeste', 'Brasil'],
  ['Sul', 'Brasil'],
  ['Nordeste', 'Brasil'],
  ['Centro-Oeste', 'Brasil'],
  ['Norte', 'Brasil'],
  ['LATAM Norte', 'Mexico'],
  ['LATAM Sul', 'Chile'],
  ['LATAM Andina', 'Colombia'],
];

const tipoVenda = ['Novo', 'Expansao', 'Renovacao', 'Upsell'];
const meioPagamento = ['Cartao', 'Boleto', 'PIX', 'Wire', 'Credito Loja'];
const freqFat = ['Mensal', 'Trimestral', 'Anual'];
const statusContrato = ['Ativo', 'Atrasado', 'Cancelado'];
const canal = ['Canal Direto', 'Parceiro', 'Marketplace', 'Inside Sales'];
const modelo = ['On-Prem', 'SaaS', 'Hibrido'];
const sla = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'];

const headers = [
  'IdVenda', 'IdCliente', 'NomeCliente', 'SegmentoCliente', 'IdProduto', 'NomeProduto', 'CategoriaProduto',
  'IdRegiao', 'Regiao', 'Pais', 'DataVenda', 'HoraVenda', 'TipoVenda', 'MeioPagamento', 'ValorBruto',
  'AliquotaImposto', 'ValorComImposto', 'Desconto', 'ValorLiquido', 'CustoFinanceiro', 'MargemPercentual',
  'CustoProduto', 'CustoServico', 'FrequenciaFaturamento', 'StatusContrato', 'Canal', 'ModeloEntrega', 'SLA',
  'AutoRenovacao', 'TrialConvertido', 'StatusPagamento', 'PrazoEntregaDias', 'PrazoAtivacaoDias', 'ScoreSatisfacao',
  'NPS', 'ChaveExterna', 'DataCarga'
];

const rows = [headers.join(',')];
const pad2 = (n) => n.toString().padStart(2, '0');

for (let i = 1; i <= 500; i += 1) {
  const [nomeCliente, segmento] = pick(clientes);
  const [nomeProduto, categoria] = pick(produtos);
  const [regiao, pais] = pick(regioes);
  const data = new Date(2020, 0, 1 + Math.floor(Math.random() * 1825)); // 5 anos
  const hora = `${pad2(Math.floor(Math.random() * 24))}:${pad2(Math.floor(Math.random() * 60))}:${pad2(Math.floor(Math.random() * 60))}`;
  const valorBruto = randNum(500, 10000);
  const aliquota = randNum(0, 0.25, 4);
  const desconto = randNum(0, 0.15, 4);
  const valorComImposto = Number((valorBruto * (1 + aliquota)).toFixed(2));
  const valorLiquido = Number((valorBruto * (1 - desconto)).toFixed(2));
  const custoProduto = randNum(0, valorBruto, 2);
  const custoServico = randNum(0, valorBruto, 2);

  const row = [
    i,
    randNum(1, 10, 0),
    nomeCliente,
    segmento,
    randNum(101, 110, 0),
    nomeProduto,
    categoria,
    randNum(1, 8, 0),
    regiao,
    pais,
    `${data.getFullYear()}-${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`,
    hora,
    pick(tipoVenda),
    pick(meioPagamento),
    valorBruto,
    aliquota,
    valorComImposto,
    desconto,
    valorLiquido,
    randNum(0, 0.05, 4),
    randNum(0, 0.12, 4),
    custoProduto,
    custoServico,
    pick(freqFat),
    pick(statusContrato),
    pick(canal),
    pick(modelo),
    pick(sla),
    Math.random() > 0.5 ? 'Sim' : 'Nao',
    Math.random() > 0.7 ? 'Sim' : 'Nao',
    Math.random() > 0.8 ? 'Chargeback' : 'OK',
    randNum(0, 45, 2),
    randNum(0, 60, 2),
    randNum(0, 100, 2),
    randNum(0, 10, 2),
    `KEY_${i.toString().padStart(6, '0')}`,
    new Date().toISOString(),
  ];
  rows.push(row.join(','));
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, rows.join('\n'), 'utf8');
console.log(`CSV gerado: ${outFile}`);
