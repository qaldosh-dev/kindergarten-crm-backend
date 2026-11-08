param(
    [Parameter(Mandatory = $true)][ValidateSet('codex', 'agy')][string]$Provider,
    [Parameter(Mandatory = $true)][string]$Workspace,
    [Parameter(Mandatory = $true)][string]$PromptFile,
    [string]$Model,
    [string]$SessionId
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
Set-Location -LiteralPath $Workspace
$taskPrompt = [System.IO.File]::ReadAllText($PromptFile, [System.Text.Encoding]::UTF8)
$modelArguments = @()
if ($Model) { $modelArguments = @('--model', $Model) }

if ($Provider -eq 'codex') {
    if ($SessionId) {
        $taskPrompt | & codex.cmd exec --sandbox workspace-write --approve-for-me --color never --json @modelArguments resume $SessionId -
    } else {
        $taskPrompt | & codex.cmd exec --sandbox workspace-write --approve-for-me --color never --json @modelArguments -
    }
} else {
    $message = @{ event = 'user'; message = @{ content = $taskPrompt } } | ConvertTo-Json -Compress -Depth 5
    $message | & agy --input-format stream-json --output-format stream-json --mode accept-edits --sandbox --print-timeout 0s @modelArguments
}

exit $LASTEXITCODE
