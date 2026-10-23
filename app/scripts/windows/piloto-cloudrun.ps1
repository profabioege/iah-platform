<#
Piloto IAH no Cloud Run (southamerica-east1) - comandos do operador (PowerShell 5.1+).
Pacote completo: docs/piloto/09-hospedagem-cloud-run.md.

Uso (sempre informe o projeto DUAS vezes; o script confere as duas e o projeto ativo do gcloud):
  .\piloto-cloudrun.ps1 -Etapa Projeto   -Projeto <id> -ConfirmarProjeto <id> -ContaFaturamento <XXXXXX-XXXXXX-XXXXXX>
  .\piloto-cloudrun.ps1 -Etapa Segredos  -Projeto <id> -ConfirmarProjeto <id>
  .\piloto-cloudrun.ps1 -Etapa Imagem    -Projeto <id> -ConfirmarProjeto <id> -Sha <commit-40>
  .\piloto-cloudrun.ps1 -Etapa Publicar  -Projeto <id> -ConfirmarProjeto <id> -Sha <commit-40>
  .\piloto-cloudrun.ps1 -Etapa Conferir  -Projeto <id> -ConfirmarProjeto <id>
  .\piloto-cloudrun.ps1 -Etapa Janela    -Projeto <id> -ConfirmarProjeto <id>   (aula/ensaio: publico + 1 instancia minima)
  .\piloto-cloudrun.ps1 -Etapa Retomar   -Projeto <id> -ConfirmarProjeto <id>   (publico, autoescala 0..3)
  .\piloto-cloudrun.ps1 -Etapa Desativar -Projeto <id> -ConfirmarProjeto <id>   (sem acesso publico, 0 instancias minimas)
  .\piloto-cloudrun.ps1 -Etapa Encerrar  -Projeto <id> -ConfirmarProjeto <id>   (apaga servico, imagens e segredos)

Regras: para no primeiro erro (inclusive de comando externo); nenhum segredo e impresso; segredos ficam em
C:\piloto\restrito\cloudrun\ (fora do Git) e so vao para o Secret Manager e para o build como build secrets.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Projeto', 'Segredos', 'Imagem', 'Publicar', 'Conferir', 'Janela', 'Retomar', 'Desativar', 'Encerrar')]
  [string]$Etapa,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')][string]$Projeto,
  [Parameter(Mandatory = $true)][string]$ConfirmarProjeto,
  [string]$ContaFaturamento,
  [ValidatePattern('^[0-9a-f]{40}$')][string]$Sha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- constantes
$Regiao      = 'southamerica-east1'
$Servico     = 'iah-piloto'
$Repositorio = 'iah-piloto'
$ContaServ   = "iah-piloto-run@$Projeto.iam.gserviceaccount.com"
$PastaSeg    = 'C:\piloto\restrito\cloudrun'
$Worktree    = 'C:\Users\profabio77\iah-piloto-1a'
$SupabaseUrl = 'https://feyfodhcvytcxtjjlarj.supabase.co'
$Segredos    = [ordered]@{ AUTH_SECRET = 'iah-auth-secret'; SUPABASE_SERVICE_ROLE_KEY = 'iah-service-role'; SUPABASE_JWT_SECRET = 'iah-jwt-secret' }
$Arquivos    = [ordered]@{ AUTH_SECRET = 'auth_secret'; SUPABASE_SERVICE_ROLE_KEY = 'service_role'; SUPABASE_JWT_SECRET = 'jwt_secret' }
$Recursos    = @('--cpu=2', '--memory=2Gi', '--concurrency=40', '--max-instances=3', '--timeout=300', '--cpu-throttling', '--cpu-boost')

