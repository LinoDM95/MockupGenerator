#Requires -Version 5.1
# Diese Datei muss im Ordner "local-upscale-agent" liegen (pyproject.toml im selben Verzeichnis).
# Tipp: InstallAndRun.bat doppelklicken - das Fenster bleibt bei Fehlern offen.
# Nur ASCII in Zeichenketten, damit Windows PowerShell 5.1 keine Kodierungsfehler hat.

$ErrorActionPreference = "Stop"

function Wait-Exit {
    param([string]$Message = "Enter druecken zum Schliessen.")
    Write-Host ""
    Read-Host $Message
}

$AgentRoot = $PSScriptRoot
$PyProject = Join-Path $AgentRoot "pyproject.toml"
if (-not (Test-Path $PyProject)) {
    Write-Host "Fehler: pyproject.toml nicht gefunden. Lege InstallAndRun.ps1 in den Ordner local-upscale-agent des Mockup-Generator-Repos." -ForegroundColor Red
    Wait-Exit
    exit 1
}

try {
    $DataDir = Join-Path $env:LOCALAPPDATA "MockupUpscaleAgent"
    $VenvDir = Join-Path $DataDir "venv"
    $VenvPython = Join-Path $VenvDir "Scripts\python.exe"
    $VenvPip = Join-Path $VenvDir "Scripts\pip.exe"

    if (-not (Test-Path $VenvPython)) {
        New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
        $ok = $false
        if (Get-Command py -ErrorAction SilentlyContinue) {
            foreach ($ver in @("3.12", "3.11")) {
                cmd /c "py -$ver -m venv `"$VenvDir`" 2>nul"
                if (Test-Path $VenvPython) { $ok = $true; break }
            }
            if (-not $ok) {
                cmd /c "py -m venv `"$VenvDir`" 2>nul"
                if (Test-Path $VenvPython) { $ok = $true }
            }
        }
        if (-not $ok -and (Get-Command python -ErrorAction SilentlyContinue)) {
            cmd /c "python -m venv `"$VenvDir`""
            if (Test-Path $VenvPython) { $ok = $true }
        }
        if (-not $ok) {
            Write-Host "Python 3.11+ wurde nicht gefunden. Bitte von https://www.python.org installieren (Haken: pip)." -ForegroundColor Red
            Wait-Exit
            exit 1
        }
    }

    Write-Host "Installiere / aktualisiere Paket (PyTorch ggf. separat mit CUDA - siehe README)..." -ForegroundColor Cyan
    & $VenvPip install -U pip setuptools wheel
    if ($LASTEXITCODE -ne 0) { throw "pip install pip/setuptools fehlgeschlagen (Exit $LASTEXITCODE)" }
    & $VenvPip install -e "$AgentRoot"
    if ($LASTEXITCODE -ne 0) { throw "pip install -e fehlgeschlagen (Exit $LASTEXITCODE)" }

    $Entry = Join-Path $VenvDir "Scripts\mockup-local-agent.exe"
    Write-Host "Starte Agent (dieses Fenster offen lassen)..." -ForegroundColor Green
    if (Test-Path $Entry) {
        & $Entry
    } else {
        & $VenvPython -m mockup_local_agent
    }
    $code = $LASTEXITCODE
    if ($null -ne $code -and $code -ne 0) {
        Write-Host "Agent beendet mit Code $code" -ForegroundColor Yellow
        Wait-Exit
    }
} catch {
    Write-Host ""
    Write-Host "FEHLER: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ScriptStackTrace) { Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed }
    Wait-Exit
    exit 1
}
