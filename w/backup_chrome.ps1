$ErrorActionPreference = "Stop"

$Source = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$DestDir = "$PSScriptRoot\ChromeDataBackup"
$ZipFile = "$PSScriptRoot\chrome_backup.zip"

Write-Host "Checking if Chrome is currently running..." -ForegroundColor Cyan
if (Get-Process chrome -ErrorAction SilentlyContinue) {
    Write-Host "WARNING: Google Chrome is currently running." -ForegroundColor Yellow
    Write-Host "Please close Chrome completely before proceeding to ensure data consistency." -ForegroundColor Yellow
    $response = Read-Host "Process detected. Do you want me to kill chrome processes? (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Name chrome -Force
        Start-Sleep -Seconds 2
    }
    else {
        Write-Error "Cannot backup while Chrome is running."
    }
}

if (-not (Test-Path $Source)) {
    Write-Error "Chrome User Data folder not found at: $Source"
}

# Cleanup previous runs
if (Test-Path $DestDir) { Remove-Item $DestDir -Recurse -Force }
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }

Write-Host "Creating backup directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $DestDir | Out-Null

Write-Host "Copying Chrome Profile request... (This may take a while)" -ForegroundColor Cyan

# Exclude typically large/unnecessary cache folders to save space
$Exclude = @(
    "Cache",
    "Code Cache",
    "GPUCache",
    "ShaderCache",
    "Service Worker\CacheStorage",
    "Service Worker\ScriptCache"
)

$RoboArgs = @($Source, $DestDir, "/E", "/COPY:DAT")
foreach ($ex in $Exclude) {
    $RoboArgs += "/XD"
    $RoboArgs += "*$ex"
}

# Add retry
$RoboArgs += "/R:1"
$RoboArgs += "/W:1"

Write-Host "Copying files using PowerShell Copy-Item..." -ForegroundColor Cyan

# Recursive copy with basic exclusion
# Custom function to copy with exclusion is complex, so we will Copy All, then Delete Cache.
# This assumes we have space.
# Alternative: Get-ChildItem and recurse.

# Simple approach: Copy everything, then delete cache.
Copy-Item -Path $Source -Destination $DestDir -Recurse -Force -ErrorAction Stop

Write-Host "Cleaning up cache files..." -ForegroundColor Cyan
foreach ($ex in $Exclude) {
    # $ex are relative paths like "Cache", "Service Worker\ScriptCache"
    $CleanupPath = Join-Path $DestDir $ex
    if (Test-Path $CleanupPath) {
        Remove-Item $CleanupPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# --- SECRETS HANDLING ---
$SecretsDir = "$DestDir\Secrets"
New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null

$PasswordFile = "$PSScriptRoot\passwords.csv"
$CookieFiles = @("$PSScriptRoot\cookies.json", "$PSScriptRoot\cookies.txt")
$RestoreScript = "$PSScriptRoot\restore.sh"

if (Test-Path $RestoreScript) {
    Write-Host "Including Linux restore script..." -ForegroundColor Cyan
    Copy-Item $RestoreScript -Destination $DestDir
}

$FoundCookies = $null

Write-Host "`n--- CHECKING FOR EXPORTED SECRETS ---" -ForegroundColor Cyan
if (Test-Path $PasswordFile) {
    Write-Host "[OK] Found passwords.csv" -ForegroundColor Green
    Copy-Item $PasswordFile -Destination $SecretsDir
}
else {
    Write-Host "[MISSING] passwords.csv not found in script directory." -ForegroundColor Red
    Write-Host "Without this, you will LOSE ALL PASSWORDS on Linux." -ForegroundColor Yellow
    $resp = Read-Host "Do you want to continue anyway? (y/n)"
    if ($resp -ne 'y') { Write-Error "Aborted by user to export passwords." }
}

foreach ($cf in $CookieFiles) {
    if (Test-Path $cf) {
        Write-Host "[OK] Found cookie file: $(Split-Path $cf -Leaf)" -ForegroundColor Green
        Copy-Item $cf -Destination $SecretsDir
        $FoundCookies = $true
        break
    }
}

if (-not $FoundCookies) {
    Write-Host "[MISSING] No cookies.json or cookies.txt found." -ForegroundColor Red
    Write-Host "Without cookies, you will be logged out of all websites." -ForegroundColor Yellow
    $resp = Read-Host "Do you want to continue anyway? (y/n)"
    if ($resp -ne 'y') { Write-Error "Aborted by user to export cookies." }
}
# ------------------------

Write-Host "Zipping backup..." -ForegroundColor Cyan
Compress-Archive -Path "$DestDir\*" -DestinationPath $ZipFile -Force

Write-Host "Backup Complete!" -ForegroundColor Green
Write-Host "Backup File: $ZipFile"
Write-Host "This zip contains your Profile AND your exported secrets."
Write-Host "Keep it safe!" -ForegroundColor Yellow
