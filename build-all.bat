@echo off
echo [BUILD] Iniciando build completo do Qlik Codex I.A...

echo [1/4] Limpando builds anteriores...
if exist "web\dist" rmdir /s /q "web\dist"
if exist "server\dist" rmdir /s /q "server\dist"

echo [2/4] Buildando SERVER...
cd server
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha no build do Server!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo [3/4] Buildando WEB (Frontend)...
cd web
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha no build da Web!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo [4/4] Copiando arquivos estaticos se necessario...
REM (Opcional: se o server precisar copiar algo extra)

echo [SUCESSO] Build completo finalizado!
echo Agora voce pode rodar: "cd server && npm start"
pause
