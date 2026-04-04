$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $projectRoot "frontend"
$backendPath = Join-Path $projectRoot "backend"

$frontendOut = Join-Path $projectRoot "frontend-dev.out.log"
$frontendErr = Join-Path $projectRoot "frontend-dev.err.log"
$backendOut = Join-Path $projectRoot "backend-dev-8001.out.log"
$backendErr = Join-Path $projectRoot "backend-dev-8001.err.log"

function Test-PortListening {
  param([int]$Port)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connections
}

if (-not (Test-PortListening -Port 3000)) {
  Start-Process -FilePath "pwsh" `
    -ArgumentList "-NoLogo","-NoProfile","-Command","Set-Location '$frontendPath'; npm run dev" `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr | Out-Null
}

if (-not (Test-PortListening -Port 8001)) {
  Start-Process -FilePath "pwsh" `
    -ArgumentList "-NoLogo","-NoProfile","-Command","`$env:PYTHONPATH='$backendPath'; Set-Location '$backendPath'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8001" `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null
}

Write-Host "Frontend: http://127.0.0.1:3000"
Write-Host "Backend:  http://127.0.0.1:8001"
