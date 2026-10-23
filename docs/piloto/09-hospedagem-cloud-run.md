# Piloto da 1ª série A no Cloud Run (São Paulo) — pacote de publicação (revisão 2)

> Candidato a hospedar **o piloto inteiro** (homologação, ensaio de capacidade e aula), na mesma região do banco
> (Supabase `sa-east-1`). Nada aqui foi contratado ou publicado. Etapas marcadas **[Fabio]** dependem de conta,
> cartão ou segredo; as demais o Claude Code executa com autorização. Nenhum segredo entra no Git, na imagem ou na conversa.
> Decisão: `docs/DECISIONS.md` (D-059). Comandos: `app/scripts/windows/piloto-cloudrun.ps1` (PowerShell 5.1+).

## 1. Versão e arquivos

| Item | Valor |
|---|---|
| Código da aplicação | `app/src` idêntico a `95bd4ef` (inclui `73af7f8`, `122d9ce` e a correção de títulos) |
| Versão a publicar | o commit desta revisão do pacote (SHA no `REGISTRO.md`); a imagem sai **exatamente** dele (o script recusa worktree sujo ou outro SHA) |
| `app/Dockerfile` | 2 estágios em `node:24-bookworm-slim`: `npm ci` + `next build` (segredos só como *build secrets*) → `npm ci --omit=dev` + `next start` na porta `$PORT` (8080), usuário `node`, `TZ=UTC`, rótulo `org.opencontainers.image.revision` |
| `app/.dockerignore` / `app/.gitattributes` | fora da imagem: `node_modules`, `.next`, `.vercel`, `.env*`, `tests`, `scripts`, `db`; os dois arquivos sempre em LF |
| `app/scripts/windows/piloto-cloudrun.ps1` | etapas `Projeto`, `Segredos`, `Imagem`, `Publicar`, `Conferir`, `Janela`, `Retomar`, `Desativar`, `Encerrar` |
| Evidências locais | seção 9 deste documento e `REGISTRO.md` (seções 21 e 22) |

## 2. Recursos, cobrança e segurança

| Configuração | Valor | Motivo |
|---|---|---|
| Região | `southamerica-east1` | mesma do banco e da escola |
| **Modalidade de cobrança** | **por requisição** (`--cpu-throttling`): CPU e memória cobradas só enquanto a instância atende requisições (arredondado a 100 ms), mais o tempo ocioso das instâncias **mínimas** | sem custo entre usos; a instância mínima é a única que cobra parada |
| CPU / memória | 2 vCPU / 2 GiB por instância | folga para a fase de envio (até 25 simultâneos) |
| Concorrência | 40 requisições por instância | 32 alunos + professor + gestor cabem em 1 instância |
| Autoescala | **mínimo 0, máximo 3** (estado normal, "Retomar"); **mínimo 1, máximo 3** só na janela do ensaio/aula ("Janela") | o máximo 3 limita o pior caso de custo |
| Tempo limite / partida | 300 s; *startup CPU boost* | igual à Vercel; partida mais rápida |
| Acesso | público (`allUsers` com `run.invoker`) enquanto ativo; a autenticação é a da aplicação | alunos entram pelo navegador |
| Conta de serviço | `iah-piloto-run`, só `secretmanager.secretAccessor` nos 3 segredos | menor privilégio |
| Segredos (Secret Manager, `southamerica-east1`) | `iah-auth-secret` (**novo**, só deste ambiente), `iah-service-role`, `iah-jwt-secret` | nunca como variável comum nem na imagem |
| Variáveis comuns | `IAH_AUTH_MODE=supabase`, `AUTH_TRUST_HOST=true`, `AUTH_URL=<URL do serviço>`, `NEXT_TELEMETRY_DISABLED=1` | `AUTH_URL` **não** pode ser o da Vercel; o script confere a URL publicada |

**Estados do serviço — mínimo 0 não é "desligado":**

