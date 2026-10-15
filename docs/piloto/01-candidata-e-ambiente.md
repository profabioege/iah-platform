# Piloto 1ª série A — Candidata e ambiente

## 1. Situação encontrada (15/10/2026)

| Item | Estado |
|---|---|
| Repositório | `IAH - Educacional` (plataforma; app Next.js em `app/`) |
| Linha mais recente verificada | `c748c7e` (14/10, local) — 32 commits além de `8f78857`, migrations 0001→0023, 466 testes de unidade, 87 de integração, 64 de homologação por HTTP |
| Snapshot do piloto anterior | `wip/pilot-beryon-snapshot-20261003` (`4c0549d`) — correções de desempenho validadas na homologação de 27–30/09, **ausentes** da linha c748c7e |
| Banco hospedado de homologação | `iah-beryon-homolog` (Supabase, plano gratuito, São Paulo): **pausado**; migrations só até 0015; contém contas sintéticas de carga |
| Aplicação hospedada | **nenhuma** — os ensaios de setembro rodaram a app no Windows do professor contra o banco hospedado |
| Último ensaio hospedado | 45 alunos: **reprovado** nos 4 limites de p95 (login 2957 ms, leitura 5484, gravação 3978, professor 4909), zero erros e integridade completa; a camada de API do plano gratuito saturou ("Thread killed by timeout manager") |
| Ramo de demonstração comercial | `demo/candidata-comercial` (`723646b`) — **não serve ao piloto** (ambiente demonstrativo, dados fictícios) |

## 2. Candidata escolhida

**Branch `pilot/beryon-1a-2026`**, criada a partir de `c748c7e` (não de 8f78857), com:
1. o porte das correções de desempenho do snapshot `4c0549d`: verificação de senha assíncrona; conferência do ator **uma vez por requisição** com as 4 consultas em paralelo; estado do ciclo derivado sem reler a turma depois de gravar (com teste que prova igualdade com a releitura);
2. importação CSV da 1ª série A com validação prévia (`02-importacao-e-acesso.md`);
3. correções de provisionamento: e-mail de outra instituição nunca é reaproveitado; aluno já cadastrado é reaproveitado, não duplicado;
4. painel do gestor sem números demonstrativos no modo real e com a participação da **missão publicada na turma**;
5. dois ajustes de texto na Missão 01; ferramentas de ensaio, cópia/restauração e indicadores da aula.

Nada foi publicado, enviado ou implantado. Testes nesta branch: ver `04-ensaio.md`.

## 3. Ambiente hospedado recomendado

O computador do professor **não** é servidor. Dois serviços, ambos já usados pelo projeto:

### Banco — projeto Supabase **exclusivo do piloto**
- Novo projeto `iah-beryon-piloto`, região **São Paulo (sa-east-1)**, plano gratuito (não há autorização para plano pago).
- Separado de produção (`iah-platform`), demonstração e homologação: segregação física dos dados reais.
- Migrations 0001→0023 em ordem; registro da Missão 01 (`pilot-seed-mission.mjs --id=01-a-fabrica-de-noticias …`).
- O ensaio usa uma **instituição sintética** dentro do mesmo projeto (`inst-ensaio-1a`, duas turmas sintéticas) — mede exatamente a infraestrutura da aula e serve de "outra instituição" nos testes de isolamento. As contas sintéticas são **desativadas** antes da aula.
- Plano gratuito permite 2 projetos ativos: hoje só `iah-platform-dev` está ativo; `iah-beryon-homolog` continua pausado.
- **Pausa por inatividade** (plano gratuito): conferir na véspera e 1 h antes da aula que o projeto está ativo.
- **Recuperação**: o plano gratuito não oferece cópia baixável nem recuperação pontual. Por isso há a cópia lógica (`piloto-copia-seguranca.cmd`) e a restauração em banco vazio (`scripts/pilot-restore.mjs`), ensaiadas em ambiente isolado.

### Aplicação — projeto Vercel **exclusivo do piloto**
- Novo projeto (ex.: `iah-piloto-beryon`), diretório raiz `app/`, endereço estável `https://iah-piloto-beryon.vercel.app` (HTTPS automático, **sem mexer em DNS**). Um subdomínio próprio (`app.iaheducacional.com.br`) pode vir depois, com autorização.
- **Região das funções: São Paulo (gru1)** — a mesma do banco. Com a região padrão (EUA), cada ida ao banco atravessa o continente e a aula fica lenta.
- Variáveis de produção: `IAH_AUTH_MODE=supabase`, `AUTH_SECRET` (novo, exclusivo), `AUTH_URL=https://<endereço>`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (do projeto do piloto).
- **Não definir**: `GOOGLE_CLIENT_ID/SECRET` (o login Google cria professor), `IAH_DEMO_PASSWORD`, `IAH_DEMO_ENVIRONMENT`, `AUTH_ALLOWED_EMAILS`, `RESEND_API_KEY`.
- Implantação pelo CLI a partir da pasta local (não exige push): `cd app && npx vercel deploy --prod` no projeto novo, depois de conferir as variáveis.
- **Atenção — plano Hobby**: os termos da Vercel restringem o Hobby a uso pessoal e não comercial. Um piloto com escola, que embasa decisão comercial, pode não se enquadrar. Decisão do responsável: aceitar o risco para uma aula, ou autorizar o plano adequado.

### Por que não reaproveitar o que existe
| Opção | Motivo para não usar |
|---|---|
| `iah-beryon-homolog` | Está em 0015 (faltam 0016–0023), contém 65 contas de carga e ensaios anteriores; misturar dados reais ali dificulta a segregação e a exclusão no fim. |
| `iah-platform` (produção) | É a produção da plataforma; o piloto precisa de um banco que possa ser apagado inteiro no fim da retenção. |
| App no Windows do professor | Proibido pelo requisito (o computador do professor não pode ser servidor). |

## 4. Autenticação, persistência, segregação e recuperação

| Exigência | Evidência |
|---|---|
| Autenticação real | `IAH_AUTH_MODE=supabase`; Credentials contra a tabela `users` (scrypt); troca obrigatória da senha provisória; ensaio local: 35 logins sem erro. |
| Persistência | Produção, registro de IA, reflexão e devolutiva no banco; nova sessão recupera tudo (ensaio + `tests/pilot/pilot-lifecycle.test.mjs`). |
| Segregação | RLS deny-by-default com papel de menor privilégio; testes de isolamento entre alunos, turmas e instituições (`tests/pilot/pilot-isolation.test.mjs`, `tests/e2e/isolamento.test.mjs`, verificações do ensaio). |
| Recuperação | Cópia lógica → banco apagado → restauração em banco vazio → login e trabalho do aluno de volta; restauração recusa banco com dados (`tests/pilot/backup-restore.test.mjs`). **Ainda falta** ensaiar isso no projeto hospedado (ver `04-ensaio.md`). |
