@echo off
"C:\Program Files\Python313\python.exe" "%~dp0codex_menu.py" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Pressione qualquer tecla para sair...
    pause >nul
)
