const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const cwd = process.cwd();
const envCandidates = [
  process.env.NVIDIA_ENV_FILE && path.resolve(cwd, process.env.NVIDIA_ENV_FILE),
  path.resolve(cwd, 'server', '.env'),
  path.resolve(cwd, '.env')
].filter(Boolean);

let envSource = 'process.env';
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envSource = envPath;
    break;
  }
}

const status = (value) => (value ? 'SET' : 'MISSING');
const nvidiaKeyStatus = status(process.env.NVIDIA_API_KEY);
const geminiKeyStatus = status(process.env.GEMINI_API_KEY);
const modelOverride = process.env.NVIDIA_MODEL_NAME || null;

const modelosPath = path.resolve(cwd, 'MODELOS_NVIDIA.md');
let defaultModel = 'nvidia/llama-3.3-nemotron-super-49b-v1.5';
if (fs.existsSync(modelosPath)) {
  const text = fs.readFileSync(modelosPath, 'utf8');
  const match = text.match(/\*\*ID\*\*:\s*`([^`]+)`/);
  if (match) {
    defaultModel = match[1];
  }
}

const servicePath = path.resolve(cwd, 'nvidiaService.js');
const serviceStats = fs.existsSync(servicePath) ? fs.statSync(servicePath) : null;

const logPath = path.resolve(cwd, 'logs', 'nvidia-service.log');
let lastLogLine = 'Nenhum log encontrado.';
if (fs.existsSync(logPath)) {
  const lines = fs.readFileSync(logPath, 'utf8').trim().split(/\r?\n/);
  lastLogLine = lines.slice(-3).join('\n');
}

console.log('=== SNAPSHOT NVIDIA (npm run prompt:nvidia) ===');
console.log(`Env carregado de: ${envSource}`);
console.log(`NVIDIA_API_KEY: ${nvidiaKeyStatus}`);
console.log(`GEMINI_API_KEY: ${geminiKeyStatus}`);
console.log(`Modelo padrao (MODELOS_NVIDIA.md): ${defaultModel}`);
console.log(`Override via env: ${modelOverride || 'nenhum'}`);
if (serviceStats) {
  console.log(`nvidiaService.js modificado em: ${serviceStats.mtime.toISOString()} (${serviceStats.size} bytes)`);
}
console.log('\nChecklist rapido:');
console.log('- Variaveis carregadas? -> use `server/.env` ou `NVIDIA_ENV_FILE`.');
console.log('- Testar conectividade com `node nvidiaService.js` antes de rodar SSE.');
console.log('- Quando faltar contexto, anexar trechos de `MODELOS_NVIDIA.md` e `nvidiaService.js`.');
console.log('\nUltimos logs (logs/nvidia-service.log):');
console.log(lastLogLine);
console.log('\nReferencias: context-notebooks/nvidia-service.md, README.md > Codex Ops, tools/nvidia-diagnose.js');
