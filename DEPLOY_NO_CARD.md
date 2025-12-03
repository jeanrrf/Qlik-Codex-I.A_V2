# Guia de Deploy - Qlik Codex I.A (Estratégia "Zero Reais" com Firestore)

Este guia explica como publicar o projeto usando **Firebase Hosting** (Frontend), **Render** (Backend) e **Firestore** (Banco de Dados), sem precisar de cartão de crédito.

## Arquitetura "No Card"

- **Frontend**: Firebase Hosting (Plano Spark - Grátis)
- **Backend**: Render.com (Plano Free)
- **Banco de Dados**: Firebase Firestore (Plano Spark - Grátis)

## Passo 1: Configurar Firebase e Firestore

1.  Acesse o [Console do Firebase](https://console.firebase.google.com/).
2.  Crie um novo projeto.
3.  No menu lateral, vá em **Criação > Firestore Database**.
4.  Clique em **Criar banco de dados**.
5.  Escolha o local (ex: `southamerica-east1` ou `us-central1`).
6.  Escolha o modo **Produção**.
7.  Vá na aba **Regras** e defina regras básicas (ou deixe aberto para testes, mas cuidado):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true; // ⚠️ Em produção, restrinja isso!
        }
      }
    }
    ```
8.  **Gerar Chave de Serviço (Para o Backend):**
    - Vá em **Configurações do Projeto** (engrenagem) > **Contas de serviço**.
    - Clique em **Gerar nova chave privada**.
    - Um arquivo `.json` será baixado. **Guarde-o com segurança!**

## Passo 2: Publicar o Backend (Render)

1.  Crie uma conta no [Render](https://render.com).
2.  Crie um novo **Web Service** conectado ao seu repositório GitHub.
3.  Configure:
    - **Root Directory**: `server`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `npm run start`
    - **Plan**: Free
4.  **Variáveis de Ambiente (Environment Variables):**
    - `NODE_ENV`: `production`
    - `GEMINI_API_KEY`: Sua chave do Google AI Studio.
    - `NVIDIA_API_KEY`: Sua chave da NVIDIA.
    - `JWT_SECRET`: Uma string secreta.
    - `GOOGLE_APPLICATION_CREDENTIALS`: `/etc/secrets/google-credentials.json` (Veja o próximo passo).
5.  **Adicionar o Arquivo de Credenciais (Secret File):**
    - No painel do Render, vá na aba **Environment** do seu serviço.
    - Role até **Secret Files**.
    - Clique em **Add Secret File**.
    - **Filename**: `google-credentials.json`
    - **Content**: Cole o conteúdo do arquivo `.json` que você baixou do Firebase no Passo 1.
    - Clique em **Save**.

O Render vai reiniciar o serviço. Agora seu backend conecta no Firestore!

## Passo 3: Publicar o Frontend (Firebase Hosting)

1.  Instale a CLI do Firebase: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Na raiz do projeto: `firebase init hosting`
    - Selecione seu projeto.
    - Pasta pública: `web/dist`
    - Configurar como SPA? **Yes**
    - Deploy automático com GitHub? (Opcional)
4.  **Configurar URL da API:**
    - Crie/Edite o arquivo `web/.env.production`:
      ```
      VITE_API_URL=https://seu-backend-no-render.onrender.com
      ```
    - (Substitua pela URL que o Render gerou para você).
5.  Build e Deploy:
    ```bash
    cd web
    npm run build
    cd ..
    firebase deploy --only hosting
    ```

## Pronto!

Agora você tem:
- Frontend rápido no Firebase.
- Backend persistente no Render (sem limite de tempo de execução como Functions).
- Banco de dados Firestore persistente e gratuito.
- **Custo Zero e Sem Cartão de Crédito.**
