# One-time setup for PixelProof on Windows (PowerShell 5.1+ / 7+).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Require($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "'$cmd' not found. $hint" }
}
Require node   'Install Node.js LTS from https://nodejs.org'
Require python 'Install Python 3.11+ from https://python.org (tick "Add to PATH")'
Require git    'Install Git from https://git-scm.com'
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "pnpm not found; enabling via corepack..."
  corepack enable
  corepack prepare pnpm@latest --activate
}

Write-Host "`n== Backend ==" -ForegroundColor Cyan
Push-Location (Join-Path $root 'apps/api')
if (-not (Test-Path '.venv')) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
if (-not (Test-Path '.env') -and (Test-Path '.env.example')) { Copy-Item .env.example .env }
Pop-Location

Write-Host "`n== Frontend ==" -ForegroundColor Cyan
Push-Location (Join-Path $root 'apps/web')
pnpm install
if (-not (Test-Path '.env.local') -and (Test-Path '.env.example')) { Copy-Item .env.example .env.local }
Pop-Location

Write-Host "`nSetup complete. Start both servers with: scripts\dev.ps1" -ForegroundColor Green
