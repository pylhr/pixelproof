# Starts the FastAPI backend (127.0.0.1:8000) and the Next.js frontend (localhost:3000).
# Ctrl+C stops both.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root 'apps/api/.venv/Scripts/python.exe'
if (-not (Test-Path $py)) { throw "Backend venv missing. Run scripts\setup.ps1 first." }

$api = Start-Process -FilePath $py `
  -ArgumentList '-m', 'uvicorn', 'pixelproof.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000' `
  -WorkingDirectory (Join-Path $root 'apps/api') -PassThru -NoNewWindow

try {
  Push-Location (Join-Path $root 'apps/web')
  pnpm dev
}
finally {
  Pop-Location
  # /T kills the uvicorn reloader's child processes too.
  if ($api -and -not $api.HasExited) { & taskkill /PID $api.Id /T /F | Out-Null }
}
