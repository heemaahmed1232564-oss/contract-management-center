$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

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

function Wait-ForDocker {
    Write-Step "Waiting for Docker Desktop to become ready"
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        Invoke-DockerCommand -Arguments @("info") -Quiet
        if ($script:DockerExitCode -eq 0) {
            Write-Host "Docker is ready." -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 3
    }
    return $false
}

function New-RandomValue([int]$Bytes = 36) {
    $buffer = New-Object byte[] $Bytes
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($buffer)
    }
    finally {
        $generator.Dispose()
    }
    return [Convert]::ToBase64String($buffer).Replace("+", "A").Replace("/", "B").Replace("=", "")
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
    $replacement = $Name + '="' + $Value.Replace('"', '\"') + '"'
    $temporaryPath = $Path + ".tmp-" + [Guid]::NewGuid().ToString("N")
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    $reader = [System.IO.File]::OpenText($Path)
    $writer = New-Object System.IO.StreamWriter($temporaryPath, $false, $utf8WithoutBom)
    $found = $false
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith($Name + "=", [StringComparison]::Ordinal)) {
                $writer.WriteLine($replacement)
                $found = $true
            }
            else { $writer.WriteLine($line) }
        }
        if (-not $found) { $writer.WriteLine($replacement) }
    }
    finally {
        $reader.Dispose()
        $writer.Dispose()
    }
    Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
}

function Get-EnvValue([string]$Path, [string]$Name) {
    $prefix = $Name + "="
    $reader = [System.IO.File]::OpenText($Path)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if (-not $line.StartsWith($prefix, [StringComparison]::Ordinal)) { continue }
            $result = $line.Substring($prefix.Length).Trim()
            if ($result.Length -ge 2 -and $result.StartsWith('"') -and $result.EndsWith('"')) {
                $result = $result.Substring(1, $result.Length - 2)
            }
            return $result
        }
        return ""
    }
    finally { $reader.Dispose() }
}

function Repair-OversizedEnvFile([string]$Path) {
    if ((Get-Item -LiteralPath $Path).Length -le 2MB) { return }
    $backupPath = $Path + ".corrupted-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".bak"
    Move-Item -LiteralPath $Path -Destination $backupPath
    Copy-Item -LiteralPath (Join-Path $ProjectRoot ".env.example") -Destination $Path
    Write-Host "An oversized .env file was backed up and rebuilt safely." -ForegroundColor Yellow
    Write-Host "Backup: $backupPath" -ForegroundColor DarkGray
}

function Sync-DatabasePassword([string]$Path) {
    $dbUser = Get-EnvValue $Path "POSTGRES_USER"
    $dbName = Get-EnvValue $Path "POSTGRES_DB"
    $dbPassword = Get-EnvValue $Path "POSTGRES_PASSWORD"
    if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "contract_hub" }
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "contract_hub" }
    if ([string]::IsNullOrWhiteSpace($dbPassword)) {
        throw "POSTGRES_PASSWORD is missing from .env."
    }

    $quotedUser = '"' + $dbUser.Replace('"', '""') + '"'
    $escapedPassword = $dbPassword.Replace("'", "''")
    $sql = "ALTER ROLE $quotedUser WITH PASSWORD '$escapedPassword';"
    Invoke-DockerCommand -Arguments @("compose", "exec", "-T", "db", "psql", "-U", $dbUser, "-d", $dbName, "-v", "ON_ERROR_STOP=1", "-c", $sql)
    if ($script:DockerExitCode -ne 0) {
        throw "The database password could not be synchronized."
    }
}

Write-Host "Contract Management Center - Automatic Windows Setup" -ForegroundColor Green
Write-Host "This window will prepare and run the application for you."

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Write-Step "Requesting Administrator permission"
    Start-Process powershell.exe -Verb RunAs -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", ('"' + $MyInvocation.MyCommand.Path + '"')
    )
    exit
}

Write-Step "Checking WSL"
wsl.exe --status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "WSL is not ready. Windows will install it now." -ForegroundColor Yellow
    wsl.exe --install
    Write-Host ""
    Write-Host "Windows must restart to finish WSL installation." -ForegroundColor Yellow
    Write-Host "Restart the computer, then double-click START-HERE.bat again." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit
}
Write-Host "WSL is ready." -ForegroundColor Green

Write-Step "Checking Docker Desktop"
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCommand) {
    $wingetCommand = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wingetCommand) {
        Write-Host "Windows Package Manager was not found." -ForegroundColor Red
        Start-Process "https://www.docker.com/products/docker-desktop/"
        Write-Host "Install Docker Desktop from the opened page, restart if requested, then run START-HERE.bat again."
        Read-Host "Press Enter to close"
        exit
    }

    Write-Host "Docker Desktop is not installed. Installing it now..." -ForegroundColor Yellow
    winget install --exact --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Desktop installation failed. Run START-HERE.bat again or install Docker Desktop manually."
    }
    $env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
}

