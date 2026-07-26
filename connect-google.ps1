$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

$script:DockerExitCode = 1
function Invoke-DockerCommand {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$Quiet
    )

    # Ignore harmless stderr from broken optional Docker CLI plugins such as
    # docker-scout, while still checking Docker's real process exit code.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        if ($Quiet) { & docker @Arguments 1>$null 2>$null }
        else { & docker @Arguments }
        $script:DockerExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
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
            else {
                $writer.WriteLine($line)
            }
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
    $maxNormalEnvBytes = 2MB
    if ((Get-Item -LiteralPath $Path).Length -le $maxNormalEnvBytes) { return }

    $backupPath = $Path + ".corrupted-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".bak"
    Move-Item -LiteralPath $Path -Destination $backupPath
    Copy-Item -LiteralPath (Join-Path $ProjectRoot ".env.example") -Destination $Path
    Set-EnvValue $Path "POSTGRES_PASSWORD" (New-RandomValue 32)
    Set-EnvValue $Path "AUTH_SECRET" (New-RandomValue 48)
    Write-Host "The oversized .env file was backed up and rebuilt safely." -ForegroundColor Yellow
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

Write-Host "Contract Hub - Connect Personal Google Drive" -ForegroundColor Green
Write-Host "Your Google secret stays on this computer and is never uploaded by this script."

$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "The application is not set up yet. Run START-HERE.bat first." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}
Repair-OversizedEnvFile $envFile

Write-Step "Choose the OAuth Client JSON downloaded from Google Cloud"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "Choose the Google OAuth Client JSON file"
$dialog.Filter = "Google OAuth JSON (*.json)|*.json"
$dialog.InitialDirectory = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-Host "No file was selected. Nothing was changed." -ForegroundColor Yellow
    exit
}

try {
    $oauthJson = Get-Content -Raw -Encoding UTF8 -Path $dialog.FileName | ConvertFrom-Json
    if (-not $oauthJson.web.client_id -or -not $oauthJson.web.client_secret) {
        throw "This is not a Web application OAuth Client JSON file."
    }
    $requiredRedirect = "http://localhost:3000/api/admin/google-drive/callback"
    if ($oauthJson.web.redirect_uris -notcontains $requiredRedirect) {
        throw "The OAuth client does not contain the required redirect URI: $requiredRedirect"
    }
}
catch {
    Write-Host "The selected file is not the correct OAuth Web Client JSON." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Create an OAuth Client ID of type Web application, then download its JSON."
    Read-Host "Press Enter to close"
    exit 1
}

Write-Step "Saving encrypted local connection settings"
Set-EnvValue $envFile "GOOGLE_DRIVE_MODE" "oauth"
Set-EnvValue $envFile "GOOGLE_DRIVE_OAUTH_CLIENT_ID" $oauthJson.web.client_id
Set-EnvValue $envFile "GOOGLE_DRIVE_OAUTH_CLIENT_SECRET" $oauthJson.web.client_secret
Set-EnvValue $envFile "GOOGLE_DRIVE_OAUTH_REDIRECT_URI" $requiredRedirect
if ([string]::IsNullOrWhiteSpace((Get-EnvValue $envFile "GOOGLE_TOKEN_ENCRYPTION_KEY"))) {
    Set-EnvValue $envFile "GOOGLE_TOKEN_ENCRYPTION_KEY" (New-RandomValue 48)
}

Write-Step "Restarting Contract Management Center with personal Google Drive support"
Invoke-DockerCommand -Arguments @("info") -Quiet
if ($script:DockerExitCode -ne 0) {
    Write-Host "Open Docker Desktop and wait until it says Running, then run CONNECT-GOOGLE.bat again." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

if (-not (Test-Path (Join-Path $ProjectRoot "runtime\server.js"))) {
    throw "The prebuilt runtime is missing. Extract the complete release ZIP first."
}

Invoke-DockerCommand -Arguments @("compose", "up", "-d", "--no-build", "--force-recreate", "app")
if ($script:DockerExitCode -ne 0) {
    throw "The application could not be restarted."
}

Write-Step "Synchronizing the existing database password"
Sync-DatabasePassword $envFile
Invoke-DockerCommand -Arguments @("compose", "restart", "app") -Quiet
if ($script:DockerExitCode -ne 0) {
    throw "The application could not be restarted after database synchronization."
}

Write-Step "Google OAuth settings are ready"
Write-Host "The browser will open the admin page." -ForegroundColor Green
Write-Host "Click: Connect Google Drive, then approve access with your Google account."
Start-Process "http://localhost:3000/admin"
Read-Host "Press Enter after the browser opens"