# ------------------------------------------------------------------ apoio
function Executar {
  # Comando externo: para se o codigo de saida nao for 0.
  param([Parameter(Mandatory = $true)][string]$Exe, [string[]]$Argumentos)
  & $Exe @Argumentos
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $Exe $($Argumentos[0..([Math]::Min(2, $Argumentos.Count - 1))] -join ' ') (codigo $LASTEXITCODE)" }
}
function Saida {
  # Comando externo cuja saida e usada; para se falhar.
  param([Parameter(Mandatory = $true)][string]$Exe, [string[]]$Argumentos)
  $r = & $Exe @Argumentos
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $Exe $($Argumentos[0..([Math]::Min(2, $Argumentos.Count - 1))] -join ' ') (codigo $LASTEXITCODE)" }
  return ($r | Out-String).Trim()
}
function Existe {
  param([Parameter(Mandatory = $true)][string]$Exe, [string[]]$Argumentos)
  & $Exe @Argumentos *> $null
  return ($LASTEXITCODE -eq 0)
}
function ExigirVariaveis([string[]]$Nomes) {
  foreach ($n in $Nomes) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($n))) { throw "Falta a variavel $n nesta janela (defina-a sem exibir o valor)." }
  }
  Write-Host "Variaveis presentes: $($Nomes -join ', ') (valores nao exibidos)."
}
function ExigirArquivosSegredo {
  foreach ($a in $Arquivos.Values) {
    $p = Join-Path $PastaSeg $a
    if (-not (Test-Path $p) -or (Get-Item $p).Length -lt 16) { throw "Segredo ausente ou curto: $p (rode -Etapa Segredos)." }
  }
}
function CaminhoVm([string]$Windows) {
  # C:\x\y -> /mnt/c/x/y (o build roda dentro da maquina do Podman).
  $d = $Windows.Substring(0, 1).ToLower()
  return '/mnt/' + $d + ($Windows.Substring(2) -replace '\\', '/')
}
function UrlDoServico {
  $num = Saida 'gcloud' @('projects', 'describe', $Projeto, '--format=value(projectNumber)')
  if ($num -notmatch '^\d+$') { throw "Numero do projeto invalido: $num" }
  return "https://$Servico-$num.$Regiao.run.app"
}
function Imagem([string]$Commit) { return "$Regiao-docker.pkg.dev/$Projeto/$Repositorio/app:$Commit" }

# ----------------------------------------------------- conferencia do destino
if ($Projeto -cne $ConfirmarProjeto) { throw "Projeto e ConfirmarProjeto diferentes: nada foi feito." }
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) { throw "gcloud nao encontrado. Instale o Google Cloud CLI e rode 'gcloud auth login'." }
$conta = Saida 'gcloud' @('config', 'get-value', 'account')
if ([string]::IsNullOrWhiteSpace($conta)) { throw "Nenhuma conta ativa no gcloud ('gcloud auth login')." }
if ($Etapa -ne 'Projeto') {
  $ativo = Saida 'gcloud' @('config', 'get-value', 'project')
  if ($ativo -ne $Projeto) { throw "Projeto ativo do gcloud e '$ativo', nao '$Projeto'. Rode: gcloud config set project $Projeto" }
  if (-not (Existe 'gcloud' @('projects', 'describe', $Projeto))) { throw "Projeto $Projeto nao encontrado ou sem acesso." }
}
Write-Host "Destino: projeto $Projeto, regiao $Regiao, servico $Servico, conta $conta. Etapa: $Etapa."

