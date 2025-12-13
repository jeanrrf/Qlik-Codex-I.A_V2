// Script rápido para testar a chave da NVIDIA
require('dotenv').config();

const apiKey = process.env.NVIDIA_API_KEY;
const model = process.env.NVIDIA_MODEL_NAME || 'qwen/qwen3-coder-480b-a35b-instruct';

console.log('🔑 Testando NVIDIA API Key...');
console.log('Modelo:', model);
console.log('Key (primeiros 10 chars):', apiKey?.substring(0, 10) + '...');

fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 10
  })
})
  .then(async res => {
    console.log('Status:', res.status);
    const text = await res.text();
    if (res.ok) {
      console.log('✅ NVIDIA API Key válida!');
      console.log('Resposta:', text);
    } else {
      console.log('❌ NVIDIA API Key inválida ou erro:');
      console.log(text);
    }
  })
  .catch(err => {
    console.error('❌ Erro ao testar:', err.message);
  });
