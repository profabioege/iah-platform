# Piloto da 1ª série A no Cloud Run (São Paulo) — pacote de publicação

> Candidato a hospedar **o piloto inteiro** (homologação, ensaio de capacidade e aula), na mesma região do banco
> (Supabase `sa-east-1`). Nada aqui foi contratado ou publicado. Comandos marcados **[Fabio]** dependem de conta,
> cartão ou segredo; o resto o Claude Code executa com autorização. Nenhum segredo entra no Git, na imagem ou na conversa.
> Decisão registrada em `docs/DECISIONS.md` (D-059). Análise das alternativas: `piloto-1a-alternativas-hospedagem-2026-10-22.md`.

## 1. Versão e arquivos

| Item | Valor |
|---|---|
| Código da aplicação | `app/src` idêntico a `95bd4ef` (inclui `73af7f8`, `122d9ce` e a correção de títulos) |
| Versão a publicar | o commit que acrescenta este documento, `app/Dockerfile` e `app/.dockerignore` (SHA registrado no `REGISTRO.md`) |
| `app/Dockerfile` | 2 estágios em `node:24-bookworm-slim`: `npm ci` + `next build` (segredos só como *build secrets*) → `npm ci --omit=dev` + `next start` na porta `$PORT` (8080), usuário `node`, `TZ=UTC`, rótulo `org.opencontainers.image.revision` |
| `app/.dockerignore` | fora da imagem: `node_modules`, `.next`, `.vercel`, `.env*`, `tests`, `scripts`, `db` |
| Validação local (22/10) | imagem compilada em modo real com segredos descartáveis; contêiner servindo `/entrar`, `/entrar/esqueci-senha` (só existe no modo real), privadas → `/entrar`, `/api/versao` 404 sem sessão; **0 ocorrências** dos segredos de build no sistema de arquivos e no histórico da imagem |

## 2. Recursos e segurança

| Configuração | Valor | Motivo |
|---|---|---|
| Região | `southamerica-east1` | mesma do banco e da escola |
| CPU / memória | 2 vCPU / 2 GiB | folga para a fase de envio (até 25 simultâneos); custo irrelevante no volume do piloto |
| Concorrência por instância | 40 | 32 alunos + professor + gestor cabem em 1 instância, com sobra |
| Instâncias | mínimo **0** fora das janelas; **1** só na janela do ensaio/aula; máximo **3** | sem custo parado; sem partida a frio na aula |
| Tempo limite | 300 s | igual ao da Vercel |
| CPU | cobrança por requisição (padrão) + *startup CPU boost* | custo só com uso |
| Acesso | público (`--allow-unauthenticated`): a autenticação é a da aplicação | os alunos entram pelo navegador |
| Conta de serviço | `iah-piloto-run`, só com `secretmanager.secretAccessor` nos 3 segredos | menor privilégio |
| Segredos (Secret Manager, réplica em `southamerica-east1`) | `iah-auth-secret` (**novo**, só deste ambiente), `iah-service-role`, `iah-jwt-secret` | nunca como variável comum nem na imagem |
| Variáveis comuns | `IAH_AUTH_MODE=supabase`, `AUTH_TRUST_HOST=true`, `AUTH_URL=<URL do serviço>`, `NEXT_TELEMETRY_DISABLED=1` | `AUTH_URL` **não** pode ser o da Vercel |
| Orçamento | alerta de **US$ 5** (50/90/100%) na conta de faturamento | aviso antes de qualquer gasto relevante |

## 3. Custo revisado (piloto inteiro)

Câmbio: PTAX venda 22/10/2026 **R$ 5,0383** (Banco Central). Premissas: IOF 3,5% no cartão (confirmar com o emissor),
spread do emissor não incluído; preço Tier 2 de São Paulo **não confirmado** — estimado como 1,4 × Tier 1
(US$ 0,000024/vCPU-s, US$ 0,0000025/GiB-s); camada gratuita mensal de 180.000 vCPU-s, 360.000 GiB-s e 2 milhões de
requisições aplicada a preço Tier 1.

