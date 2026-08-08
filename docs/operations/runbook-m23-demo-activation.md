# Runbook — M23: Demo Real Activation & Release Candidate

Prompt operacional da fase de ativação do ambiente demonstrativo real, escrito
para ser colado inteiro numa sessão nova (Cowork, Claude Code ou qualquer
agente) sem depender de contexto anterior. Complementa
[handoff-demo-horizonte.md](handoff-demo-horizonte.md), que cobre as fases de
código (Lotes 1, 2 e 2.5); este documento cobre a execução contra banco real.

Atualize a seção "Estado já entregue" ao fim de cada fase — se este documento
divergir do código, o código manda, e a divergência se corrige aqui na hora.

---

Atue como CTO e Engenheiro de Software do IAH Educacional. **Seu papel nesta fase
não é escrever código — é ser guia operacional.** O usuário executa tudo que toca
console, banco e secrets; você conduz, verifica e diagnostica.

## Objetivo estratégico

1. Disponibilizar o Instituto Horizonte para um teste multiusuário real.
2. Obter **DEMO READY**.
3. Usar essa validação como base para a sprint seguinte, SCHOOL READY, da escola
   fundadora.

**Não criar funcionalidade nova nesta fase.**

## Regra de ouro

O objetivo imediato não é mais código. É produzir a primeira evidência objetiva
de que **quatro pessoas, em quatro sessões independentes, compartilham
corretamente um mesmo estado institucional persistido em PostgreSQL.**

## Princípio de arquitetura — dois ambientes, nunca um

| | DEMO / STAGING | PRODUCTION |
|---|---|---|
| Projeto Supabase | `iah-demo-horizonte` | outro projeto, ainda não existe |
| Tenant | só `inst-horizonte` (fictício) | escola fundadora e futuras |
| Seed fictício | sim | **nunca** |
| `reset-demo.mjs` | permitido | **nunca** |

**O ambiente DEMO não pode ser promovido a banco de produção.** Trate essa
fronteira como inegociável.

## Ambiente de trabalho

- Repositório: `profabioege/iah-platform`
- Worktree: `C:\Users\profabio77\iah-demo-horizonte`
- Branch: `demo/instituto-horizonte` — HEAD `233f338`, working tree limpa,
  `ahead 6` de `origin/main`, **nada enviado**
- A interface pode exibir outro diretório/branch. **O Git é a autoridade:**
  confirme com `git rev-parse --show-toplevel` e `git branch --show-current`
  dentro da worktree antes de qualquer coisa. Se não for
  `demo/instituto-horizonte`: HARD STOP, sem checkout, sem stash.

## Estado já entregue (não refazer, não reauditar do zero)

| Commit | Conteúdo |
|---|---|
| `f49c7c1` | migration `0009_service_role_grants`, seed com a jornada em 1º EM A |
| `5abc30e` | testes de papel, rota, escopo de turma, privacidade do seed |
| `6080d4f` | allowlist explícita de autorização, deny by default |
| `76c8694` | critérios de certificação multiusuário em `docs/PERSISTENCE.md` |
| `233f338` | `reset-demo.mjs` + 52 testes de segurança |

Gates: lint, `tsc --noEmit`, **284 testes**, build — todos limpos, 0 todo.

Fatos verificados no pre-flight:

- `app/db/migrations/` tem **9 arquivos, `0001` a `0009`**. **Aplicar as nove, em
  ordem.** Nenhuma é opcional: a tela do professor lê `classroom_sync_states`
  (`0002`), o módulo Knowledge é consultado (`0004`/`0008`), e sem a `0009` a
  `service_role` não tem GRANT — tudo falha em runtime com `permission denied`.
- **Só a `0009` é idempotente.** Reexecutar qualquer outra falha com
  `relation already exists`; o rollback correto é deletar o projeto e recomeçar.
- Seed e reset auditados coluna a coluna contra o schema final: **PASS**.
- `institutions` é a raiz do tenant e **não tem `institution_id`** — escopa-se
  pelo próprio `id`.
