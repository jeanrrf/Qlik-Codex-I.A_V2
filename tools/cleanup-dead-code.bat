@echo off
REM ============================================================
REM CLEAN BASE POWER - Maintenance Script (UPDATED 2025-12-01)
REM Purpose: Verificar e documentar estado do cleanup
REM ============================================================

echo.
echo [CLEAN BASE POWER] Verificando estado do projeto...
echo.

set found_issues=0

REM Verificar se auth files ainda existem (devem estar deletados)
if exist "server\src\services\authService.ts" (
    echo [!] AVISO: server\src\services\authService.ts ainda existe
    set /a found_issues+=1
) else (
    echo [OK] Auth service removido
)

if exist "server\src\routes\auth.routes.ts" (
    echo [!] AVISO: server\src\routes\auth.routes.ts ainda existe
    set /a found_issues+=1
) else (
    echo [OK] Auth routes removido
)

if exist "server\src\middleware\authMiddleware.ts" (
    echo [!] AVISO: server\src\middleware\authMiddleware.ts ainda existe
    set /a found_issues+=1
) else (
    echo [OK] Auth middleware removido
)

REM Delete root-level nvidiaService.js (duplicate)
if exist "nvidiaService.js" (
    echo [4/5] Removing nvidiaService.js (duplicate - proper version in server/src/lib/llmProviders)
    del /q "nvidiaService.js"
    if %ERRORLEVEL% EQU 0 (
        echo       [OK] Deleted
    ) else (
        echo       [ERROR] Failed to delete
        set /a error_count+=1
    )
) else (
    echo [4/5] nvidiaService.js - not found (already deleted?)
)

REM Delete backup hook file
if exist "web\src\hooks\useOptimizationProgress.ts.backup" (
    echo [5/5] Removing web\src\hooks\useOptimizationProgress.ts.backup
    del /q "web\src\hooks\useOptimizationProgress.ts.backup"
    if %ERRORLEVEL% EQU 0 (
        echo       [OK] Deleted
    ) else (
        echo       [ERROR] Failed to delete
        set /a error_count+=1
    )
) else (
    echo [5/5] web\src\hooks\useOptimizationProgress.ts.backup - not found (already deleted?)
)

echo.
echo ============================================================
echo RESULTS:
echo ============================================================

if %error_count% EQU 0 (
    echo [SUCCESS] All dead code files removed!
    echo.
    echo Next steps:
    echo   1. cd server
    echo   2. npm run lint
    echo   3. npm run build
    echo   4. npm run test
    echo.
    echo See: .github\CLEANUP_MANIFEST.md for details
    pause
    exit /b 0
) else (
    echo [WARNING] %error_count% file(s) could not be deleted
    pause
    exit /b 1
)
