param([string]$Destination = '.backups')

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $repositoryRoot
try {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $backupName = 'kindergarten-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N') + '.dump'
    $containerFile = '/tmp/' + $backupName
    $destinationFile = Join-Path (Resolve-Path -LiteralPath $Destination).Path $backupName
    & docker compose exec -T postgres pg_dump -U kindergarten -d kindergarten -Fc -f $containerFile
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
    & docker compose cp "postgres:$containerFile" $destinationFile
    if ($LASTEXITCODE -ne 0) { throw 'Copying the database dump failed.' }
    & docker compose exec -T postgres rm -- $containerFile
    if ($LASTEXITCODE -ne 0) { throw 'Removing the temporary container file failed.' }
    Write-Output $destinationFile
} finally {
    Pop-Location
}
