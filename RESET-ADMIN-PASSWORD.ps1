$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

Set-Location -LiteralPath $PSScriptRoot

function Stop-WithMessage {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Red
    exit 1
}

function Get-PlainText {
    param([Parameter(Mandatory = $true)][Security.SecureString]$SecureValue)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "  Contract Management Center - Admin password recovery" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor DarkGreen
Write-Host "This changes one account only and does not delete any data."
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Stop-WithMessage "Docker Desktop is not installed or is not available in PATH."
}

try {
    & cmd.exe /d /c "docker info 1>nul 2>nul"
}
catch {
    Stop-WithMessage "Open Docker Desktop, wait until it is ready, then run this file again."
}

if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Open Docker Desktop, wait until it is ready, then run this file again."
}

$services = @(& docker compose config --services 2>$null)
if ($LASTEXITCODE -ne 0 -or $services.Count -eq 0) {
    Stop-WithMessage "Put these two RESET-ADMIN-PASSWORD files inside the contract-hub folder, beside docker-compose.yml."
}

$appService = @("app", "web") | Where-Object { $services -contains $_ } | Select-Object -First 1
$databaseService = @("db", "postgres", "database") | Where-Object { $services -contains $_ } | Select-Object -First 1

if (-not $appService -or -not $databaseService) {
    Stop-WithMessage "The app or database service was not found in docker-compose.yml."
}

Write-Host "Starting the application database..." -ForegroundColor Cyan
& docker compose up -d $databaseService $appService
if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Docker could not start the application. Run START-HERE.bat, then try again."
}

$ready = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
    $running = @(& docker compose ps --status running --services 2>$null)
    if (($running -contains $databaseService) -and ($running -contains $appService)) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Stop-WithMessage "The application containers did not become ready. Run START-HERE.bat and try again."
}

$databaseCommand = 'psql -U "${POSTGRES_USER:-contract_hub}" -d "${POSTGRES_DB:-contract_hub}" -v ON_ERROR_STOP=1'
$databaseListCommand = 'psql -U "${POSTGRES_USER:-contract_hub}" -d "${POSTGRES_DB:-contract_hub}" -At -v ON_ERROR_STOP=1'
$listAccountsSql = @'
SELECT format('SELECT email FROM %I ORDER BY email', c.table_name)
  FROM information_schema.columns c
 WHERE c.table_schema = 'public'
   AND c.column_name IN ('password_hash', 'passwordHash')
   AND EXISTS (
       SELECT 1
         FROM information_schema.columns e
        WHERE e.table_schema = c.table_schema
          AND e.table_name = c.table_name
          AND e.column_name = 'email'
   )
 ORDER BY CASE WHEN c.table_name = 'users' THEN 0 ELSE 1 END
 LIMIT 1
\gexec
'@

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$accountOutput = @($listAccountsSql | & docker compose exec -T $databaseService sh -lc $databaseListCommand 2>&1)
$accountExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($accountExitCode -ne 0) {
    $details = ($accountOutput | Select-Object -Last 4) -join [Environment]::NewLine
    Stop-WithMessage "The application accounts could not be read.`n$details"
}

$accounts = @(
    $accountOutput |
        ForEach-Object { $_.ToString().Trim() } |
        Where-Object { $_ -match '^[^\s@]+@[^\s@]+$' } |
        Sort-Object -Unique
)

$creatingFirstAdmin = $accounts.Count -eq 0

if ($creatingFirstAdmin) {
    Write-Host ""
    Write-Host "No accounts exist. This tool will create the first administrator safely." -ForegroundColor Yellow
    $email = (Read-Host "New administrator email").Trim().ToLowerInvariant()
}
else {
    Write-Host ""
    Write-Host "Accounts found in the database:" -ForegroundColor Green
    for ($index = 0; $index -lt $accounts.Count; $index++) {
        Write-Host ("  [{0}] {1}" -f ($index + 1), $accounts[$index]) -ForegroundColor Yellow
    }
    Write-Host ""

    $accountChoice = (Read-Host "Choose the account number or type its exact email").Trim()
    if ($accountChoice -match '^\d+$') {
        $selectedIndex = [int]$accountChoice - 1
        if ($selectedIndex -lt 0 -or $selectedIndex -ge $accounts.Count) {
            Stop-WithMessage "Choose a number from the displayed account list."
        }
        $email = $accounts[$selectedIndex].ToLowerInvariant()
    }
    else {
        $email = $accountChoice.ToLowerInvariant()
    }
}

if ([string]::IsNullOrWhiteSpace($email)) {
    Stop-WithMessage "Email is required."
}

try {
    $mailAddress = [System.Net.Mail.MailAddress]::new($email)
    if ($mailAddress.Address.ToLowerInvariant() -ne $email) {
        throw "Invalid email"
    }
}
catch {
    Stop-WithMessage "Enter a valid email address."
}

$securePassword = Read-Host "New password (8 characters or more)" -AsSecureString
$secureConfirmation = Read-Host "Confirm the new password" -AsSecureString
$password = Get-PlainText -SecureValue $securePassword
$confirmation = Get-PlainText -SecureValue $secureConfirmation

if ($password.Length -lt 8) {
    $password = $null
    $confirmation = $null
    Stop-WithMessage "The password must contain at least 8 characters."
}

if (-not [string]::Equals($password, $confirmation, [StringComparison]::Ordinal)) {
    $password = $null
    $confirmation = $null
    Stop-WithMessage "The two passwords do not match."
}

Write-Host "Securing and updating the account..." -ForegroundColor Cyan
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$hashOutput = @($password | & docker compose exec -T $appService node /app/reset-password-hash.cjs 2>&1)
$hashExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
$password = $null
$confirmation = $null
$securePassword.Dispose()
$secureConfirmation.Dispose()

