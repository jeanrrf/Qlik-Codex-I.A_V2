# 🔐 Configuração OAuth Google - DEV Local

## ⚠️ Problema Atual

O Google OAuth está rejeitando o callback porque a URI `http://localhost:3000/api/auth/google/callback` não está autorizada no Google Cloud Console.

## ✅ Solução (5 minutos)

### Passo 1: Acesse Google Cloud Console

1. Abra: https://console.cloud.google.com/apis/credentials
2. **Faça login com a conta Google que criou o projeto**
3. Selecione o projeto correto no topo da página

### Passo 2: Editar OAuth Client ID

1. Na lista de credenciais, encontre seu **OAuth 2.0 Client ID**
2. O nome deve ser algo como: `Qlik Codex I.A` ou similar
3. Clique no nome para editar

### Passo 3: Adicionar URIs de Redirecionamento

Na seção **"URIs de redirecionamento autorizadas"**, adicione:

#### Para DESENVOLVIMENTO (localhost):
```
http://localhost:3000/api/auth/google/callback
```

#### Para PRODUÇÃO (quando fizer deploy):
```
https://seu-dominio.com/api/auth/google/callback
```

### Passo 4: Salvar

1. Role até o final da página
2. Clique em **"SALVAR"**
3. Aguarde alguns segundos (Google pode levar até 1 minuto para propagar)

---

## 🧪 Testar

1. Reinicie o servidor backend (Ctrl+C e depois `npm run dev` na pasta `server/`)
2. Abra o frontend: `http://localhost:5173`
3. Clique em **"Login com Google"**
4. Você deve ser redirecionado para Google e então de volta para sua aplicação

---

## 🔍 Verificar Logs

Após adicionar o log, quando você clicar em "Login com Google", verá no console do servidor:

```
[qlik-codex-ia:info] [AUTH] Google OAuth URL gerada {
  redirectUri: 'http://localhost:3000/api/auth/google/callback'
}
```

Certifique-se de que essa URL **exatamente** está na lista de URIs autorizadas no Google Cloud Console.

---

## 📋 Credenciais Atuais

Seu `.env` está configurado corretamente:

```env
GOOGLE_CLIENT_ID=166030476995-vnergcpr9cgduakphgd1l6o1q6khnlpa.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

O problema é **APENAS** no Google Cloud Console - falta autorizar o redirect_uri.

---

## ❓ Dúvidas Comuns

### "Não encontro meu projeto no Google Cloud"

- Certifique-se de estar logado com a **mesma conta Google** que criou as credenciais
- O Client ID começa com `166030476995`, então o projeto existe

### "Erro persiste após adicionar URI"

- Aguarde 1-2 minutos (propagação do Google)
- Limpe o cache do navegador (Ctrl+Shift+Del)
- Tente em aba anônima

### "redirect_uri_mismatch ainda aparece"

- Verifique se não há espaços extras ou `/` no final da URI
- Deve ser EXATAMENTE: `http://localhost:3000/api/auth/google/callback`
- Sem trailing slash, sem espaços

---

## ✅ Checklist Final

- [ ] Acessei Google Cloud Console
- [ ] Encontrei o OAuth 2.0 Client ID correto
- [ ] Adicionei `http://localhost:3000/api/auth/google/callback` nas URIs autorizadas
- [ ] Salvei as alterações
- [ ] Aguardei 1 minuto
- [ ] Reiniciei o servidor backend
- [ ] Testei o login

---

**Se ainda tiver problemas, me envie um print da tela de configuração do OAuth no Google Cloud Console!**