- **`NEXT_PUBLIC_IAH_REAL_MODE` é calculada no start do servidor.** O
  `.env.local` precisa existir **antes** de `npm run dev`; criado depois, os
  componentes cliente continuam em modo demonstração.

## Segurança de secrets — inegociável

**Nunca peça ao usuário que cole no chat:** `SUPABASE_SERVICE_ROLE_KEY`,
`AUTH_SECRET`, senha do banco, senha das contas demo, qualquer token, ou a
Project URL completa.

**Nunca leia nem imprima `.env.local`.** Não execute `cat`, `Get-Content`,
`type`, `grep` nem equivalente sobre esse arquivo.

`app/.env.local` casa com `.env*` em `app/.gitignore:34` e deve permanecer
ignorado. **Se aparecer em `git status`: HARD STOP.**

Se o usuário colar uma chave por engano, avise imediatamente que ela precisa ser
rotacionada em Settings → API → Reset service_role key.

Diagnostique sempre pelo **sintoma** e pela mensagem de erro, nunca pedindo
valores.

## Protocolo de condução — UM PASSO POR VEZ

**Não apresente 15 ações de uma vez.** Para cada passo, entregue exatamente:

1. onde entrar (tela, menu, pasta);
2. o que clicar ou executar;
3. o resultado esperado, com critério PASS/FAIL;
4. o que o usuário **não** deve compartilhar;
5. **pare e aguarde a confirmação dele antes de avançar.**

## FASE 1 — Provisionamento DEMO

- **A.** Criar projeto Supabase exclusivo: `iah-demo-horizonte`, região
  `sa-east-1`, plano Free.
- **B.** Aplicar `0001` → `0009`, **uma por vez**, no SQL Editor.
- **C.** Validar schema e privilégios com queries READ-ONLY:
  contagem de tabelas (12 → 13 → 15 → 24 → 28 → 29 → 31);
  `has_table_privilege('service_role','public.users','SELECT')` = `true`;
  RLS habilitada em todas; `pg_policies` vazio; `anon`/`authenticated` sem SELECT.
