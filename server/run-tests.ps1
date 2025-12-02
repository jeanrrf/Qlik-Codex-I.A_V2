#!/usr/bin/env pwsh
# Simple test runner script
Set-Location $PSScriptRoot
Write-Host "Running Vitest..." -ForegroundColor Cyan
npx vitest run --reporter=verbose --no-watch
Write-Host "`nTest run completed." -ForegroundColor Green
