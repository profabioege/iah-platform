# 07 — Dois eixos: Ensino de IA e trilhas das disciplinas (09/10/2026)

Branch `feature/dois-eixos-ia-trilhas`, criada a partir de
`reform/em-curriculo-banco-questoes` (`ac61415`). **Não publicada.**
Decisão: `DECISIONS.md` D-053.

## 1. Decisão pedagógica (Professor Fabio Ege)

Ensino Médio, 1ª a 3ª série, com dois eixos conectados:

| Eixo | O que é | Onde aparece |
|---|---|---|
| **Ensino de IA** | Trilha **IA & Humanidades**, apoiada por História, Geografia, Filosofia e Sociologia. O aluno aprende a usar, compreender, avaliar e criar com IA. | Aluno: "Meus percursos" → Trilha IA & Humanidades; Missão com etapa "Uso da IA". Professor: menu "Trilha IA & Humanidades". |
| **Trilhas das disciplinas** | CH, LC, MT e CN: planejamento da escola, listas de exercícios, circuito, revisão e acompanhamento. | Aluno: "Meus percursos" → um cartão por área. Professor: Banco de questões, Circuito. |

A IA é transversal: a Missão de IA declara a habilidade da disciplina
que trabalha, e a lista de exercícios da mesma habilidade aparece ligada
à Missão, para o aluno e para o professor.

## 2. O que foi reaproveitado

| Peça existente | Uso neste incremento |
|---|---|
| Missão 01 "A Fábrica de Notícias" (conteúdo em arquivo) | Ganhou o bloco `axes` (dois eixos). Mesmo fluxo de 9 etapas + 1 etapa de uso da IA. |
| `mission_assignments` + serviço de publicação | Atribuição da Missão de IA à turma sem exigir Lesson (`assignAiMissionAction`). |
| `productions`, `reflections`, `mission_reviews` + RLS da 0010 | Registro de uso da IA e avaliação por eixo em colunas novas das mesmas tabelas (mesmas policies). |
| Ciclo de aprendizagem (`learning-cycle-service`) e painel da turma | Entrega exige o registro de IA; avaliação exige os dois eixos; painel mostra o registro separado da produção. |
| Banco de questões (0016–0020): planejamento por escola × ano × série, listas com habilidade-alvo, circuito, Catálogo IAH, revisão | Trilhas das disciplinas no percurso do aluno; lista ligada à Missão pela habilidade-alvo. |
| Itens sintéticos revisados do recorte provisório (`chs101-01`, `chs101-02`, EM13CHS101) | Percurso disciplinar de exemplo no mesmo tema da Missão 01. |
| Carga do acervo autoral (D-052) | Importador do lote piloto de 40 itens aprovado pela coordenação (§6). |
| Ambiente de homologação HTTP (`pilot-http-env.mjs`) | Suíte `dois-eixos` e a demonstração local (`npm run demo:dois-eixos`). |

## 3. Modelo de dados

### 3.1 Missão (arquivo de conteúdo)

`Mission.axes` (`src/modules/library/domain/mission-axes.ts`), separado
por eixo, como pedido:

| Campo | Eixo |
|---|---|
| `discipline.area`, `component`, `objective` | Objetivo da disciplina |
| `discipline.skill` (`framework: "bncc"`, código, texto oficial, referência conferida) | Habilidade da disciplina |
| `discipline.criteria` | Critérios da disciplina |
| `ai.objective`, `ai.competencyIds` | Objetivo e competência em IA |
| `ai.practicalInstruction` | Instrução prática de uso da IA |
| `ai.criticalUseEvidence` | Evidência de uso crítico da IA (o que o aluno precisa registrar) |
| `ai.criteria` | Critérios de IA |
| `reflectionCriteria` | Critérios da reflexão |
| (existente) `production` | Produção esperada |

`validateMissionAxes` recusa: campo vazio, código BNCC fora do padrão,
competência fora do referencial e **o mesmo critério nos dois eixos**
(é o que garante que acertar História não conta como competência em IA).

