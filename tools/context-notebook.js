const fs = require('fs');
const path = require('path');

const NOTEBOOK_DIR = path.resolve(__dirname, '..', 'context-notebooks');
const alias = new Map([
  ['nvidia', 'nvidia-service'],
  ['nvidia-service', 'nvidia-service'],
  ['pipeline', 'pipeline-web'],
  ['pipeline-web', 'pipeline-web'],
  ['web', 'pipeline-web'],
  ['auditoria', 'fluxo-auditoria'],
  ['audit', 'fluxo-auditoria'],
  ['fluxo-auditoria', 'fluxo-auditoria']
]);

const args = process.argv.slice(2);
const requested = (args[0] || process.env.NOTEBOOK || '').toLowerCase();
if (!requested) {
  console.error('Uso: node tools/context-notebook.js <nvidia|pipeline|auditoria>');
  process.exit(1);
}

const resolved = alias.get(requested) || requested;
const filePath = path.join(NOTEBOOK_DIR, `${resolved}.md`);
if (!fs.existsSync(filePath)) {
  console.error(`Notebook '${resolved}' nao encontrado em ${filePath}`);
  const available = fs.readdirSync(NOTEBOOK_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.basename(file, '.md'));
  console.error('Disponiveis:', available.join(', '));
  process.exit(1);
}

const banner = `=== Context Notebook: ${resolved} ===`;
console.log(banner);
console.log('-'.repeat(banner.length));
console.log(fs.readFileSync(filePath, 'utf8'));

if (resolved === 'fluxo-auditoria') {
  const logPath = path.resolve(__dirname, '..', 'logs', 'codex-feedback.json');
  if (fs.existsSync(logPath)) {
    try {
      const raw = fs.readFileSync(logPath, 'utf8').trim();
      const data = raw ? JSON.parse(raw) : [];
      const lastEntries = data.slice(-3);
      console.log('\n### Ultimos feedbacks registrados');
      if (lastEntries.length === 0) {
        console.log('- Nenhum feedback registrado ainda. Use `npm run codex:feedback` para adicionar.');
      } else {
        lastEntries.forEach((entry) => {
          console.log(`- [${entry.timestamp}] etapa ${entry.etapa || 'n/d'} (${entry.status}): ${entry.resumo || entry.notas || 'sem descricao'}`);
        });
      }
    } catch (error) {
      console.error('\nNao foi possivel ler logs/codex-feedback.json:', error.message);
    }
  } else {
    console.log('\nNenhum arquivo logs/codex-feedback.json encontrado. Crie-o com `npm run codex:feedback`.');
  }
}
