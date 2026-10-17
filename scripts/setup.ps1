# Een commando voor de eenmalige setup op Windows.
# Vraagt ontbrekende geheimen (gemaskeerd), schrijft .env.local, zet GitHub-secrets
# en wacht tot de database-workflow klaar is.
#   powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

$ErrorActionPreference = 'Stop'
$repo = 'brennyz/triagEve'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.local'
$defaultRef = 'slddtxwbufoadmvdconz'

function Invoke-Gh {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GhArgs)
  & gh @GhArgs
  if ($LASTEXITCODE -ne 0) { throw "gh is gestopt met code $LASTEXITCODE." }
}

function Read-Secret([string]$Prompt) {
  $secure = Read-Host -AsSecureString -Prompt $Prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

& git -C $root config core.hooksPath .githooks
Write-Host 'Git-hook aan: sw.js krijgt bij elke app-commit een nieuwe cache-versie.'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw 'GitHub CLI (gh) ontbreekt. Installeer die en log in met: gh auth login'
}
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Niet ingelogd bij GitHub. Draai eerst: gh auth login' }

$required = @(
  @{ Name = 'SUPABASE_ACCESS_TOKEN'; Prompt = 'Supabase access token (Account, Access Tokens)' },
  @{ Name = 'SUPABASE_DB_PASSWORD'; Prompt = 'Database-wachtwoord van dit project' },
  @{ Name = 'SUPABASE_PROJECT_REF'; Prompt = "Project-ref (Enter = $defaultRef)"; Default = $defaultRef },
  @{ Name = 'SUPABASE_SERVICE_ROLE_KEY'; Prompt = 'Service role key (Project Settings, API Keys, secret)' },
  @{ Name = 'TRIAGEVE_JACKY_PASSWORD'; Prompt = 'Eigen wachtwoord voor Jacky (minstens 8 tekens)' },
  @{ Name = 'TRIAGEVE_PAPS_PASSWORD'; Prompt = 'Eigen wachtwoord voor Paps (minstens 8 tekens)' },
  @{ Name = 'TRIAGEVE_BREN_PASSWORD'; Prompt = 'Eigen wachtwoord voor Bren (minstens 8 tekens)' }
)
$optionalNames = @('VAPID_PRIVATE_KEY', 'VAPID_PUBLIC_KEY', 'BACKUP_PASSPHRASE')

$values = @{}
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$') {
      $values[$Matches[1]] = $Matches[2]
    }
  }
}

foreach ($item in $required) {
  if ($values[$item.Name]) { continue }
  $entered = Read-Secret $item.Prompt
  if (-not $entered -and $item.Default) { $entered = $item.Default }
  if ($item.Name -eq 'SUPABASE_PROJECT_REF' -and $entered -match 'https?://([a-z0-9]+)\.supabase\.co') {
    $entered = $Matches[1]
  }
  if (-not $entered) { throw "$($item.Name) is verplicht." }
  if ($item.Name -like 'TRIAGEVE_*_PASSWORD' -and $entered.Trim().Length -lt 8) {
    throw "$($item.Name) moet minstens 8 tekens zijn."
  }
  if ($entered -match '[\r\n"]') { throw "$($item.Name) mag geen aanhalingstekens of nieuwe regels bevatten." }
  $values[$item.Name] = $entered.Trim()
}

if ($values['SUPABASE_PROJECT_REF'] -notmatch '^[a-z0-9]{10,40}$') {
  throw 'Project-ref ziet er niet goed uit. Verwacht iets als slddtxwbufoadmvdconz.'
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Lokaal. Nooit committen.')
foreach ($item in $required) { $lines.Add("$($item.Name)=$($values[$item.Name])") }
foreach ($name in $optionalNames) {
  if ($values[$name]) { $lines.Add("$name=$($values[$name])") }
}
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envFile, $lines, $utf8)
Write-Host "Geschreven: .env.local"

foreach ($item in $required) {
  $values[$item.Name] | & gh secret set $item.Name -R $repo
  if ($LASTEXITCODE -ne 0) { throw "Secret $($item.Name) zetten is mislukt." }
  Write-Host "OK  $($item.Name)"
}
foreach ($name in $optionalNames) {
  if (-not $values[$name]) { continue }
  $values[$name] | & gh secret set $name -R $repo
  if ($LASTEXITCODE -ne 0) { throw "Secret $name zetten is mislukt." }
  Write-Host "OK  $name"
}

function Get-LatestRunId {
  $raw = & gh run list --workflow supabase.yml -R $repo --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // 0'
  if ($LASTEXITCODE -ne 0 -or -not $raw) { return [int64]0 }
  return [int64]([string]$raw).Trim()
}

# Run-nummers vergelijken in plaats van datums: die hangen af van de taal van Windows.
$before = Get-LatestRunId
Invoke-Gh workflow run supabase.yml -R $repo
Write-Host 'Workflow gestart. Wachten tot de run zichtbaar is...'

$runId = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 3
  $latest = Get-LatestRunId
  if ($latest -gt $before) { $runId = $latest; break }
}
if (-not $runId) { throw 'Geen nieuwe workflow-run gevonden. Kijk bij GitHub Actions.' }

Write-Host "Volg run $runId"
Invoke-Gh run watch $runId -R $repo --exit-status
Write-Host 'Klaar. Open https://brennyz.github.io/triagEve/ en log in met je eigen naam en wachtwoord.'
Write-Host 'Bestaat een account al, dan verandert deze workflow het wachtwoord niet.'
Write-Host 'Wat er daarna nog op de pc openstaat: docs/PC.md'
