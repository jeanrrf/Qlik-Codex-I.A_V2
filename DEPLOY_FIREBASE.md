# Guia de Deploy - Qlik Codex I.A (Firebase Edition)

Este guia explica como publicar o projeto usando **Firebase** (Hosting + Functions).

## Pré-requisitos

1.  Instale a CLI do Firebase: `npm install -g firebase-tools`
2.  Faça login: `firebase login`
3.  Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).

## Configuração

1.  Na raiz do projeto, vincule ao seu projeto Firebase:
    ```bash
    firebase use --add
    ```
    (Selecione o projeto que você criou).

## Deploy (Frontend + Backend)

O projeto já está configurado para fazer deploy de tudo com um comando:

```bash
firebase deploy
```

Isso vai:
1.  Compilar o Backend (`server`).
2.  Compilar o Frontend (`web`).
3.  Subir as Functions (Backend).
4.  Subir o Hosting (Frontend).

## ⚠️ Avisos Importantes (Leia antes de publicar!)

### 1. Custo (Plano Blaze)
Para que o Backend funcione corretamente, você precisa ativar o plano **Blaze (Pay as you go)** no Firebase.
*   **Por que?** O plano gratuito (Spark) bloqueia chamadas de rede para fora do Google. Como nosso backend chama a API da NVIDIA (e outras), ele falhará no plano gratuito.
*   **Custo:** O plano Blaze tem uma cota gratuita generosa. Para uso moderado, o custo costuma ser zero ou centavos.

### 2. Banco de Dados (SQLite vs Cloud)
O backend atual usa **SQLite**, que salva os dados em um arquivo local (`qlik-codex.db`).
*   **Problema:** No Firebase Functions, o sistema de arquivos é **efêmero**. Toda vez que o servidor reiniciar (o que acontece frequentemente), **o banco de dados será apagado**.
*   **Consequência:** Histórico de chats, usuários e sessões serão perdidos a cada reinício.
*   **Solução:** Para produção real, você deve migrar para o **Firestore** ou conectar um banco externo (como Turso/Neon).
    *   *Se for apenas para testes ou demonstração rápida, pode usar como está, sabendo que os dados somem.*

### 3. Variáveis de Ambiente
Você precisa configurar as chaves de API no Firebase Functions:

```bash
firebase functions:config:set env.gemini_api_key="SUA_CHAVE" env.nvidia_api_key="SUA_CHAVE" env.jwt_secret="SEGREDO"
```

(Nota: O código atual lê de `.env`. Para Firebase Functions Gen 2, o ideal é usar `firebase functions:secrets:set` ou variáveis de ambiente no painel do Google Cloud Run).

## Alternativa Híbrida (Recomendada para "Zero Reais")

Se você não quer colocar cartão de crédito (Blaze) ou quer persistência de dados grátis:

1.  **Frontend**: Use **Firebase Hosting** (apenas `firebase deploy --only hosting`).
2.  **Backend**: Use **Render.com** (como configurado anteriormente).
    *   No Render, o SQLite também é efêmero no plano grátis, mas o servidor reinicia com menos frequência que uma Function.
    *   Configure a URL do backend no frontend (arquivo `.env.production` ou painel da Vercel/Firebase).