| Item | Estimativa | R$ |
|---|---|---|
| Homologação (instância sobe só sob uso) | centavos | ~0 |
| Ensaio: 3 rodadas, janela de 2 h com mínimo 1, 2 vCPU/2 GiB | ~US$ 0,5 (coberto pela camada gratuita) | ~0–3 |
| Aula: janela de 2 h com mínimo 1 | ~US$ 0,3 (coberto) | ~0–2 |
| Artifact Registry (≤ 3 versões, ~0,3–0,4 GB cada comprimidas) | ~US$ 0,05/mês | ~0,3 |
| Saída de rede (aula + ensaio, < 2 GB) | ~US$ 0,2 | ~1 |
| **Total Cloud Run no mês do piloto** | **US$ 0–3** | **R$ 0–16** |
| Risco: mínimo 1 esquecido ligado o mês todo (2 vCPU/2 GiB, ocioso) | ~US$ 36/mês | ~R$ 190 — o alerta de US$ 5 avisa antes |
| Supabase Pro (decisão à parte; sem pausa por inatividade, chamado de suporte, backups) | US$ 25/mês | ~R$ 130 |

## 4. Intervenções do Fabio (antes de qualquer comando)

1. **Autorização financeira:** conta de faturamento Google Cloud com cartão e alerta de US$ 5. (Supabase Pro: decisão à parte.)
2. Instalar e entrar no Google Cloud CLI (`gcloud auth login`) na máquina do piloto.
3. Preparar a pasta restrita `C:\piloto\restrito\cloudrun\` com os valores (sem quebra de linha), numa janela CMD onde as
   variáveis do piloto já existem:
   ```bat
   mkdir C:\piloto\restrito\cloudrun
   node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > C:\piloto\restrito\cloudrun\auth_secret
   <nul set /p "=%SUPABASE_SERVICE_ROLE_KEY%" > C:\piloto\restrito\cloudrun\service_role
   <nul set /p "=%SUPABASE_JWT_SECRET%" > C:\piloto\restrito\cloudrun\jwt_secret
   <nul set /p "=%NEXT_PUBLIC_SUPABASE_ANON_KEY%" > C:\piloto\restrito\cloudrun\anon_key
   ```
   O `auth_secret` é **novo** (as sessões da Vercel não valem no Cloud Run). Apagar a pasta depois da publicação.

## 5. Comandos (CMD; substituir `<PROJETO>`, `<CONTA>` e `<SHA>`)

**5.1 Projeto, faturamento e serviços — [Fabio]**
```bat
gcloud projects create <PROJETO> --name="IAH piloto Beryon"
gcloud billing projects link <PROJETO> --billing-account=<CONTA>
gcloud config set project <PROJETO>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com billingbudgets.googleapis.com
gcloud billing budgets create --billing-account=<CONTA> --display-name="iah-piloto" --budget-amount=5USD --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
for /f %N in ('gcloud projects describe <PROJETO> --format^="value(projectNumber)"') do set NUM=%N
set URL=https://iah-piloto-%NUM%.southamerica-east1.run.app
```

**5.2 Registro, conta de serviço e segredos — [Fabio]**
```bat
gcloud artifacts repositories create iah-piloto --repository-format=docker --location=southamerica-east1
gcloud iam service-accounts create iah-piloto-run --display-name="IAH piloto (Cloud Run)"
gcloud secrets create iah-auth-secret --replication-policy=user-managed --locations=southamerica-east1 --data-file=C:\piloto\restrito\cloudrun\auth_secret
gcloud secrets create iah-service-role --replication-policy=user-managed --locations=southamerica-east1 --data-file=C:\piloto\restrito\cloudrun\service_role
gcloud secrets create iah-jwt-secret --replication-policy=user-managed --locations=southamerica-east1 --data-file=C:\piloto\restrito\cloudrun\jwt_secret
for %S in (iah-auth-secret iah-service-role iah-jwt-secret) do gcloud secrets add-iam-policy-binding %S --member=serviceAccount:iah-piloto-run@<PROJETO>.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
```

**5.3 Imagem — Claude Code (worktree limpo no `<SHA>`)**. O build roda dentro da máquina do Podman (o cliente Windows
falha com segredos de build):
```bat
set /p ANON=<C:\piloto\restrito\cloudrun\anon_key
podman machine ssh "cd /mnt/c/Users/profabio77/iah-piloto-1a/app && podman build -f Dockerfile --secret id=auth_secret,src=/mnt/c/piloto/restrito/cloudrun/auth_secret --secret id=service_role,src=/mnt/c/piloto/restrito/cloudrun/service_role --secret id=jwt_secret,src=/mnt/c/piloto/restrito/cloudrun/jwt_secret --build-arg NEXT_PUBLIC_SUPABASE_URL=https://feyfodhcvytcxtjjlarj.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=%ANON% --build-arg NEXT_PUBLIC_BUILD_COMMIT=<SHA> --build-arg NEXT_PUBLIC_BUILD_BRANCH=pilot/beryon-1a-2026 --build-arg NEXT_PUBLIC_BUILD_ENVIRONMENT=cloudrun-sao-paulo --build-arg NEXT_PUBLIC_SITE_URL=%URL% -t southamerica-east1-docker.pkg.dev/<PROJETO>/iah-piloto/app:<SHA> ."
gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin southamerica-east1-docker.pkg.dev
podman push southamerica-east1-docker.pkg.dev/<PROJETO>/iah-piloto/app:<SHA>
```

**5.4 Publicação — Claude Code, com autorização**
```bat
gcloud run deploy iah-piloto --region=southamerica-east1 --image=southamerica-east1-docker.pkg.dev/<PROJETO>/iah-piloto/app:<SHA> --service-account=iah-piloto-run@<PROJETO>.iam.gserviceaccount.com --allow-unauthenticated --port=8080 --cpu=2 --memory=2Gi --concurrency=40 --min-instances=0 --max-instances=3 --timeout=300 --cpu-boost --set-env-vars=IAH_AUTH_MODE=supabase,AUTH_TRUST_HOST=true,AUTH_URL=%URL%,NEXT_TELEMETRY_DISABLED=1 --set-secrets=AUTH_SECRET=iah-auth-secret:latest,SUPABASE_SERVICE_ROLE_KEY=iah-service-role:latest,SUPABASE_JWT_SECRET=iah-jwt-secret:latest
gcloud run services describe iah-piloto --region=southamerica-east1 --format="value(status.url,status.latestReadyRevisionName,spec.template.spec.containers[0].image)"
```
Conferências (como nas seções 16 e 19 do registro): URL igual a `%URL%`; imagem e *digest* publicados = os enviados;
rótulo `revision` = `<SHA>`; build feito com worktree limpo no `<SHA>`; `/api/versao` com sessão de gestor → `<SHA>`,
`modo supabase`, `ambiente cloudrun-sao-paulo`; região nas métricas do serviço.

## 6. Sequência até a aula

| Etapa | O quê | Quem |
|---|---|---|
| 1. Publicação | seções 4–5 | Fabio (4, 5.1, 5.2) · Claude Code (5.3, 5.4) |
| 2. Homologação funcional (dados sintéticos, só leitura) | linha de base do banco; aluno extra (devolutiva), F1 (rascunho), professor (último acesso em Brasília), gestor (G1–G4), "Esqueci minha senha"; integridade antes/depois | logins: Fabio · conferências: Claude Code |
| 3. Condições do Supabase | consulta escrita (seção 7) e resposta; projeto ativo; cópia de segurança | Fabio envia · Claude Code confere |
| 4. Turma de capacidade | `class-ensaio-cap32` com 32 alunos sintéticos pela importação oficial (`expectedTotal: 32` só nessa configuração) | autorização e execução: Fabio |
| 5. Ensaio | protocolo inalterado (seção 8) | Fabio executa no CMD · Claude Code prepara e analisa |
| 6. Avaliação | limites originais (seção 8); 3 rodadas aprovadas seguidas | Claude Code registra · ChatGPT revisa · Fabio decide |

## 7. Supabase — condições e consulta (antes do ensaio)

Condições vigentes (fontes oficiais, 22/10/2026): testes no próprio projeto sem aprovação prévia, mas **request flooding
proibido** (Security testing); aviso de 2 semanas exigido só de Team/Enterprise para carga pesada (Production Checklist);
projeto Free pode ser pausado após 7 dias de pouca atividade; compute Nano (CPU compartilhada, 0,5 GB). Conferir no dia:
projeto ativo, sem pausa; cópia lógica (`piloto-copia-seguranca.cmd`) antes e depois.

Texto da consulta (para security@supabase.com ou o suporte), a enviar pelo Fabio:

> Subject: Planned load test on our own project (feyfodhcvytcxtjjlarj, sa-east-1, Free plan)
>
> We plan a short, rate-limited load test of our own staging project before a school pilot: 32 synthetic accounts, up
> to 25 concurrent submissions, a client-side cap of 50 HTTP requests/s to our app (estimated 115–770 PostgREST calls/s
> for a few seconds at peak, ~28,000–60,000 calls per 13–15 min run), at most 3 runs with ≥ 15 min between them in one
> 2-hour window, from one IP in Brazil. The test stops automatically on the first unexpected error, 429, timeout or
> connection error. Only synthetic data. Is this acceptable under your policies for the Free plan, and is there anything
> you would like us to change (rate, window, plan or compute size)?

## 8. Ensaio (protocolo `piloto-1a-protocolo-capacidade-2026-10-20.md`, critérios inalterados)

Durante a janela: `gcloud run services update iah-piloto --region=southamerica-east1 --min-instances=1`; ao final, `--min-instances=0`.
```bat
node --experimental-strip-types scripts\pilot-ensaio-1a.mjs --modo=hospedado ^
  --students=32 --peak-submitters=25 --entry-window=60 --autosave-min=10 --drafts=3 --reviews=5 ^
  --max-rps=50 --rps-burst=25 --timeout-ms=15000 --max-duration-s=1200 ^
  "--base-url=%URL%" ^
  "--contas=C:\piloto\capacidade\cred-turma-cap32.csv" "--contas-extra=C:\piloto\ensaio-2alunos\cred-extra.csv" ^
  --institution=inst-ensaio-1a --turma=class-ensaio-cap32 --turma-extra=class-ensaio-extra ^
  "--out=C:\piloto\capacidade\resultado-cloudrun-rodada-N.json" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
