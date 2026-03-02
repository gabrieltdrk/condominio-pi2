# deploy.ps1 — Build, push e atualiza a VM automaticamente
# Uso:
#   .\deploy.ps1          -> deploya backend e web
#   .\deploy.ps1 backend  -> apenas backend
#   .\deploy.ps1 web      -> apenas web

param(
    [string]$Target = "all"
)

$IMAGE    = "gabrieltdrk/condominio-pi2"
$VM_IP    = "20.115.27.24"
$VM_USER  = "azureuser"
$API_URL  = "http://${VM_IP}:3333"

function Build-Backend {
    Write-Host "`n[1/3] Building backend..." -ForegroundColor Cyan
    docker build -t "${IMAGE}:backend" ./apps/backend
    if ($LASTEXITCODE -ne 0) { Write-Host "Build falhou." -ForegroundColor Red; exit 1 }

    Write-Host "`n[2/3] Pushing backend..." -ForegroundColor Cyan
    docker push "${IMAGE}:backend"
    if ($LASTEXITCODE -ne 0) { Write-Host "Push falhou." -ForegroundColor Red; exit 1 }
}

function Build-Web {
    Write-Host "`n[1/3] Building web..." -ForegroundColor Cyan
    docker build --build-arg VITE_API_URL=$API_URL -t "${IMAGE}:web" ./apps/web
    if ($LASTEXITCODE -ne 0) { Write-Host "Build falhou." -ForegroundColor Red; exit 1 }

    Write-Host "`n[2/3] Pushing web..." -ForegroundColor Cyan
    docker push "${IMAGE}:web"
    if ($LASTEXITCODE -ne 0) { Write-Host "Push falhou." -ForegroundColor Red; exit 1 }
}

function Deploy-VM {
    Write-Host "`n[3/3] Atualizando VM..." -ForegroundColor Cyan
    ssh "${VM_USER}@${VM_IP}" "docker compose pull && docker compose up -d"
    if ($LASTEXITCODE -ne 0) { Write-Host "Deploy na VM falhou." -ForegroundColor Red; exit 1 }
    Write-Host "`nDeploy concluido!" -ForegroundColor Green
    Write-Host "Frontend: http://${VM_IP}:5173"
    Write-Host "Backend:  http://${VM_IP}:3333/health"
}

switch ($Target) {
    "backend" { Build-Backend; Deploy-VM }
    "web"     { Build-Web;     Deploy-VM }
    default   { Build-Backend; Build-Web; Deploy-VM }
}