$passwordHash = $hashOutput | Where-Object { $_ -match '^\$2[abxy]\$\d{2}\$' } | Select-Object -Last 1
if ($hashExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($passwordHash)) {
    $details = ($hashOutput | Select-Object -Last 4) -join [Environment]::NewLine
    Stop-WithMessage "The application could not create a secure password hash.`n$details"
}

$safeEmail = $email.Replace("'", "''")
$safeHash = $passwordHash.Replace("'", "''")

$sql = @"
DO `$reset`$
DECLARE
    target_table text;
    password_column text;
    active_column text;
    session_column text;
    id_column text;
    name_column text;
    role_column text;
    created_column text;
    updated_column text;
    column_list text;
    value_list text;
    update_sql text;
    affected_rows integer;
    account_count integer;
BEGIN
    SELECT c.table_name, c.column_name
      INTO target_table, password_column
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.column_name IN ('password_hash', 'passwordHash')
       AND EXISTS (
           SELECT 1
             FROM information_schema.columns e
            WHERE e.table_schema = c.table_schema
              AND e.table_name = c.table_name
              AND e.column_name = 'email'
       )
     ORDER BY CASE WHEN c.table_name = 'users' THEN 0 ELSE 1 END
     LIMIT 1;

    IF target_table IS NULL THEN
        RAISE EXCEPTION 'The users table was not found. Run START-HERE.bat to apply the database migrations.';
    END IF;

    SELECT c.column_name
      INTO active_column
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = target_table
       AND c.column_name IN ('is_active', 'isActive')
     LIMIT 1;

    SELECT c.column_name
      INTO session_column
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = target_table
       AND c.column_name IN ('session_version', 'sessionVersion')
     LIMIT 1;

    update_sql := format('UPDATE %I SET %I = `$1', target_table, password_column);
    IF active_column IS NOT NULL THEN
        update_sql := update_sql || format(', %I = TRUE', active_column);
    END IF;
    IF session_column IS NOT NULL THEN
        update_sql := update_sql || format(', %I = COALESCE(%I, 0) + 1', session_column, session_column);
    END IF;
    update_sql := update_sql || ' WHERE LOWER(email) = LOWER(`$2)';

    EXECUTE update_sql USING '$safeHash', '$safeEmail';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        EXECUTE format('SELECT COUNT(*) FROM %I', target_table) INTO account_count;

        IF account_count > 0 THEN
            RAISE EXCEPTION 'No account exists with that email address.';
        END IF;

        SELECT c.column_name INTO id_column
          FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = target_table
           AND c.column_name = 'id'
         LIMIT 1;

        SELECT c.column_name INTO name_column
          FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = target_table
           AND c.column_name IN ('display_name', 'displayName', 'name')
         ORDER BY CASE c.column_name WHEN 'display_name' THEN 0 WHEN 'displayName' THEN 1 ELSE 2 END
         LIMIT 1;

        SELECT c.column_name INTO role_column
          FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = target_table
           AND c.column_name = 'role'
         LIMIT 1;

        SELECT c.column_name INTO created_column
          FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = target_table
           AND c.column_name IN ('created_at', 'createdAt')
         LIMIT 1;

        SELECT c.column_name INTO updated_column
          FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = target_table
           AND c.column_name IN ('updated_at', 'updatedAt')
         LIMIT 1;

        column_list := format('%I, %I', 'email', password_column);
        value_list := format('%L, %L', '$safeEmail', '$safeHash');

        IF id_column IS NOT NULL THEN
            column_list := column_list || format(', %I', id_column);
            value_list := value_list || format(', %L', 'c' || substring(md5(random()::text || clock_timestamp()::text), 1, 24));
        END IF;
        IF name_column IS NOT NULL THEN
            column_list := column_list || format(', %I', name_column);
            value_list := value_list || format(', %L', 'System Administrator');
        END IF;
        IF role_column IS NOT NULL THEN
            column_list := column_list || format(', %I', role_column);
            value_list := value_list || format(', %L', 'ADMIN');
        END IF;
        IF active_column IS NOT NULL THEN
            column_list := column_list || format(', %I', active_column);
            value_list := value_list || ', TRUE';
        END IF;
        IF session_column IS NOT NULL THEN
            column_list := column_list || format(', %I', session_column);
            value_list := value_list || ', 1';
        END IF;
        IF created_column IS NOT NULL THEN
            column_list := column_list || format(', %I', created_column);
            value_list := value_list || ', CURRENT_TIMESTAMP';
        END IF;
        IF updated_column IS NOT NULL AND updated_column IS DISTINCT FROM created_column THEN
            column_list := column_list || format(', %I', updated_column);
            value_list := value_list || ', CURRENT_TIMESTAMP';
        END IF;

        EXECUTE format('INSERT INTO %I (%s) VALUES (%s)', target_table, column_list, value_list);
    END IF;
END
`$reset`$;
SELECT 'RESET_OK' AS result;
"@

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$databaseOutput = @($sql | & docker compose exec -T $databaseService sh -lc $databaseCommand 2>&1)
$databaseExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($databaseExitCode -ne 0 -or -not ($databaseOutput -match 'RESET_OK')) {
    $details = ($databaseOutput | Select-Object -Last 4) -join [Environment]::NewLine
    Stop-WithMessage "The password was not changed.`n$details"
}

Write-Host ""
if ($creatingFirstAdmin) {
    Write-Host "The first administrator account was created successfully." -ForegroundColor Green
}
else {
    Write-Host "Password changed and the account was activated successfully." -ForegroundColor Green
    Write-Host "Old sessions were signed out for security." -ForegroundColor Green
}
Write-Host "Open http://localhost:3000 and sign in with:" -ForegroundColor White
Write-Host "  $email" -ForegroundColor Yellow
exit 0
