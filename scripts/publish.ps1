param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step($text) {
  Write-Host ""
  Write-Host "==> $text" -ForegroundColor Cyan
}

function Invoke-Git($arguments) {
  & git @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($arguments -join ' ')"
  }
}

Write-Step "Checking project status"
Invoke-Git @("rev-parse", "--is-inside-work-tree") *> $null

$changes = git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw "Unable to read Git status."
}

if (-not $changes) {
  Write-Host "No local changes to publish." -ForegroundColor Green
  exit 0
}

if (-not $Message) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "Publish expense assistant update $stamp"
}

Write-Step "Preparing files"
Invoke-Git @("add", ".")

Write-Step "Creating commit"
Invoke-Git @("commit", "-m", $Message)

Write-Step "Pushing to GitHub"
Invoke-Git @("push")

Write-Step "Done"
Write-Host "GitHub has been updated. Vercel should start deployment automatically." -ForegroundColor Green
