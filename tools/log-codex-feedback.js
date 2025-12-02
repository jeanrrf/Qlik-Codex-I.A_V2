const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, token) => {
  if (!token.startsWith('--')) return acc;
  const [key, ...rest] = token.slice(2).split('=');
  acc[key] = rest.join('=');
  return acc;
}, {});

const status = (args.status || 'erro').toLowerCase();
const resumo = args.resumo || args.notas || '';
const etapa = args.etapa || null;
const modelo = args.modelo || null;
const prompt = args.prompt || null;
const resposta = args.resposta || null;

if (!resumo) {
  console.error('Informe ao menos --resumo="descricao curta do problema".');
  process.exit(1);
}

const logDir = path.resolve(__dirname, '..', 'logs');
const logPath = path.join(logDir, 'codex-feedback.json');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let data = [];
if (fs.existsSync(logPath)) {
  try {
    const raw = fs.readFileSync(logPath, 'utf8').trim();
    data = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Nao foi possivel ler codex-feedback.json, criando novo arquivo. Motivo:', error.message);
  }
}

const entry = {
  timestamp: new Date().toISOString(),
  status,
  etapa,
  modelo,
  resumo,
  prompt,
  resposta,
  notas: args.notas || null
};

data.push(entry);
fs.writeFileSync(logPath, JSON.stringify(data, null, 2));
console.log(`Feedback registrado (${status}) em ${logPath}`);
