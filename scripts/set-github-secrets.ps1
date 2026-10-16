# Zet de Supabase-geheimen als GitHub repository secrets, zodat de database automatisch
# wordt bijgewerkt. Vul eerst .env.local in (kopie van .env.example). Gebruik:
#   powershell -ExecutionPolicy Bypass -File scripts/set-github-secrets.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) { throw ".env.local niet gevonden. Kopieer .env.example naar .env.local en vul het in." }

$values = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$') { $values[$Matches[1]] = $Matches[2] }
}

$names = 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_PROJECT_REF',
         'SUPABASE_SERVICE_ROLE_KEY', 'TRIAGEVE_TEAM_PASSWORD'
$optional = 'VAPID_PRIVATE_KEY', 'BACKUP_PASSPHRASE'
foreach ($n in $names) {
  if (-not $values[$n]) { throw "$n ontbreekt in .env.local" }
  $values[$n] | gh secret set $n -R brennyz/triagEve
  Write-Host "OK  $n"
}
foreach ($n in $optional) {
  if ($values[$n]) {
    $values[$n] | gh secret set $n -R brennyz/triagEve
    Write-Host "OK  $n"
  } else {
    Write-Host "skip $n (niet ingevuld)"
  }
}
Write-Host "Klaar. Start de database-workflow met: gh workflow run supabase.yml -R brennyz/triagEve"
