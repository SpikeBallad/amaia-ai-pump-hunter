function Stop-PortProcess {
  param([int]$Port)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($connections) {
    $connections |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object {
        try {
          Stop-Process -Id $_ -Force -ErrorAction Stop
        } catch {
          Write-Host "No se pudo detener el proceso en puerto $Port (PID $_)."
        }
      }
  }
}

Stop-PortProcess -Port 3000
Stop-PortProcess -Port 5173
Stop-PortProcess -Port 8001

Write-Host "Servicios detenidos en puertos 3000, 5173 y 8001."
