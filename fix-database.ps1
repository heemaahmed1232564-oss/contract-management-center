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

function Get-EnvValue([string]$Path, [string]$Name) {
    $content = Get-Content -Raw -Path $Path
    $pattern = "(?m)^" + [Regex]::Escape($Name) + '="?(.*?)"?$'
    $match = [Regex]::Match($content, $pattern)
    if (-not $match.Success) { return "" }
    return $match.Groups[1].Value.Trim()
}

Write-Host "Contract Hub - Repair Database Connection" -ForegroundColor Green
$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
    throw "The .env file was not found. Run START-HERE.bat first."
}

Invoke-DockerCommand -Arguments @("info") -Quiet
if ($script:DockerExitCode -ne 0) {
    throw "Open Docker Desktop and wait until it says Running, then try again."
}

$dbUser = Get-EnvValue $envFile "POSTGRES_USER"
$dbName = Get-EnvValue $envFile "POSTGRES_DB"
$dbPassword = Get-EnvValue $envFile "POSTGRES_PASSWORD"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "contract_hub" }
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "contract_hub" }
if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    throw "POSTGRES_PASSWORD is missing from .env."
}

Write-Host "Starting the database..." -ForegroundColor Cyan
Invoke-DockerCommand -Arguments @("compose", "up", "-d", "--no-build", "db")
if ($script:DockerExitCode -ne 0) { throw "The database container could not be started." }

$quotedUser = '"' + $dbUser.Replace('"', '""') + '"'
$escapedPassword = $dbPassword.Replace("'", "''")
$sql = "ALTER ROLE $quotedUser WITH PASSWORD '$escapedPassword';"
Invoke-DockerCommand -Arguments @("compose", "exec", "-T", "db", "psql", "-U", $dbUser, "-d", $dbName, "-v", "ON_ERROR_STOP=1", "-c", $sql)
if ($script:DockerExitCode -ne 0) { throw "The database password could not be repaired." }

Write-Host "Restarting Contract Hub..." -ForegroundColor Cyan
Invoke-DockerCommand -Arguments @("compose", "up", "-d", "--no-build", "--force-recreate", "app")
if ($script:DockerExitCode -ne 0) { throw "The application could not be started." }
Invoke-DockerCommand -Arguments @("compose", "restart", "app") -Quiet
if ($script:DockerExitCode -ne 0) { throw "The application could not be restarted." }

Write-Host "Database connection repaired successfully." -ForegroundColor Green
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"
Read-Host "Press Enter after the browser opens"
