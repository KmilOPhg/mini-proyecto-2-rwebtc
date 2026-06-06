# Configura proteccion de ramas en GitHub.
# Requisito: gh auth login (cuenta KmilOPhg)
# Uso: .\scripts\setup-branch-protection.ps1

$ErrorActionPreference = "Stop"
$repo = "KmilOPhg/mini-proyecto-2-rwebtc"

Write-Host "Configurando proteccion de rama master..." -ForegroundColor Cyan

gh api "repos/$repo/branches/master/protection" -X PUT `
  -f required_status_checks=null `
  -F enforce_admins=true `
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' `
  -f restrictions='{"users":["KmilOPhg"],"teams":[],"apps":[]}' `
  -f allow_force_pushes=false `
  -f allow_deletions=false

Write-Host "master protegida: solo KmilOPhg puede hacer push directo." -ForegroundColor Green
Write-Host "Colaboradores deben trabajar en dev y abrir PR hacia master." -ForegroundColor Yellow