Referencial de competências em IA: `ai-competencies.ts`, **provisório**
("Referencial IAH de competências em IA (provisório, 2026) — alinhamento
com o Referencial do MEC pendente"). Ids `ia-<dimensão>-NN`, não são
códigos oficiais.

### 3.2 Banco (migration 0021, só aditiva)

- `productions`: `ai_tool`, `ai_request`, `ai_response`, `ai_verification`,
  `ai_decision` (limites 200/2000/3000/3000/3000).
- `mission_reviews`: `discipline_level`, `discipline_skill`,
  `discipline_criteria`, `discipline_note`, `ai_level`, `ai_competencies`,
  `ai_criteria`, `ai_note`. O CHECK impõe: níveis da escala, **os dois
  eixos juntos ou nenhum**, habilidade informada quando há nível
  disciplinar.
- Escala por eixo: não evidenciado · em desenvolvimento · atingido ·
  superado. Não é nota nem TRI. O "conceito geral" e a devolutiva
  continuam como antes.
- Nenhuma policy nova: valem as da 0010 (aluno escreve só o seu; só o
  professor da turma avalia; isolamento por escola e turma).
- Reversão manual comentada no fim da migration.

### 3.3 Série configurável pela escola

Nada no modelo deduz o nível de IA da série. A série é a da turma
(`classrooms.grade_code`, definida pela escola) e o planejamento é
`school_curriculum_plans` (escola × ano × série × período). Turma sem
série → o percurso mostra o planejamento do ano inteiro, com aviso. A
trilha de IA lista as Missões **atribuídas pelo professor**, não as da
série.

## 4. Fluxo implementado

1. Professor → "Trilha IA & Humanidades" → **Atribuir à turma** (Missão 01).
2. Aluno → Dashboard → **Meus percursos**: trilha de IA com a próxima
   atividade e o progresso; 4 cartões de área (CH, LC, MT, CN) com status,
   próxima atividade, listas entregues e circuito.
3. Aluno faz a Missão: objetivos dos dois eixos na etapa de objetivo;
   produção; **etapa "Uso da IA"** (5 campos, salvos automaticamente);
   entrega bloqueada sem o registro completo (na tela e no servidor);
   reflexão.
4. Professor → Turmas: registro de uso da IA **separado** da produção;
   formulário com **um bloco por eixo** (nível, critérios do eixo,
   comentário). Avaliação sem os dois eixos é recusada no servidor e no
   banco.
5. Aluno lê a devolutiva com os dois eixos lado a lado.
6. Professor monta, pelo link da trilha, a lista da mesma habilidade
   (EM13CHS101) com itens revisados; o aluno responde; a lista aparece
   **ligada à Missão** no percurso do aluno e no painel da trilha, com o
   número de entregas.
7. Painel da trilha: alunos, iniciaram, entregaram, avaliados nos 2
   eixos, distribuição dos níveis por eixo e o alerta "N aluno(s)
   atingiram o objetivo da disciplina sem evidenciar a competência em IA"
   (e o inverso).

## 5. O que funciona e o que ainda precisa de conteúdo (4 áreas × 3 séries)

| Percurso | 1ª série | 2ª série | 3ª série |
|---|---|---|---|
| IA & Humanidades (CH) | **Funciona**: Missão 01 com dois eixos (História, EM13CHS101) + lista ligada com 2 itens sintéticos revisados | Precisa de Missões | Precisa de Missões |
| Ciências Humanas — trilha | **Funciona** com o recorte provisório: 1 habilidade (EM13CHS101), 2 itens sintéticos revisados | Precisa de planejamento e itens | idem |
| Matemática — trilha | **Funciona**: recorte (EM13MAT101) + circuito adaptativo com itens sintéticos | Precisa de planejamento e itens | idem |
| Linguagens — trilha | **Funciona como demonstração**: 1 habilidade (EM13LGG101), 2 itens sintéticos revisados; sem Missão de IA ligada | Precisa de planejamento e itens | idem |
| Ciências da Natureza — trilha | **Funciona como demonstração**: 1 habilidade (EM13CNT101), 2 itens sintéticos revisados + itens do Catálogo IAH após revisão | Precisa de planejamento e itens | idem |

Todos os itens do recorte são sintéticos e demonstrativos (marcados como
tal na fonte). Os 40 itens do lote piloto entram em revisão (§6).

Precisa de conteúdo ou de decisão, antes de ampliar funcionalidades:

- Missões de IA para Geografia, Filosofia e Sociologia e para 2ª e 3ª
  séries (o modelo já aceita; falta autoria e revisão).
- Alinhar o referencial provisório de competências em IA ao referencial
  oficial do MEC quando for adotado.
- Diagnóstico por etapas e plano semanal ajustável: **não implementados**
  neste incremento (o percurso mostra listas, circuito e próxima
  atividade; não monta plano semanal).
- Planejamento real da escola por série (hoje: recorte provisório da 1ª
  série, 1º bimestre).
- Revisão no sistema dos 40 itens do lote piloto (§6) e de itens para
  LC, CN e MT por habilidade.

## 6. Lote piloto de 40 itens (aprovado pela coordenação em 06/10/2026)

- Importador: `src/modules/question-bank/catalog/iah-lote-piloto-import.ts`
  e `scripts/catalogo-iah-lote-piloto-carga.mjs` (simula por padrão;
  `--execute` só em banco local ou homologação confirmada; produção
  recusada). Só itens com `status_editorial = "aprovada"` entram.
- Os itens entram no **Catálogo IAH em revisão**: a aprovação da
  coordenação fica registrada no item, mas a aprovação no sistema segue
  exigindo revisor ≠ autor e fonte verificada pela gestão.
- O arquivo dos 40 itens fica fora do repositório (convenção dos
  acervos). Simulação com o arquivo real: 40 itens, 0 problemas (10 por
  área). Só IAH-CH-009 (Filosofia) usa EM13CHS101; por isso a lista de
  exemplo da Missão 01 usa os itens sintéticos do recorte.
- **Obsoleto**: o trabalho de 06/10 no worktree `iah-pilot-beryon`
  (`app/db/migrations/0016_item_bank.sql`, seed SQL do lote e a D-049
  acrescentada ali) conflita com a numeração 0016–0020 e com a D-049
  desta linha. Nunca foi aplicado ao Supabase. Substituído por este
  importador; os arquivos não foram apagados.

## 7. Validação

| Suíte | Resultado | O que cobre |
|---|---|---|
| `npm test` | 438/438 | Regras dos dois eixos, percursos, importador do lote, autorização das Server Actions (avaliação sem eixos recusada) |
| `npm run test:pilot` | 71/71 | `tests/pilot/two-axes.test.mjs`: registro de IA persiste e sobrevive ao autosave; entrega exige registro; colega, outra escola (professor e aluno) não leem; aluno não escreve avaliação; avaliação persiste e volta ao aluno; CHECK recusa um eixo sem o outro |
| `npm run test:homologacao` | 49/49 | `tests/e2e/dois-eixos.test.mjs`: o fluxo completo pela rede com login real, incluindo outra escola sem acesso e lista ligada |
| `npm run migrations:check` | 21 válidas | |
| `tsc --noEmit`, `npm run lint` | sem erros (3 avisos anteriores) | |
| Telas 390 px e 1280 px | sem rolagem horizontal | Percursos, etapa Uso da IA, devolutiva, painel da trilha, Turmas e formulário por eixo |

Ambiente local com PostgreSQL + PostgREST efêmeros. **Não mede
capacidade da Vercel.** As reprovações de latência dos ensaios de
28/09 continuam registradas em `00-inventario-2026-10-03.md` e
`docs/operations/homologacao-piloto-beryon.md`.

## 8. Como abrir a demonstração

```
cd app
npm ci
npm run demo:dois-eixos
```

Opcional, com o lote piloto no Catálogo (em revisão):

```
npm run demo:dois-eixos -- --lote-piloto=C:\caminho\banco_piloto_40_v1.1_aprovado.json
```

Requer Podman (mesmo requisito de `npm run test:homologacao`). O script
imprime a URL (`http://127.0.0.1:3016/entrar`), o caminho do arquivo de
contas sintéticas (senha inicial; troca no 1º acesso) e o roteiro.
Ctrl+C apaga banco, servidor e senhas.

## 9. Próximo incremento recomendado

Diagnóstico por etapas e plano semanal ajustável nas trilhas das
disciplinas, começando por Ciências Humanas na 1ª série — reaproveitando
listas `diagnostica`, o planejamento por série e o circuito — junto com a
autoria de uma segunda Missão de IA (Geografia ou Sociologia) para
validar o modelo de dois eixos fora de História.