Invoke-DockerCommand -Arguments @("info") -Quiet
if ($script:DockerExitCode -ne 0) {
    $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
        Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process $dockerDesktop
    }
    if (-not (Wait-ForDocker)) {
        Write-Host "Docker Desktop did not become ready in time." -ForegroundColor Red
        Write-Host "Open Docker Desktop, accept its first-run terms, wait until it says Running, then run START-HERE.bat again."
        Read-Host "Press Enter to close"
        exit
    }
}
else {
    Write-Host "Docker is ready." -ForegroundColor Green
}

Write-Step "Preparing secure local settings"
$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $envFile
    Write-Host "A new local .env file was created." -ForegroundColor Green
}
else {
    Write-Host "Existing .env settings were preserved." -ForegroundColor Green
}
Repair-OversizedEnvFile $envFile

if ([string]::IsNullOrWhiteSpace((Get-EnvValue $envFile "POSTGRES_PASSWORD"))) {
    Set-EnvValue $envFile "POSTGRES_PASSWORD" (New-RandomValue 32)
}
if ([string]::IsNullOrWhiteSpace((Get-EnvValue $envFile "AUTH_SECRET"))) {
    Set-EnvValue $envFile "AUTH_SECRET" (New-RandomValue 48)
}
if ([string]::IsNullOrWhiteSpace((Get-EnvValue $envFile "GOOGLE_DRIVE_MODE"))) {
    Set-EnvValue $envFile "GOOGLE_DRIVE_MODE" "mock"
}

if (-not (Test-Path (Join-Path $ProjectRoot "runtime\server.js"))) {
    throw "The prebuilt runtime is missing. Extract the complete release ZIP, then run START-HERE.bat again."
}

Write-Step "Downloading the two ready-to-run container images"
Invoke-DockerCommand -Arguments @("compose", "pull")
if ($script:DockerExitCode -ne 0) {
    throw "Docker could not download the ready-to-run images. Check the internet connection and try again."
}

Write-Step "Starting PostgreSQL without Docker BuildKit"
Invoke-DockerCommand -Arguments @("compose", "up", "-d", "--no-build", "db")
if ($script:DockerExitCode -ne 0) {
    throw "The database container could not be started."
}

Write-Step "Synchronizing the database password"
Sync-DatabasePassword $envFile

Write-Step "Starting Contract Management Center from the prebuilt runtime"
Invoke-DockerCommand -Arguments @(
    "compose", "up", "-d", "--no-build", "--force-recreate",
    "--wait", "--wait-timeout", "240", "app"
)
if ($script:DockerExitCode -ne 0) {
    throw "The application did not become healthy. Run docker compose logs app to view the exact error."
}

Write-Step "Checking administrator accounts"
$previousPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    $accountState = @(& docker compose exec -T app node seed-admin.mjs --check 2>&1)
    $accountStateExitCode = $LASTEXITCODE
}
finally { $ErrorActionPreference = $previousPreference }

if ($accountStateExitCode -ne 0) {
    throw "The application could not check the existing accounts."
}

$createInitialAdmin = $accountState -contains "NO_USERS"
if ($createInitialAdmin) {
    do {
        $loginPasswordSecure = Read-Host "Choose the admin login password (at least 12 characters)" -AsSecureString
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($loginPasswordSecure)
        try {
            $loginPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
            $loginPasswordSecure.Dispose()
        }
        if ($loginPassword.Length -lt 12) {
            Write-Host "The password must contain at least 12 characters." -ForegroundColor Yellow
        }
    } while ($loginPassword.Length -lt 12)

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $seedOutput = @($loginPassword | & docker compose exec -T app node seed-admin.mjs 2>&1)
        $seedExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
        $loginPassword = $null
    }
    if ($seedExitCode -ne 0) {
        $details = ($seedOutput | Select-Object -Last 5) -join [Environment]::NewLine
        throw "The initial administrator could not be created.`n$details"
    }
}
else {
    Write-Host "Existing accounts were found and preserved. No password was changed." -ForegroundColor Green
}

Write-Step "Contract Management Center is ready"
Write-Host "Address:  http://localhost:3000" -ForegroundColor Green
if ($createInitialAdmin) {
    Write-Host "Email:    admin@contracthub.local" -ForegroundColor Green
    Write-Host "Password: the password you entered in this window" -ForegroundColor Green
}
else {
    Write-Host "Login with your existing account." -ForegroundColor Green
}
Write-Host ""
if ((Get-EnvValue $envFile "GOOGLE_DRIVE_MODE") -eq "mock") {
    Write-Host "Google Drive is in clearly marked Mock Mode until you run CONNECT-GOOGLE.bat."
}
else {
    Write-Host "The existing Google Drive connection settings were preserved."
}
Start-Process "http://localhost:3000"
Read-Host "Press Enter after the browser opens"
