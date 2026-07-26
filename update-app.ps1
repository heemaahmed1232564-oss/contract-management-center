$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$script:DockerExitCode = 1
function Invoke-DockerCommand {
    param([Parameter(Mandatory = $true)][string[]]$Arguments, [switch]$Quiet)
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        if ($Quiet) { & docker @Arguments 1>$null 2>$null }
        else { & docker @Arguments }
        $script:DockerExitCode = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $previousPreference }
}

Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "  Contract Management Center - Prebuilt application update" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "This installs the prepared runtime without npm or Docker BuildKit."
Write-Host "The database, users, contracts, and Google settings are preserved."
Write-Host ""

if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
    throw "The .env file was not found. Run START-HERE.bat first."
}
if (-not (Test-Path (Join-Path $ProjectRoot "runtime\server.js"))) {
    throw "The prebuilt runtime is missing. Extract the complete release ZIP first."
}

Write-Host "Checking Docker Desktop..." -ForegroundColor Cyan
Invoke-DockerCommand -Arguments @("info") -Quiet
if ($script:DockerExitCode -ne 0) {
    throw "Open Docker Desktop, wait until it says Running, then run UPDATE-APP.bat again."
}

Write-Host "Downloading the ready-to-run Node image if needed..." -ForegroundColor Cyan
Invoke-DockerCommand -Arguments @("compose", "pull", "app")
if ($script:DockerExitCode -ne 0) {
    throw "The application image could not be downloaded."
}

Write-Host "Installing the prebuilt update..." -ForegroundColor Cyan
Invoke-DockerCommand -Arguments @("compose", "up", "-d", "--no-build", "--force-recreate", "--wait", "--wait-timeout", "240", "app")
if ($script:DockerExitCode -ne 0) {
    throw "The application update could not be installed."
}

Write-Host "Update installed successfully." -ForegroundColor Green
Write-Host "Your database, users, contracts, and Google connection were preserved."
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000/contracts"
