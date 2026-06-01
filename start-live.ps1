$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 3737

Set-Location $root

Write-Host "Stopping any existing server on port $port..."
$listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique)

foreach ($procId in $listeners) {
  if ($procId -and $procId -ne $PID) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Seconds 1

Write-Host "Building production client..."
npm run build

Write-Host "Starting Quran Broadcast server..."
$serverCommand = "cd /d `"$root`"; npm run server"
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $serverCommand

Write-Host "Waiting for server..."
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$port/api/playback/state" -TimeoutSec 2 | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $ready) {
  throw "Server did not become ready on http://localhost:$port"
}

Write-Host "Opening OBS scene and control page..."
Start-Process "http://localhost:$port/?mode=obs"
Start-Process "http://localhost:$port/control"

Write-Host ""
Write-Host "Live broadcast is running:"
Write-Host "  OBS scene: http://localhost:$port/?mode=obs"
Write-Host "  Control:   http://localhost:$port/control"
