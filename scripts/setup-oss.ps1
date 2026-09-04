# Clone open-source KYC/AML into ./services/ and wire env for ChainLancer
$root = Split-Path $PSScriptRoot -Parent
$services = Join-Path $root "services"
New-Item -ItemType Directory -Force -Path $services | Out-Null

$kycDir = Join-Path $services "simple-kyc-oss"
if (-not (Test-Path (Join-Path $kycDir ".git"))) {
  Write-Host "Cloning simple-kyc-oss into services/..."
  git clone --depth 1 https://github.com/p2pdotme/simple-kyc-oss $kycDir
} else {
  Write-Host "simple-kyc-oss already at services/simple-kyc-oss"
}

$yenteDir = Join-Path $services "yente"
if (-not (Test-Path (Join-Path $yenteDir ".git"))) {
  Write-Host "Cloning yente into services/ (reference + optional local run)..."
  git clone --depth 1 https://github.com/opensanctions/yente $yenteDir
} else {
  Write-Host "yente already at services/yente"
}

$envFile = Join-Path $root ".env"
$ossBlock = @"

# --- Open-source KYC/AML (services/ folder) ---
DEMO_MODE=false
KYC_PROVIDER=simple-kyc
SIMPLE_KYC_BASE_URL=http://localhost:8080
SIMPLE_KYC_API_KEY=chainlancer-dev-kyc-key
SIMPLE_KYC_TENANT=chainlancer
SIMPLE_KYC_REDIRECT_URI=http://localhost:3000/kyc-callback.html
AML_PROVIDER=yente
YENTE_BASE_URL=http://localhost:8001
"@

if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  if ($content -notmatch "KYC_PROVIDER=") {
    Add-Content $envFile $ossBlock
    Write-Host "Added OSS env vars to .env"
  } else {
    Write-Host ".env already has KYC_PROVIDER — edit manually if needed"
  }
} else {
  Copy-Item (Join-Path $root ".env.example") $envFile
  Add-Content $envFile $ossBlock
  Write-Host "Created .env from .env.example + OSS vars"
}

Write-Host ""
Write-Host "=== START REAL OSS STACK ==="
Write-Host "  docker compose -f docker-compose.oss.yml up --build"
Write-Host ""
Write-Host "  Then bootstrap tenant (once API is up):"
Write-Host "  npm run oss:init"
Write-Host ""
Write-Host "  ChainLancer:"
Write-Host "  npm run dev"
