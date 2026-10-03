# Incremento 1 — Matriz curricular e banco de questões

Primeiro incremento funcional da reformulação do IAH como SaaS escolar para a
1ª, 2ª e 3ª séries do Ensino Médio, nas quatro áreas. Decisão: `DECISIONS.md`
D-049. Inventário de partida: `00-inventario-2026-10-03.md`.

> **Recorte curricular PROVISÓRIO.** Uma habilidade BNCC por área, 1ª série,
> 1º bimestre, com 8 questões sintéticas originais. Substituir pelo currículo
> da escola assim que ele for entregue. Os textos das habilidades foram
> conferidos em bncc.dev (03/10/2026) e precisam ser conferidos com o
> documento oficial do MEC antes de uso em produção.

## O que existe agora

Fluxo completo, com dados sintéticos:

1. **Professor** escolhe a turma → vê as habilidades planejadas para a série
   da turma → escolhe uma habilidade → vê só questões com **versão aprovada na
   revisão** (gabarito, resolução, fonte, rótulo editorial de dificuldade) →
   publica uma lista curta (até 10 itens) — `/professor/banco-de-questoes`.
2. **Aluno** vê as listas da turma, responde (pode salvar e voltar) e entrega
   — `/dashboard/listas`. Só depois da entrega vê acerto, gabarito e resolução.
3. **Professor** consulta respostas por aluno e por habilidade e registra a
   devolutiva — `/professor/banco-de-questoes/listas/[id]`. O aluno lê a
   devolutiva na mesma tela da lista.

Autoria de questão, verificação de direitos e revisão editorial existem no
**banco e no serviço** (provados por teste), mas ainda **sem tela** — próximo
incremento.

## Modelo de dados

```
curriculum_areas (catálogo)                 institutions ─┬─ academic_years
curriculum_components (comum | da escola)                 ├─ classrooms (+grade_code)
curriculum_skills (BNCC | da escola)                      └─ users/teachers/students
school_curriculum_plans  escola × ano × série × período × componente × habilidade

content_sources ──< question_versions >── questions (escola, componente, habilidade)
                        │  imutável após envio     │
                        ├── question_version_keys (gabarito + resolução)
                        └──< question_reviews (append-only)

practice_lists (turma) ──< practice_list_items ──> question_versions (APROVADA)
       └──< list_attempts (1 por aluno) ──< attempt_answers (1 por item)
                   └── attempt_feedback (devolutiva do professor)
```

Migrations: `app/db/migrations/0016_curriculum_matrix.sql` e
`0017_question_bank.sql` — **só adições** (nenhuma coluna alterada, nada
removido, nenhum dado inserido).

## Regras impostas pelo banco

| Regra | Onde |
|---|---|
| Material de uma escola não alcança outra (leitura **e** referência cruzada, inclusive pela service_role) | RLS por `institution_id` da claim + FKs compostas `(id, institution_id)` + triggers de escopo |
| BNCC é referência comum; componente/habilidade/planejamento da escola só a gestão da própria escola escreve | Policies da 0016 |
| Versão nasce rascunho; enviada à revisão, **não muda mais** (corrigir = nova versão) | `iah_check_question_version` |
| Aprovação exige: revisor ≠ autor, checklist completo (gabarito, habilidade, direitos, linguagem), fonte com direitos **verificados pela gestão**, gabarito e resolução | `iah_apply_question_review` |
| Devolução exige comentário | idem |
| Só versão **aprovada** entra em lista; lista só publica com itens aprovados; publicada não muda | `iah_check_practice_list(_item)` |
| Uma tentativa por aluno × lista; uma resposta por item | `unique` + ids determinísticos |
| Acerto calculado **no banco, na entrega**; antes disso `is_correct` é nulo e o aluno não lê gabarito | `iah_check_list_attempt`, policy de `question_version_keys` |
| Nenhum DELETE para a aplicação | grants |
| Fontes do tipo "Enem" ou "apostila" não existem: item de terceiro só entra como `licenciado`, com evidência e verificação | `content_sources.kind` + checks |

"Dificuldade" é `editorial_difficulty` — rótulo de quem escreveu/revisou.
**Não é TRI** e a interface o apresenta como "rótulo editorial".

Operações que só o próprio banco pode fazer (aplicar a decisão da revisão,
calcular o acerto) usam a marca local de transação `iah.trusted`, ligada e
desligada dentro dos triggers. A aplicação fala com o banco só via PostgREST,
que não expõe `set_config`.

## Aplicação

- `app/src/modules/question-bank/` — domínio (entidades, devolutiva
  automática), repositórios PostgREST, serviço por papel, recorte provisório
  (`seeds/recorte-provisorio.ts`).
- `infrastructure/request-context.ts` — mesmo caminho das telas pedagógicas:
  ator conferido no banco → JWT `iah_app`. **Sem modo demonstração** para este
  módulo.
- Telas: `app/(platform)/professor/banco-de-questoes/**` e
  `app/(platform)/dashboard/listas/**`; itens novos no menu lateral.

## Como carregar o recorte provisório

`loadReferenceCatalog(admin)` e `loadProvisionalCut(admin, { institutionId,
academicYearId, authorUserId, reviewerUserId })` com cliente `service_role`.
O carregamento passa pelo fluxo editorial real (rascunho → revisão →
aprovação, autor ≠ revisor). Em escola real, a equipe precisa revisar de novo.
Não há CLI de carga nesta entrega: aplicar em ambiente hospedado depende de
aprovação.

## Testes executados (03/10/2026)

| Suíte | Resultado |
|---|---|
| `npm run migrations:check` | 17 válidas (0001→0017) |
| `npm run lint` | 0 erros (3 avisos pré-existentes) |
| `npx tsc --noEmit` | ok |
| `npm test` | 390/390 (inclui `question-bank-report.test.mjs`) |
| `npm run test:pilot` (PostgreSQL 16 + PostgREST 12.2.3 reais) | 41/41 (34 anteriores + 7 de `question-bank.test.mjs`) |
| `npm run test:integration:postgres` | 59/59 |
| `npm run build` | ok |
| Testes de mutação (regra enfraquecida → suíte precisa falhar) | 4/4 detectadas: listas visíveis entre escolas, autor revisando, gabarito antes da entrega, item não aprovado em lista |
| Percurso HTTP com navegador (servidor de produção local + banco efêmero) | 11/11 checagens |

A suíte achou uma corrida real: cliques simultâneos colidiam na chave primária
de `list_attempts`. Corrigido (árbitro do `ON CONFLICT` = id determinístico).

**Fora do escopo desta medição:** latência e capacidade. Nada aqui comprova 45
ou 65 alunos simultâneos, nem desempenho na Vercel.

## Limitações conhecidas

- Sem telas de autoria, revisão, verificação de direitos e planejamento
  curricular (o banco e o serviço já suportam).
- Lista de um único componente; item só múltipla escolha.
- Turmas existentes ficam com `grade_code` nulo até alguém preencher; a tela
  então mostra o planejamento do ano inteiro e avisa.
- Itens sintéticos foram "revisados" pela gestão sintética no carregamento.