| Estado | Como | O que acontece | Custo |
|---|---|---|---|
| Ativo, autoescala ("Retomar") | público; mínimo 0, máximo 3 | atende qualquer acesso; sobe instância sob demanda (partida a frio de alguns segundos) | só o tempo de requisições atendidas |
| Janela ("Janela") | público; mínimo 1, máximo 3 | 1 instância sempre pronta | + tempo ocioso da instância mínima |
| **Desativado ("Desativar")** | **acesso público removido** + mínimo 0 | requisições públicas recebem 403; segundo a página de preços, "requests denied by IAM policy are not billed" e instâncias ociosas que não são mínimas não são cobradas | nenhum de execução; restam armazenamento da imagem e segredos (centavos) |
| Encerrado ("Encerrar") | serviço, imagens e segredos apagados; faturamento desvinculado | nada roda | zero |

## 3. Custo (preços oficiais lidos em 22/10/2026)

**Preços de `southamerica-east1`** — [Cloud Run pricing](https://cloud.google.com/run/pricing), cobrança por requisição:
CPU ativa US$ 0,0000336/vCPU-s; CPU ociosa (instância mínima) US$ 0,0000035/vCPU-s; memória ativa e ociosa
US$ 0,0000035/GiB-s; requisições US$ 0,40/milhão. Saída de internet (Premium, origem São Paulo, qualquer destino até
1 TiB) US$ 0,19/GiB, **sem franquia** (o 1 GiB grátis vale só na América do Norte) — [Network pricing](https://cloud.google.com/vpc/network-pricing).
Artifact Registry: US$ 0,10/GiB-mês acima de 0,5 GiB — [preços](https://cloud.google.com/artifact-registry/pricing).
Secret Manager: 6 versões ativas e 10.000 acessos/mês gratuitos — [preços](https://cloud.google.com/secret-manager/pricing).
Franquia do Cloud Run (só cobrança por requisição, por conta de faturamento, a preço de `us-central1`): 180.000 vCPU-s,
360.000 GiB-s e 2 milhões de requisições/mês (≈ US$ 6,02 de valor).

**Câmbio e premissas:** PTAX venda 22/10/2026 **R$ 5,0383** (Banco Central); IOF 3,5% no cartão (premissa, confirmar
com o emissor); spread do emissor não incluído. Fator: R$ = US$ × 5,2146. Por instância de 2 vCPU/2 GiB: ativa
US$ 0,0000742/s; ociosa (mínima) US$ 0,000014/s.

| Cenário (limites superiores) | Base | Sem franquia (US$) | Com franquia (US$) |
|---|---|---|---|
| Homologação funcional | ~1 h de instância ativa acumulada; ~0,2 GiB de saída | 0,31 | 0,04 |
| Ensaio (3 rodadas) | janela de 2 h com mínimo 1 (ocioso ≈ US$ 0,10); até 2 instâncias ativas 15 min por rodada; ~10.800 requisições; ~0,6 GiB | 0,62 | 0,21 |
| Aula | janela de 2 h com mínimo 1 (ocioso ≈ US$ 0,10); 1 instância ativa 45 min; ~20.000 requisições; ≤ 0,5 GiB (sem CDN: JS e CSS saem do próprio serviço) | 0,40 | 0,20 |
| Artifact Registry | até 3 versões de ~0,22 GiB comprimidas (seção 9) ≈ 0,65 GiB, 0,5 grátis | ≤ 0,02 | ≤ 0,02 |
| Secret Manager | 3–6 versões, acessos na partida das instâncias | 0 (dentro da franquia própria) | 0 |
| **Total estimado do mês do piloto** | | **≈ US$ 1,35 ≈ R$ 7** | **≈ US$ 0,47 ≈ R$ 2,50** |

No cenário "com franquia", o tempo **ocioso** da instância mínima foi mantido como cobrado: a franquia é descrita "a
preço ativo" e não confirmei que cubra o tempo ocioso.

**Riscos de custo (não são estimativas de gasto):**
- instância mínima esquecida ligada 30 dias: 2.592.000 s × US$ 0,000014 ≈ **US$ 36 ≈ R$ 189**;
- pior caso teórico com o serviço público (3 instâncias ativas 24 h por 30 dias, por exemplo tráfego indevido):
  ≈ **US$ 577 ≈ R$ 3.009** — limitado pelo máximo de 3 instâncias; evitado deixando o serviço **Desativado** fora do uso.

**Desconhecidos:** preço do Cloud Logging e dos orçamentos (não conferidos nesta revisão; volume esperado de logs
< 1 GiB); disponibilidade da franquia na conta do Fabio (se a conta de faturamento já usar Cloud Run, a franquia pode
estar consumida — por isso o cenário "sem franquia").

**Alerta ≠ limite.** O orçamento de US$ 5 só envia e-mail: "doesn't automatically cap … usage or spending"; os custos
chegam ao faturamento com atraso e o primeiro aviso pode levar horas ([Budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)).
Não há garantia de aviso antecipado. Proteção real: máximo de 3 instâncias + estado **Desativado** fora do uso.
**Opção (decisão do Fabio):** *spend cap* do Cloud Run no projeto ([Spend caps](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps),
Cloud Run elegível): **pausa o serviço** ao passar do valor (ex.: US$ 20), mas a aplicação "isn't instant", excedentes
são cobrados e uma pausa **durante a aula** derrubaria o acesso; configuração pelo console.

## 4. Decisões e intervenções do Fabio

1. **Decisão financeira:** cadastrar cartão numa conta de faturamento Google Cloud e aceitar:
   gasto estimado **≈ R$ 2,50–7 no mês do piloto** (limite superior ~R$ 10 com margem), riscos da seção 3, alerta de US$ 5
   (só aviso) e, se quiser, *spend cap* (com o risco de pausa).
2. **Decisão à parte:** Supabase Free × Pro (US$ 25/mês ≈ R$ 130; sem pausa por inatividade e com chamado de suporte).
3. Instalar o Google Cloud CLI e rodar `gcloud auth login`.
4. Rodar as etapas `Projeto` e `Segredos` (seção 5), numa janela PowerShell onde as variáveis do piloto existem.
5. Logins das contas sintéticas na homologação; envio da consulta ao Supabase (seção 7).

## 5. Comandos (PowerShell)

Pré-requisitos na janela: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidas
(o script confere a presença sem exibir valores). Em todas as etapas o projeto vai **duas vezes** e o script confere o
projeto ativo do `gcloud`, a conta logada e para no primeiro erro (inclusive de comando externo).

```powershell
Set-Location C:\Users\profabio77\iah-piloto-1a\app\scripts\windows
$P = '<id-do-projeto>'          # ex.: iah-piloto-beryon-1a
# [Fabio] projeto, faturamento, serviços, alerta, repositório e conta de serviço
.\piloto-cloudrun.ps1 -Etapa Projeto  -Projeto $P -ConfirmarProjeto $P -ContaFaturamento '<XXXXXX-XXXXXX-XXXXXX>'
# [Fabio] segredos (AUTH_SECRET novo; os demais vêm das variáveis da janela)
.\piloto-cloudrun.ps1 -Etapa Segredos -Projeto $P -ConfirmarProjeto $P
# [Claude Code] imagem a partir do SHA exato e envio ao Artifact Registry
.\piloto-cloudrun.ps1 -Etapa Imagem   -Projeto $P -ConfirmarProjeto $P -Sha '<sha-40>'
# [Claude Code] publicação (cobrança por requisição, autoescala 0..3) e conferência
.\piloto-cloudrun.ps1 -Etapa Publicar -Projeto $P -ConfirmarProjeto $P -Sha '<sha-40>'
.\piloto-cloudrun.ps1 -Etapa Conferir -Projeto $P -ConfirmarProjeto $P
# Fora do uso: desativar. Para homologar: Retomar. Ensaio/aula: Janela (e depois Retomar ou Desativar).
.\piloto-cloudrun.ps1 -Etapa Desativar -Projeto $P -ConfirmarProjeto $P
```

Conferências após publicar (como nas seções 16 e 19 do registro): URL igual à esperada; imagem e *digest* publicados =
enviados; rótulo `revision` = SHA; `/api/versao` com sessão de gestor → SHA, `modo supabase`, `ambiente cloudrun-sao-paulo`;
região; segredos referenciados só pelo nome.

## 6. Sequência até a aula

| Etapa | O quê | Quem |
|---|---|---|
| 1. Publicação | seções 4–5; serviço termina **Desativado** | Fabio (decisão, Projeto, Segredos) · Claude Code (Imagem, Publicar, Conferir) |
| 2. Homologação funcional (dados sintéticos, só leitura) | "Retomar"; linha de base do banco; aluno extra (devolutiva), F1 (rascunho), professor (último acesso em Brasília), gestor (G1–G4), "Esqueci minha senha"; integridade antes/depois; "Desativar" | logins: Fabio · conferências: Claude Code · revisão: ChatGPT |
| 3. Condições do Supabase | consulta escrita (seção 7) e resposta; projeto ativo; cópia de segurança | Fabio envia · Claude Code confere |
| 4. Turma de capacidade | `class-ensaio-cap32`, 32 alunos sintéticos pela importação oficial (`expectedTotal: 32` só nessa configuração) | autorização e execução: Fabio |
| 5. Ensaio | "Janela"; protocolo e critérios inalterados (seção 8); "Desativar" ao fim | Fabio executa · Claude Code prepara e analisa |
| 6. Avaliação | seção 8 | Claude Code registra · ChatGPT revisa · Fabio decide |

## 7. Supabase — condições e consulta (antes do ensaio)

Condições vigentes (fontes oficiais, 22/10/2026): testes no próprio projeto sem aprovação prévia, mas **request flooding
proibido** ([Security testing](https://supabase.com/docs/guides/security/security-testing)); aviso de 2 semanas exigido
só de Team/Enterprise para carga pesada ([Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod));
projeto Free pode ser pausado após 7 dias de pouca atividade; compute Nano (CPU compartilhada, 0,5 GB). Conferir no dia:
projeto ativo, sem pausa; cópia lógica (`piloto-copia-seguranca.cmd`) antes e depois.

Texto da consulta (security@supabase.com ou suporte), enviado pelo Fabio:

> Subject: Planned load test on our own project (feyfodhcvytcxtjjlarj, sa-east-1, Free plan)
>
> We plan a short, rate-limited load test of our own staging project before a school pilot: 32 synthetic accounts, up
> to 25 concurrent submissions, a client-side cap of 50 HTTP requests/s to our app (estimated 115–770 PostgREST calls/s
> for a few seconds at peak, ~28,000–60,000 calls per 13–15 min run), at most 3 runs with ≥ 15 min between them in one
> 2-hour window, from one IP in Brazil. The test stops automatically on the first unexpected error, 429, timeout or
> connection error. Only synthetic data. Is this acceptable under your policies for the Free plan, and is there anything
> you would like us to change (rate, window, plan or compute size)?

## 8. Ensaio — rodadas planejadas × critérios (protocolo `piloto-1a-protocolo-capacidade-2026-10-20.md`)

```powershell
.\piloto-cloudrun.ps1 -Etapa Janela -Projeto $P -ConfirmarProjeto $P
Set-Location C:\Users\profabio77\iah-piloto-1a\app
node --experimental-strip-types scripts\pilot-ensaio-1a.mjs --modo=hospedado `
  --students=32 --peak-submitters=25 --entry-window=60 --autosave-min=10 --drafts=3 --reviews=5 `
  --max-rps=50 --rps-burst=25 --timeout-ms=15000 --max-duration-s=1200 `
  "--base-url=<URL do serviço>" `
  "--contas=C:\piloto\capacidade\cred-turma-cap32.csv" "--contas-extra=C:\piloto\ensaio-2alunos\cred-extra.csv" `
  --institution=inst-ensaio-1a --turma=class-ensaio-cap32 --turma-extra=class-ensaio-extra `
  "--out=C:\piloto\capacidade\resultado-cloudrun-rodada-N.json" "--confirm-project=$env:IAH_HOMOLOGATION_PROJECT_REF"
if ($LASTEXITCODE -ne 0) { Write-Host "Rodada NAO aprovada ou interrompida (codigo $LASTEXITCODE): nao iniciar outra sem rever a causa." }
.\scripts\windows\piloto-cloudrun.ps1 -Etapa Desativar -Projeto $P -ConfirmarProjeto $P
```

| | Conteúdo | Origem |
|---|---|---|
| **Critério de aprovação de cada rodada** (inalterado) | **zero erros em todo o fluxo** (qualquer etapa); p95 login ≤ 2.000 ms; p95 leitura da missão ≤ 1.000 ms; p95 gravação ≤ 1.500 ms (envio e salvamento automático, julgados à parte); p95 leitura do professor ≤ 1.500 ms; integridade (32 entregas = reflexões = registros de IA; 5 devolutivas; 0 duplicadas; 0 trocadas); verificações funcionais "ok"; rodada concluída sem interrupção | `LIMITES` de `pilot-ensaio-1a.mjs`; protocolo §7 |
| **Condição de liberação da aula** (original) | o ensaio hospedado aprovado **três vezes seguidas** | preparação de 15/10 (`piloto-1a-preparacao-2026-10-15.md`, item 1) |
| **Quantidade planejada** (operação, não critério) | até 3 rodadas por janela de até 2 h, intervalo ≥ 15 min; após interrupção, nenhuma nova rodada no mesmo dia sem rever a causa | protocolo §4 e §6 |

A espera imposta pelo limitador do gerador fica fora das latências julgadas (já era assim). A reprovação histórica
(p95 1.520 ms) continua registrada. Monitoramento: métricas e logs do Cloud Run e painel do Supabase.

**Se aprovado — operação da aula no Cloud Run:** mesma revisão do ensaio; "Janela" de 30 min antes a 30 min depois da
aula, depois "Desativar"; URL `*.run.app` distribuída pela escola; cópia de segurança antes e depois; a Vercel fica só
como contingência de emergência (mesmo banco; capacidade **não comprovada**).

**Se reprovado — diagnóstico com evidências, sem afrouxar critério:** cruzar o JSON do gerador (p95 por fase, espera do
limitador, concorrência, erros) com as métricas do Cloud Run (CPU, instâncias, latência por requisição) e do Supabase
(CPU, conexões, latência da API). Causas e correções: CPU da aplicação → mais CPU/instâncias; banco (CPU Nano saturada)
→ compute maior (decisão de plano) ou menos chamadas por ação (mudança de código, com testes); rede → repetir a partir
da rede da escola. Nova rodada só depois da correção registrada.

## 9. Evidências locais da imagem (sem nada hospedado)

1. **Validação de build e segredos** (registro, seção 21): imagem em modo real com segredos descartáveis; **0 ocorrências**
   dos segredos de build no sistema de arquivos e no histórico; sem `.env`, `.vercel`, testes ou scripts.
2. **Exercício funcional da imagem** (registro, seção 22): imagem gerada pelo `Dockerfile` desta revisão (base fixada por
   *digest*), ligada a um banco temporário (PostgreSQL + PostgREST) com contas sintéticas provisionadas pela CLI oficial;
   suítes e2e contra o contêiner: **17/17** — `percurso-pedagogico` 10/10 (login, gravação de rascunho, saída e retomada
   em outra sessão, entrega e reflexão, reenvio sem duplicar, devolutiva, nova execução) e `credenciais` 7/7 (recuperação
   assistida, limitador, `/api/versao`, "Esqueci minha senha", títulos). Configuração em execução: usuário `node`,
   `NODE_ENV=production`, `PORT=8080`, `TZ=UTC`, Node 24.22.1, `IAH_AUTH_MODE`, `AUTH_TRUST_HOST`, `AUTH_URL` e os 3
   segredos presentes (valores não exibidos); 25 Server Actions no build. Segredos de build na imagem: **0** (arquivos e
   histórico). Tamanho: ~1,0 GB descompactada, **~234 MB comprimida**. A imagem de publicação terá outro *hash* (valores
   reais nos *build args*), mas sai do mesmo `Dockerfile` e do mesmo SHA. Os resultados anteriores fora do contêiner
   (e2e 71/71, integração 93/93) seguem como evidência separada.

## 10. Encerramento e retorno

1. Fora do uso: **"Desativar"** (sem acesso público e sem instância mínima). Mínimo 0 sozinho **não** desliga o serviço.
2. Ao fim do piloto ou se a opção for abandonada: **"Encerrar"** (apaga serviço, imagens e segredos) e
   `gcloud billing projects unlink <projeto>`; opcional `gcloud projects delete <projeto>` (30 dias para recuperar).
3. Apagar `C:\piloto\restrito\cloudrun\`.
4. **A Vercel não é alterada em nenhuma etapa:** `iah-piloto-beryon.vercel.app`, o deploy `dpl_MstnwksqP8…` e as
   referências de rollback seguem como estão.
5. Dados: o mesmo banco; registros sintéticos do ensaio ficam como evidência ou são removidos só depois de cópia de
   segurança e autorização. Resultados (JSON, logs, SHA, revisão) no `REGISTRO.md`, sem apagar reprovações.