```
Aprovação (sem alteração): 0 erros de escrita; p95 login ≤ 2.000 ms; leitura da missão ≤ 1.000 ms; gravação (envio e
salvamento automático, julgados à parte) ≤ 1.500 ms; leitura do professor ≤ 1.500 ms; integridade (32 entregas =
reflexões = registros de IA; 5 devolutivas; 0 duplicadas; 0 trocadas); verificações funcionais "ok"; rodada concluída
sem interrupção; 3 aprovadas seguidas. A espera imposta pelo limitador do gerador fica fora das latências julgadas. A
reprovação histórica (p95 1.520 ms) continua registrada. Monitoramento: métricas e logs do Cloud Run
(`gcloud run services logs tail iah-piloto --region=southamerica-east1`) e painel do Supabase.

**Se aprovado — operação da aula no Cloud Run:** mesma revisão do ensaio; mínimo 1 instância de 30 min antes a 30 min
depois da aula; URL `*.run.app` distribuída pela escola; cópia de segurança antes e depois; a Vercel fica só como
contingência de emergência (mesmo banco; capacidade **não comprovada**).

**Se reprovado — diagnóstico com evidências, sem afrouxar critério:** cruzar o JSON do gerador (p95 por fase, espera do
limitador, concorrência) com as métricas do Cloud Run (CPU, instâncias, latência por requisição) e do Supabase (CPU,
conexões, latência da API). Causas e correções: CPU da aplicação → mais CPU/instâncias; banco (CPU Nano saturada,
tempo de resposta do PostgREST) → compute maior (decisão de plano) ou menos chamadas por ação (mudança de código, com
testes); rede → repetir a partir da rede da escola. Nova rodada só depois da correção registrada.

## 9. Encerramento e retorno

1. `gcloud run services update iah-piloto --region=southamerica-east1 --min-instances=0` (sem custo parado).
2. Ao fim do piloto ou se a opção for abandonada: `gcloud run services delete iah-piloto --region=southamerica-east1`;
   `gcloud artifacts repositories delete iah-piloto --location=southamerica-east1`; `gcloud secrets delete` dos 3
   segredos; `gcloud billing projects unlink <PROJETO>`; opcional `gcloud projects delete <PROJETO>` (30 dias para
   recuperar).
3. Apagar `C:\piloto\restrito\cloudrun\`.
4. **A Vercel não é alterada em nenhuma etapa:** `iah-piloto-beryon.vercel.app`, o deploy `dpl_MstnwksqP8…` e as
   referências de rollback seguem como estão.
5. Dados: o mesmo banco; registros sintéticos do ensaio ficam como evidência ou são removidos só depois de cópia de
   segurança e autorização. Resultados (JSON, logs, SHA, revisão) registrados no `REGISTRO.md`, sem apagar reprovações.
