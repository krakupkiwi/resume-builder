# dev.ps1 — Start the full dev environment (build from source, hot reload)
# Run from the repo root: .\dev.ps1
#
# Requires:
#   - Docker Desktop (for Redis)
#   - Python 3.12+ in PATH
#   - Node.js 20+ in PATH

param(
    [switch]$SkipInstall,   # Skip pip/npm install
    [switch]$ApiOnly        # Start only API + worker (no frontend)
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# ── Check .env ───────────────────────────────────────────────────────────────
if (-not (Test-Path "$root\.env")) {
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "⚠  Created .env from .env.example — set your ANTHROPIC_API_KEY before continuing." -ForegroundColor Yellow
    Write-Host "   Edit: $root\.env" -ForegroundColor Yellow
    exit 1
}

# Load .env into current session
Get-Content "$root\.env" | Where-Object { $_ -match "^\s*[^#]" -and $_ -match "=" } | ForEach-Object {
    $key, $value = $_ -split "=", 2
    [System.Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
}

# ── Redis ─────────────────────────────────────────────────────────────────────
Write-Host "`n▶ Starting Redis..." -ForegroundColor Cyan
$redisRunning = docker ps --filter "name=resume-redis" --filter "status=running" -q
if (-not $redisRunning) {
    docker run -d --name resume-redis -p 6379:6379 redis:7-alpine | Out-Null
    Write-Host "  Redis started." -ForegroundColor Green
} else {
    Write-Host "  Redis already running." -ForegroundColor Green
}

# ── Backend venv ─────────────────────────────────────────────────────────────
$venv = "$root\backend\.venv"
if (-not (Test-Path $venv)) {
    Write-Host "`n▶ Creating Python venv..." -ForegroundColor Cyan
    python -m venv $venv
}

if (-not $SkipInstall) {
    Write-Host "`n▶ Installing Python dependencies..." -ForegroundColor Cyan
    & "$venv\Scripts\pip" install -r "$root\backend\requirements.txt" -q
}

# ── Frontend deps ─────────────────────────────────────────────────────────────
if (-not $ApiOnly -and -not $SkipInstall) {
    Write-Host "`n▶ Installing Node dependencies..." -ForegroundColor Cyan
    Push-Location "$root\frontend"
    npm install --silent
    Pop-Location
}

# ── Shared env for backend processes ─────────────────────────────────────────
$backendEnv = @{
    DATABASE_URL    = "sqlite:///$root\backend\dev.db"
    REDIS_URL       = "redis://localhost:6379/0"
    STORAGE_PATH    = "$root\backend\dev_files"
    AI_PROVIDER     = $env:AI_PROVIDER ?? "claude"
    ANTHROPIC_API_KEY = $env:ANTHROPIC_API_KEY ?? ""
    OPENAI_API_KEY  = $env:OPENAI_API_KEY ?? ""
    CLAUDE_MODEL    = $env:CLAUDE_MODEL ?? "claude-opus-4-5"
    DEBUG           = "true"
}

# ── Launch processes ──────────────────────────────────────────────────────────
Write-Host "`n▶ Starting services...`n" -ForegroundColor Cyan

# API
$apiArgs = @{
    FilePath         = "powershell"
    ArgumentList     = @(
        "-NoExit", "-Command",
        "cd '$root\backend'; " +
        "& '.venv\Scripts\Activate.ps1'; " +
        ($backendEnv.GetEnumerator() | ForEach-Object { "`$env:$($_.Key)='$($_.Value)'" } | Join-String -Separator "; ") + "; " +
        "uvicorn app.main:app --reload --port 8000"
    )
    WindowStyle      = "Normal"
}
Start-Process @apiArgs

Start-Sleep -Seconds 3   # Give API time to start before worker

# Worker
$workerArgs = @{
    FilePath         = "powershell"
    ArgumentList     = @(
        "-NoExit", "-Command",
        "cd '$root\backend'; " +
        "& '.venv\Scripts\Activate.ps1'; " +
        ($backendEnv.GetEnumerator() | ForEach-Object { "`$env:$($_.Key)='$($_.Value)'" } | Join-String -Separator "; ") + "; " +
        "celery -A app.workers.celery_app worker --loglevel=info --pool=solo"
    )
    WindowStyle      = "Normal"
}
Start-Process @workerArgs

# Frontend
if (-not $ApiOnly) {
    $frontendArgs = @{
        FilePath         = "powershell"
        ArgumentList     = @(
            "-NoExit", "-Command",
            "cd '$root\frontend'; " +
            "`$env:VITE_API_URL='http://localhost:8000'; " +
            "npm run dev"
        )
        WindowStyle      = "Normal"
    }
    Start-Process @frontendArgs
}

Write-Host "✔ All services launched:" -ForegroundColor Green
Write-Host "   Frontend  → http://localhost:5173" -ForegroundColor White
Write-Host "   API       → http://localhost:8000" -ForegroundColor White
Write-Host "   API docs  → http://localhost:8000/docs" -ForegroundColor White