switch ($Etapa) {
  'Projeto' {
    if ($ContaFaturamento -notmatch '^[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}$') { throw "Informe -ContaFaturamento no formato XXXXXX-XXXXXX-XXXXXX." }
    if (-not (Existe 'gcloud' @('projects', 'describe', $Projeto))) { Executar 'gcloud' @('projects', 'create', $Projeto, '--name=IAH piloto Beryon') }
    Executar 'gcloud' @('config', 'set', 'project', $Projeto)
    Executar 'gcloud' @('billing', 'projects', 'link', $Projeto, "--billing-account=$ContaFaturamento")
    Executar 'gcloud' @('services', 'enable', 'run.googleapis.com', 'artifactregistry.googleapis.com', 'secretmanager.googleapis.com', 'billingbudgets.googleapis.com')
    # Alerta (e-mail aos administradores da conta de faturamento). NAO e limite de gasto.
    Executar 'gcloud' @('billing', 'budgets', 'create', "--billing-account=$ContaFaturamento", '--display-name=iah-piloto', '--budget-amount=5USD',
      '--threshold-rule=percent=0.5', '--threshold-rule=percent=0.9', '--threshold-rule=percent=1.0', "--filter-projects=projects/$Projeto")
    if (-not (Existe 'gcloud' @('artifacts', 'repositories', 'describe', $Repositorio, "--location=$Regiao"))) {
      Executar 'gcloud' @('artifacts', 'repositories', 'create', $Repositorio, '--repository-format=docker', "--location=$Regiao")
    }
    if (-not (Existe 'gcloud' @('iam', 'service-accounts', 'describe', $ContaServ))) {
      Executar 'gcloud' @('iam', 'service-accounts', 'create', 'iah-piloto-run', '--display-name=IAH piloto (Cloud Run)')
    }
    Write-Host "Projeto pronto. Proximo: -Etapa Segredos."
  }

  'Segredos' {
    ExigirVariaveis @('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
    New-Item -ItemType Directory -Force $PastaSeg | Out-Null
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $auth = Join-Path $PastaSeg 'auth_secret'
    if (-not (Test-Path $auth)) {
      # AUTH_SECRET novo, so deste ambiente (as sessoes da Vercel nao valem aqui).
      $bytes = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
      [IO.File]::WriteAllText($auth, [Convert]::ToBase64String($bytes), $utf8)
    }
    [IO.File]::WriteAllText((Join-Path $PastaSeg 'service_role'), $env:SUPABASE_SERVICE_ROLE_KEY, $utf8)
    [IO.File]::WriteAllText((Join-Path $PastaSeg 'jwt_secret'), $env:SUPABASE_JWT_SECRET, $utf8)
    [IO.File]::WriteAllText((Join-Path $PastaSeg 'anon_key'), $env:NEXT_PUBLIC_SUPABASE_ANON_KEY, $utf8)
    ExigirArquivosSegredo
    foreach ($nome in $Segredos.Keys) {
      $id = $Segredos[$nome]; $arq = Join-Path $PastaSeg $Arquivos[$nome]
      if (Existe 'gcloud' @('secrets', 'describe', $id)) {
        Executar 'gcloud' @('secrets', 'versions', 'add', $id, "--data-file=$arq")
      } else {
        Executar 'gcloud' @('secrets', 'create', $id, '--replication-policy=user-managed', "--locations=$Regiao", "--data-file=$arq")
      }
      Executar 'gcloud' @('secrets', 'add-iam-policy-binding', $id, "--member=serviceAccount:$ContaServ", '--role=roles/secretmanager.secretAccessor')
    }
    Write-Host "Segredos gravados no Secret Manager (valores nao exibidos). Apague $PastaSeg depois da publicacao."
  }

  'Imagem' {
    if (-not $Sha) { throw "Informe -Sha (commit de 40 caracteres)." }
    ExigirArquivosSegredo
    $head = Saida 'git' @('-C', $Worktree, 'rev-parse', 'HEAD')
    if ($head -ne $Sha) { throw "O worktree esta em $head, nao em $Sha." }
    $sujo = Saida 'git' @('-C', $Worktree, 'status', '--porcelain')
    if ($sujo) { throw "Worktree com alteracoes nao commitadas: a imagem precisa sair exatamente de $Sha." }
    $url = UrlDoServico
    $anon = [IO.File]::ReadAllText((Join-Path $PastaSeg 'anon_key')).Trim()
    $s = CaminhoVm $PastaSeg; $app = CaminhoVm (Join-Path $Worktree 'app'); $img = Imagem $Sha
    $cmd = "cd $app && podman build -f Dockerfile " +
      "--secret id=auth_secret,src=$s/auth_secret --secret id=service_role,src=$s/service_role --secret id=jwt_secret,src=$s/jwt_secret " +
      "--build-arg NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon " +
      "--build-arg NEXT_PUBLIC_BUILD_COMMIT=$($Sha.Substring(0, 7)) --build-arg NEXT_PUBLIC_BUILD_BRANCH=pilot/beryon-1a-2026 " +
      "--build-arg NEXT_PUBLIC_BUILD_ENVIRONMENT=cloudrun-sao-paulo --build-arg NEXT_PUBLIC_SITE_URL=$url -t $img ."
    # Fora do repositorio: o "podman machine ssh" pode gravar a chave publica do host num arquivo "NUL" na pasta atual.
    Push-Location $env:TEMP
    try { Executar 'podman' @('machine', 'ssh', $cmd) } finally { Pop-Location }
    $token = Saida 'gcloud' @('auth', 'print-access-token')
    $token | podman login -u oauth2accesstoken --password-stdin "$Regiao-docker.pkg.dev" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "podman login falhou." }
    Remove-Variable token
    Executar 'podman' @('push', $img)
    $digest = Saida 'gcloud' @('artifacts', 'docker', 'images', 'describe', $img, '--format=value(image_summary.digest)')
    Write-Host "Imagem enviada: $img"
    Write-Host "Digest: $digest"
  }

  'Publicar' {
    if (-not $Sha) { throw "Informe -Sha (o mesmo da etapa Imagem)." }
    $url = UrlDoServico; $img = Imagem $Sha
    $segredosArg = ($Segredos.Keys | ForEach-Object { "$_=$($Segredos[$_]):latest" }) -join ','
    # Cobranca por requisicao (--cpu-throttling): CPU so durante requisicoes; minimo 0 (autoescala) apos publicar.
    Executar 'gcloud' (@('run', 'deploy', $Servico, "--region=$Regiao", "--image=$img", "--service-account=$ContaServ",
      '--allow-unauthenticated', '--port=8080', '--min-instances=0') + $Recursos + @(
      "--set-env-vars=IAH_AUTH_MODE=supabase,AUTH_TRUST_HOST=true,AUTH_URL=$url,NEXT_TELEMETRY_DISABLED=1",
      "--set-secrets=$segredosArg"))
    $publicada = Saida 'gcloud' @('run', 'services', 'describe', $Servico, "--region=$Regiao", '--format=value(status.url)')
    if ($publicada -ne $url) { throw "URL publicada ($publicada) diferente da esperada ($url): AUTH_URL ficaria errado." }
    Write-Host "Publicado em $url. Confira com -Etapa Conferir."
  }

  'Conferir' {
    Executar 'gcloud' @('run', 'services', 'describe', $Servico, "--region=$Regiao", '--format=yaml(status.url,status.latestReadyRevisionName,spec.template.spec.containers[0].image,spec.template.spec.containers[0].resources,spec.template.metadata.annotations,spec.template.spec.containerConcurrency,spec.template.spec.serviceAccountName)')
    $ref = Saida 'gcloud' @('run', 'services', 'describe', $Servico, "--region=$Regiao", '--format=value(spec.template.spec.containers[0].env)')
    foreach ($nome in $Segredos.Keys) { if ($ref -notmatch $Segredos[$nome]) { throw "Segredo $nome nao referenciado no servico." } }
    Write-Host "Segredos referenciados pelo nome (valores nao exibidos): $($Segredos.Values -join ', ')."
    $publico = Saida 'gcloud' @('run', 'services', 'get-iam-policy', $Servico, "--region=$Regiao", '--format=value(bindings.members)')
    Write-Host ("Acesso publico (allUsers invoker): " + ($(if ($publico -match 'allUsers') { 'SIM' } else { 'NAO' })))
  }

  'Janela' {
    Executar 'gcloud' @('run', 'services', 'add-iam-policy-binding', $Servico, "--region=$Regiao", '--member=allUsers', '--role=roles/run.invoker')
    Executar 'gcloud' @('run', 'services', 'update', $Servico, "--region=$Regiao", '--min-instances=1', '--max-instances=3')
    Write-Host "Janela aberta: publico e 1 instancia minima (cobra tempo ocioso). Ao terminar: -Etapa Retomar ou -Etapa Desativar."
  }

  'Retomar' {
    Executar 'gcloud' @('run', 'services', 'add-iam-policy-binding', $Servico, "--region=$Regiao", '--member=allUsers', '--role=roles/run.invoker')
    Executar 'gcloud' @('run', 'services', 'update', $Servico, "--region=$Regiao", '--min-instances=0', '--max-instances=3')
    Write-Host "Servico ativo com autoescala 0..3: sobe instancia sob demanda (partida a frio), sem custo ocioso de instancia minima."
  }

  'Desativar' {
    Executar 'gcloud' @('run', 'services', 'update', $Servico, "--region=$Regiao", '--min-instances=0')
    if (Existe 'gcloud' @('run', 'services', 'remove-iam-policy-binding', $Servico, "--region=$Regiao", '--member=allUsers', '--role=roles/run.invoker')) {
      Write-Host "Acesso publico removido."
    } else { Write-Host "Acesso publico ja estava removido." }
    $publico = Saida 'gcloud' @('run', 'services', 'get-iam-policy', $Servico, "--region=$Regiao", '--format=value(bindings.members)')
    if ($publico -match 'allUsers') { throw "allUsers ainda tem acesso: desativacao incompleta." }
    Write-Host "Desativado: requisicoes publicas recebem 403 (negadas pelo IAM nao sao cobradas) e nao ha instancia minima."
  }

  'Encerrar' {
    $resp = Read-Host "Digite o id do projeto para APAGAR servico, imagens e segredos"
    if ($resp -cne $Projeto) { throw "Confirmacao diferente: nada foi apagado." }
    if (Existe 'gcloud' @('run', 'services', 'describe', $Servico, "--region=$Regiao")) { Executar 'gcloud' @('run', 'services', 'delete', $Servico, "--region=$Regiao", '--quiet') }
    if (Existe 'gcloud' @('artifacts', 'repositories', 'describe', $Repositorio, "--location=$Regiao")) { Executar 'gcloud' @('artifacts', 'repositories', 'delete', $Repositorio, "--location=$Regiao", '--quiet') }
    foreach ($id in $Segredos.Values) { if (Existe 'gcloud' @('secrets', 'describe', $id)) { Executar 'gcloud' @('secrets', 'delete', $id, '--quiet') } }
    Write-Host "Removidos servico, repositorio de imagens e segredos. Para parar toda cobranca: gcloud billing projects unlink $Projeto"
  }
}
