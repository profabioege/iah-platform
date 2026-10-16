# Piloto 1ª série A — Estado em 16/10/2026

Etapa atual: **teste pedagógico pessoal e não comercial**, com autorização institucional já concedida (informação do Prof. Fabio, 16/10). Nenhum aluno real importado. Piloto **não liberado**.

## 1. Candidata

| Item | Valor |
|---|---|
| Repositório | `IAH - Educacional` (app em `app/`) |
| Branch | `pilot/beryon-1a-2026` — sem trabalho posterior a `3a9d46d` encontrado no computador (15/10); seguem commits desta etapa |
| Migrations | 0001–0023 + **0024** (nova: tira EXECUTE de anon/authenticated nas funções de gatilho; só revoga) |
| Testes | unidade 480/480 · integração 92/92 (com a 0024) · homologação HTTP 64/64 (15/10) |

## 2. Infraestrutura efetivamente criada e conferida

### Banco — Supabase `iah-beryon-piloto`
| Item | Conferido |
|---|---|
| Ref | `feyfodhcvytcxtjjlarj` |
| Organização / plano | IAH Educacional · **free** (nenhuma cobrança; nenhum outro projeto alterado) |
| Região | `sa-east-1` (São Paulo) |
| Estado | ACTIVE_HEALTHY (criado 16/10 13:41 UTC) |
| Schema | migrations aplicadas e comparadas com o banco local de testes: colunas, restrições, **100 políticas RLS**, **51 funções** (código normalizado), gatilhos, **229 índices**, RLS por tabela e privilégios do papel `iah_app` — **idênticos**. Diferenças só nos padrões do Supabase (privilégios extras da `service_role`; EXECUTE de anon/authenticated em funções auxiliares sem SECURITY DEFINER) |
| Papel de menor privilégio | `grant iah_app to authenticator` aplicado |
| Linter de segurança | 0 alertas WARN após a 0024; restam 16 avisos INFO "RLS sem política" — negação por padrão, intencional (`users`, `profiles`, trilha, limitador, acervo) |
| Chave pública legada (anon/HS256) | ativa — necessária ao cliente de menor privilégio |
| Dados | Missão 01 registrada no catálogo; **0 usuários, 0 alunos, 0 matrículas, 0 instituições** |

### Aplicação — Vercel `iah-piloto-beryon`
| Item | Conferido |
|---|---|
| Projeto | `prj_eI7cLkGD5tgiBmw43yXx0uPPvC0z`, conta `fabio-eges-projects`, plano **Hobby** (uso pessoal e não comercial, conforme informado) |
| Separação | projeto novo; `iah-platform` (produção), `iah-site`, demonstrações e Aprova ENEM **não foram tocados** |
| Acesso dos alunos | Vercel Authentication **desligada** neste projeto (alunos não precisam de conta Vercel); sem senha de projeto; prévias desativadas |
| Região das funções | `gru1` (São Paulo) solicitada na criação — **conferir na primeira implantação** |
| Variáveis já gravadas | `IAH_AUTH_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AUTH_URL`, `AUTH_TRUST_HOST`, `NEXT_PUBLIC_BUILD_BRANCH`, `NEXT_PUBLIC_BUILD_ENVIRONMENT`, `NEXT_TELEMETRY_DISABLED` |
| Variáveis secretas | **pendentes**: `AUTH_SECRET` (o script gera sem exibir), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (copiar do painel do Supabase) |
| Google | `GOOGLE_CLIENT_ID/SECRET` **não** definidos (o login Google cria professor) |
| Implantação | **nenhuma ainda** — endereço previsto `https://iah-piloto-beryon.vercel.app` |

**Por que a implantação não saiu daqui (evidência):** a integração com a Vercel responde 403 "Not authorized … scope fabio-eges-projects" quando a chamada leva o `teamId` (ex.: requestId `iad1:sfo1::gx4b5-1792162319665-c0ccfd8a9011`); sem o `teamId` ela lista e cria projetos, mas enviar o código exige subir ~360 arquivos pela API ou publicar a branch no GitHub (push não autorizado). O ambiente desta sessão e a VM do computador não alcançam `vercel.app`/`supabase.co` (proxy 403). Por isso a publicação é feita **pelo CLI da Vercel no seu Windows**, a partir de uma pasta exportada que já aponta para o projeto do piloto.

> Atenção: a raiz do repositório tem `.vercel/project.json` apontando para **iah-platform**. Nunca rode `vercel deploy` na raiz. O script de implantação recusa pasta que não seja a do piloto.

