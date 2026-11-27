# Runs every automated check that exists. Stops at the first failure.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root 'apps/api/.venv/Scripts/python.exe'

Write-Host "== Contrast tokens ==" -ForegroundColor Cyan
& $py (Join-Path $root 'scripts/check-contrast.py'); if ($LASTEXITCODE) { exit $LASTEXITCODE }

Write-Host "`n== Backend (pytest) ==" -ForegroundColor Cyan
Push-Location (Join-Path $root 'apps/api'); & $py -m pytest; $code = $LASTEXITCODE; Pop-Location
if ($code) { exit $code }

Write-Host "`n== Frontend (typecheck, lint) ==" -ForegroundColor Cyan
Push-Location (Join-Path $root 'apps/web')
pnpm typecheck; if ($LASTEXITCODE) { Pop-Location; exit $LASTEXITCODE }
pnpm lint;      if ($LASTEXITCODE) { Pop-Location; exit $LASTEXITCODE }
Write-Host "`n(E2E: run 'pnpm test:e2e' in apps/web; Playwright browsers need 'pnpm exec playwright install chromium' once.)"
Pop-Location