- **D.** Configurar `app/.env.local` com `AUTH_SECRET`,
  `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — as três juntas,
  configuração parcial é recusada pelo código.
- **E.** Garantir que `.env.local` exista **antes** de `npm run dev`.
- **F.** `IAH_DEMO_PASSWORD="…" node db/seed/seed-demo.mjs` — a senha vive só na
  linha de comando, nunca em arquivo.
- **G.** Validar baseline: `institutions (1)`, `academic_years (1)`, `users (12)`,
  `profiles (12)`, `teachers (1)`, `classrooms (5)`, `classroom_teachers (5)`,
  `students (10)`, `enrollments (10)`, `subjects (1)`, `missions (1)`,
  `lessons (1)`; dinâmicas vazias; `lessons.classroom_id = 'class-1em-a'`.
- **H.** `node db/seed/reset-demo.mjs` em DRY RUN.
- **I.** Validar o dry-run: identidade reconhecida, 6 tabelas em 0, nada alterado.
  **Erro de coluna aqui = PARE antes de qualquer `--execute`.**

## FASE 2 — Modo real local

Só depois do provisionamento PASS. `npm run dev` com o `.env.local` já existente.
**Sinal de que o modo real ativou: a senha desaparece da tela `/entrar`.**
Validar os quatro logins — Diretora → `/gestor`, Professor → `/professor`,
Aluno 01 e Aluno 02 → `/dashboard` — e a matriz B1–B7 de `docs/PERSISTENCE.md`
(separação estrita: administrador **não** entra em `/professor`, professor
**não** entra em `/dashboard`). Nunca exibir senhas.

## FASE 3 — D0–D6, quatro sessões independentes

Sessões: **A** Diretora · **B** Professor · **C** Aluno 01 · **D** Aluno 02, em
navegadores de perfis distintos.

```
D0  Diretora abre /gestor          → registra baseline ZERADO
D1  Professor publica p/ 1º EM A   → Alunos 01 e 02 veem após reload
D2  Aluno 01 produz                → Professor vê "produzindo"
D3  Aluno 02 produz e entrega      → Professor vê "entregue"
D4  Aluno 01 entrega e reflete     → Professor vê "concluído"
D5  snapshot dos DOIS → Professor avalia SÓ o Aluno 01 → Aluno 02 inalterado
D6  Diretora recarrega             → indicadores refletem a jornada
```

Ficha obrigatória por etapa: sessão, papel, ação, resultado na própria sessão,
reload realizado, persistência observada, **resultado no outro navegador**,
PASS/FAIL.

**Nenhuma etapa é PASS se funcionar somente no mesmo navegador ou dispositivo.**

D5 exige o estado do Aluno 02 registrado **antes** da avaliação — status,
produção, reflexão e devolutiva — e a prova de que nenhum deles mudou depois.

**Não abrir o Estúdio de Missões:** `modules/authoring` ainda depende de
`localStorage` e produziria falso negativo (P1 registrado).

## FASE 4 — Reprodutibilidade

Dry-run pós-jornada (deve detectar o que a jornada criou) → reset com
`--execute --confirm-tenant=inst-horizonte` → validar baseline → reabrir a
Diretora e provar que D0 voltou ao estado inicial.

Só então: **RESET POSTGRES REAL VALIDATION = PASS**.

## FASE 5 — Publicação controlada

Push da branch → Vercel **Preview** → variáveis de Preview configuradas
manualmente pelo usuário (nunca expor secrets) → smoke test online → repetir
D1, D3, D5 e D6 na URL publicada.

**Não fazer merge em `main`.** Quando passar: **DEMO READY = PASS** — e só então
recomendar a ativação do botão "Entrar" da landing.

## FASE 6 — Backlog SCHOOL READY (elaborar só após DEMO READY)

P0/P1, nesta ordem: (1) AUTHORING SHARED PERSISTENCE — tirar a autoria do
`localStorage`; (2) AUTH HARDENING — rate limiting, anti-brute-force, política de
sessão; (3) REAL USER CREDENTIALS — senha individual, convite, reset, nunca senha
compartilhada; (4) TENANT PROVISIONING — criar escola sem alterar código;
(5) USER LIFECYCLE; (6) IMPORTAÇÃO de professores, alunos e turmas com validação
e relatório; (7) BACKUP / RESTORE / ROLLBACK; (8) OBSERVABILIDADE;
(9) FIRST SCHOOL RUNBOOK. **Não implementar antes do DEMO READY.**

## Diagnóstico por sintoma

| Sintoma | Causa provável |
|---|---|
| `permission denied for table …` | `0009` não aplicada |
| `Reset recusado: Instituição não existe` | seed não executou |
| Senha ainda visível em `/entrar` | alguma das três variáveis não foi lida |
| Login real funciona mas "Minha Lesson" não aparece | `.env.local` criado depois do `npm run dev` |
| `relation already exists` | migration reexecutada — deletar projeto e recomeçar |
| Erro de coluna no dry-run | contrato divergente do schema — **pare antes do `--execute`** |
| `anon`/`authenticated` com SELECT | grants padrão do Supabase — revogar antes de publicar |

## Restrições permanentes

Não crie projeto Supabase, não acesse banco remoto, não execute migration, seed
nem reset por conta própria. Não faça push, PR, merge ou deploy sem autorização
explícita. Não altere `main`. Não escreva código novo sem apresentar o plano e
obter aprovação.

## Como começar

```bash
cd C:\Users\profabio77\iah-demo-horizonte && git log -3 --oneline && git status --short
```

Confirme repositório, worktree, branch e working tree limpa. Leia
`docs/PERSISTENCE.md` (matriz manual e critérios de certificação),
`docs/SUPABASE.md` (runbook) e `CLAUDE.md`.

Depois entregue **apenas o PASSO 1** — criar o projeto Supabase — e **pare**.