## 3. Validação da lista (sem importar)

Arquivo recebido: planilha com colunas **"Nome Completo"** e **"E-mail"** (1 aba). Convertida para o formato do validador **fora do repositório**; nada foi gravado no banco nem no Git.

| Verificação | Resultado |
|---|---|
| Registros | **31** |
| Quantidade planejada | 35 → **divergência de 4** (bloqueia a importação até a escola confirmar o total) |
| Coluna de turma | **ausente** na planilha. O título do arquivo indica "1 A", mas nenhuma linha traz a turma → **pertencimento exclusivo à 1ª série A pendente de confirmação** (não presumido) |
| Nomes ausentes | 0 |
| E-mails ausentes / inválidos / repetidos | 0 / 0 / 0 |
| Domínio | 1 único domínio institucional em 31/31 e-mails — **confirmar com a TI que é o domínio oficial dos alunos** |
| Espaços sobrando, maiúsculas em e-mail | 0 |
| Homônimos | 0 |
| E-mails genéricos (secretaria, turma etc.) | 0 |
| Contas e matrículas existentes | o banco do piloto tem 0 usuários → **nenhum conflito possível**; a conferência por e-mail será refeita no momento da importação |
| Resultado | **NÃO IMPORTAR** até: (1) a escola confirmar o total (31 ou 35); (2) confirmar que todos os 31 são da 1ª série A (ou incluir a coluna de turma); (3) confirmar o domínio |

Nenhum nome, e-mail ou turma foi corrigido. A planilha original continua só com você e na área temporária desta sessão.

## 4. Verificações na URL hospedada

**Ainda não executadas** — não há implantação. Preparado:
- `piloto-implantar-vercel.cmd` — login no CLI, gravação das 3 variáveis secretas e publicação de produção;
- `piloto-verificar-fluxo-hospedado.cmd` — com **3 contas sintéticas, uma por vez** (não é teste de carga): professor atribui → aluno acessa → salva → entrega produção e reflexão → professor acompanha e orienta → aluno lê a orientação em nova sessão; troca de aluno no mesmo navegador; isolamento entre alunos e entre turmas; confirmação no banco.

Eu não entro com senha em sistemas hospedados; por isso a verificação com login roda no seu computador e eu analiso o arquivo de resultado (só dados sintéticos).

## 5. Concorrência (carga) — **pendente**

A documentação da Vercel consultada não traz autorização para teste de carga automatizado no plano Hobby. O ensaio de 35 alunos / pico de 25 (`piloto-ensaio-hospedado.cmd`) está pronto, mas **não deve ser rodado** sem essa autorização. A verificação funcional não comprova capacidade simultânea; os limites (p95 login ≤ 2 s, leitura ≤ 1 s, gravação ≤ 1,5 s, professor ≤ 1,5 s, zero erros) seguem valendo.

## 6. Bloqueios e próxima ação humana

| # | Ação (Prof. Fabio) | Tempo |
|---|---|---|
| 1 | No painel do Supabase, projeto **iah-beryon-piloto**: copiar a chave `service_role` e o **Legacy JWT Secret** (só para colar no passo 2; não enviar a ninguém) | 3 min |
| 2 | Abrir o CMD na pasta exportada `IAH - Educacional\.piloto-1a\app\scripts\windows` e rodar `piloto-implantar-vercel.cmd` (faz login no CLI se preciso, pede as duas chaves, gera o `AUTH_SECRET`, publica) | 10 min |
| 3 | Avisar o Claude para conferir a implantação (região, variáveis, status, páginas públicas) | — |
| 4 | Importar as contas sintéticas e rodar `piloto-verificar-fluxo-hospedado.cmd` (passo a passo em `04-ensaio.md`) | 15 min |

## 7. Pendências separadas

**Tratamento de dados** — respostas da escola em `07-tratamento-de-dados.md` (papéis, base legal, retenção, canal de pedidos, ferramenta de IA); confirmar que o domínio institucional é o dos alunos; local de guarda da lista e das credenciais impressas.

**Comunicação** — aviso no Classroom só depois da importação (texto em `02-importacao-e-acesso.md`, sem senha); comunicado a alunos/responsáveis conforme a escola decidir.

**Operação** — implantação (passos 1–2); verificação funcional hospedada; autorização (ou não) para o ensaio de carga; conferência da TI na sala; confirmação do total e da turma; data e horário da aula; desativar contas sintéticas antes da aula; cópia de segurança antes e depois.
