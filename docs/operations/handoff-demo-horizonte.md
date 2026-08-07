# Handoff — Ambiente Demonstrativo Multiusuário (Instituto Horizonte)

Prompt de retomada da sprint, escrito para ser colado inteiro numa sessão nova
(Cowork, Claude Code ou qualquer agente) sem depender de contexto anterior.
Atualize a seção "O que JÁ está feito" ao fim de cada lote — se este documento
divergir do código, o código manda, e a divergência se corrige aqui na hora.

---

Atue como CTO, Arquiteto de Software e Especialista em Segurança Multi-Tenant do
IAH Educacional. Esta é a continuação de uma sprint já em andamento — o Lote 1
está concluído e commitado. Leia o estado abaixo antes de qualquer ação.

## Objetivo da sprint

Preparar a Plataforma IAH para demonstração institucional controlada, com quatro
perfis (Diretora, Professor, Aluno 01, Aluno 02) funcionando **entre navegadores
e dispositivos diferentes**, usando exclusivamente dados fictícios do Instituto
Horizonte.

Jornada que precisa funcionar ponta a ponta:
Diretora acompanha → Professor publica missão → Aluno 01 e Aluno 02 realizam →
Professor acompanha e avalia → Diretora vê indicadores atualizados.

## Ambiente

- Repositório: `profabioege/iah-platform` · aplicação em `app/`
- Worktree da sprint: `C:\Users\profabio77\iah-demo-horizonte`
- Branch: `demo/instituto-horizonte`, criada a partir de `origin/main` (`d6bb17c`)
- Worktree principal: `C:\Users\profabio77\IAH - Educacional` (branch
  `feature/landing-quem-somos` — **não misturar landing com plataforma**)

## Regras obrigatórias (não negociáveis)

- Não acessar banco remoto, não criar projeto Supabase, não rodar migrations nem
  seed remotos, não executar deploy.
- Não pedir, exibir, abrir ou imprimir secrets, `.env` ou senhas. Se um passo
  falhar, diagnosticar pelo sintoma, nunca pedindo valores.
- Não alterar variáveis da Vercel. Não fazer push para `main`. Não abrir PR sem
  autorização explícita.
- Não modificar código antes de explicar o plano e obter aprovação.
- Nenhum dado real de escola ou estudante. Nenhuma credencial versionada.
- Trabalhar apenas na worktree `demo/instituto-horizonte`.

## Decisões já tomadas (não reabrir sem motivo técnico novo)

1. **Modo real (Supabase)**, não modo demonstração — os critérios de sincronismo
   entre navegadores são inalcançáveis com `localStorage` + memória de processo.
2. Projeto Supabase **novo e dedicado**: `iah-demo-horizonte`.
3. Migration portada renumerada para **`0009_service_role_grants.sql`** (havia
   colisão de `0006`/`0007` entre branches).
4. **Turma da jornada = 1º EM A**, para que `aluno01@` e `aluno02@` sejam
   literalmente Aluno 01 e Aluno 02 no roteiro.
5. Persona da Direção: **Helena Duarte** (fictícia).
6. Nomes reais de menores que existem no branch `feature/mentor-persistence-*`
   (`Sophia Ege`, `Nicolas Ege`) **não são portados** — LGPD.
7. Base `origin/main`: sem módulo de Avaliação, sem D-046, sem Mentor. Entram
   depois por PR normal.
8. Painel da Diretora **começa zerado** — nenhum número fabricado. O dashboard
   vazio é o "antes"; a jornada ao vivo cria os indicadores na frente do cliente.
9. Vercel: **projeto separado**, nunca o de produção.

## O que JÁ está feito (Lote 1 — commit `f49c7c1`)

- `app/db/migrations/0009_service_role_grants.sql` (novo)
- `app/db/seed/seed-demo.mjs` — Lesson → 1º EM A; Direção → Helena Duarte
- `app/src/modules/lesson/seeds/demo-seed.ts` — mesma turma no modo demonstração
- `app/src/modules/platform/seeds/demo-seed.ts` — 1º EM A zerada, progresso
  fictício realocado para as outras turmas
- `docs/SUPABASE.md` e `docs/AUTHENTICATION.md` reescritos (estavam descrevendo
  Colégio Beryon, migrations 0001–0003 e só login Google — tudo obsoleto)

Gates verdes: `npm run migrations:check`, `npm run lint`, `npx tsc --noEmit`,
`npm test` (75/75), `npm run build`.

## O que o humano executa (Passos 8–12, fora do alcance do agente)

8. Criar projeto Supabase `iah-demo-horizonte` (`sa-east-1`).
9. Aplicar no SQL Editor, nesta ordem: `0001` `0002` `0003` `0004` `0005` `0008`
   `0009`. (`0006`/`0007` são da fila de jobs — opcionais.)
10. Criar `app/.env.local` com `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`,
    `SUPABASE_SERVICE_ROLE_KEY`.
11. `IAH_DEMO_PASSWORD="<senha>" node db/seed/seed-demo.mjs`
12. `npm run dev` → abrir `/entrar`. **Sinal de que o modo real ativou: a senha
    desaparece da tela de login.**

## Próxima entrega (Lote 2)

Escrever os testes automatizados, no padrão `node --test` já existente em
`app/tests/*.test.mjs`:

- mapeamento papel → rota inicial (`roleHome`), os 3 papéis
- gates do middleware: 3 papéis × 5 prefixos de rota
- `getWorkspaceContext` filtra turmas do aluno pelas matrículas dele
- Server Actions recusam `role === "student"` e turma fora do contexto
- todo contrato de repositório exige `institutionId`
- seed não contém nome real de estudante

Depois: matriz manual de validação dos 4 perfis em navegadores distintos.

## Lotes seguintes

- **Lote 3** — jornada ponta a ponta em 4 navegadores simultâneos, com prova
  visual de cada etapa; fecha o checklist de `docs/PERSISTENCE.md`.
- **Lote 4** — `app/scripts/reset-demo.mjs` (destrutivo, com `--confirm` e trava
  que recusa qualquer `institution_id` ≠ `inst-horizonte`), runbook em
  `docs/operations/demo-instituto-horizonte.md`, decisão em `DECISIONS.md`,
  atualização de `STATUS.md` e `CHANGELOG.md`.

## Critérios de aceitação finais

1. os quatro perfis autenticam · 2. cada um cai na área correta · 3. permissões
por papel funcionando · 4. Aluno 01 não vê dados do Aluno 02 · 5. ações em um
navegador aparecem nos outros · 6. professor publica e acompanha · 7. os dois
alunos produzem e entregam · 8. diretora vê indicadores coerentes · 9. nenhum
dado real · 10. console sem erros · 11. lint, typecheck, testes e build limpos ·
12. procedimento de reset documentado · 13. nenhuma credencial versionada ·
14. a URL ainda **não** ligada ao botão público "Entrar" da landing.

## Como começar

Confirme o estado antes de propor qualquer coisa:

```bash
cd C:\Users\profabio77\iah-demo-horizonte && git log --oneline -3 && git status
```

Leia `docs/STATUS.md`, `docs/PERSISTENCE.md`, `docs/DECISIONS.md` (D-023, D-039,
D-041, D-047) e `CLAUDE.md`. Apresente o plano do Lote 2 e **aguarde aprovação
antes de escrever código**.
