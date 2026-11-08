param(
    [Parameter(Mandatory = $true)][ValidateSet('codex', 'agy')][string]$Provider,
    [Parameter(Mandatory = $true)][string]$Workspace,
    [Parameter(Mandatory = $true)][string]$PromptFile
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
Set-Location -LiteralPath $Workspace
$taskPrompt = Get-Content -LiteralPath $PromptFile -Raw -Encoding UTF8

if ($Provider -eq 'codex') {
    $taskPrompt | & codex.cmd exec --sandbox workspace-write --color never --json -
} else {
    & agy -p $taskPrompt --output-format json --mode auto --sandbox --print-timeout 15m
}

exit $LASTEXITCODE
