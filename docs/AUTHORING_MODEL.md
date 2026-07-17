# Modelo de Autoria — IAH Educacional

Motor de autoria conceitual do IAH: como uma Missão **nasce, evolui e é publicada**. Documento técnico complementar, deep-dive do contexto "Currículo & Autoria" já mapeado em alto nível em [DOMAIN_MODEL.md](DOMAIN_MODEL.md). Só domínio — não define banco, UI nem rotas. Nenhum código, componente React, página ou rota foi alterado para produzir este documento.

Ver também [MISSION.md](MISSION.md) (os 11 blocos, estrutura vigente) e [MISSION_TEMPLATE.md](MISSION_TEMPLATE.md) (guia editorial de redação, para humanos escrevendo conteúdo). Este documento é o nível abaixo desses dois: não como escrever bem uma Missão, mas como o **dado** de uma Missão é estruturado, versionado e publicado.

## Visão geral

Hoje, uma Missão é **um único objeto plano** (`Mission`, `modules/library/domain/mission.ts`): 11 campos fixos, uma versão, sem histórico. Isso já serve à Missão 01 e à demonstração de agosto — é a implementação correta para o volume atual (D-011, D-014: simplicidade antes de escala). Mas o próprio arquivo da Missão 01 revela a lacuna: os 4 itens do Dossiê de Auditoria (`Evidence`, nesta modelagem) e o Guia de Investigação + Critérios de Auditoria (`EvaluationCriteria`) hoje são só **strings dentro de `didacticMaterials`** — sem estrutura própria — e a chave de correção ("qual manchete é real") existe **apenas como comentário de código**, nunca como dado.

Este documento decompõe o objeto plano em 10 entidades endereçáveis, com um motor de versionamento — a base para quando o IAH precisar de mais de uma pessoa autorando, mais de uma Missão por módulo, ou um fluxo de revisão antes de publicar.

## Entidades — responsabilidades

#### MissionTemplate
- **Finalidade:** entidade raiz do motor de autoria — a versão publicável (ou em rascunho) de uma Missão. É a evolução formal do `Mission` de hoje.
- **Atributos:** id, número, título, módulo, ordem, `version` (inteiro, crescente), `status` (`draft` | `em_revisao` | `published` | `arquivada`), autor, datas de criação/publicação.
- **Relacionamentos:** compõe-se de `LearningObjective`(s), `MissionSection`(s), `Evidence`(s), um `Challenge`, `EvaluationCriteria`, um `ReflectionGuide`, um `TeacherGuide` (opcional); referencia `DidacticMaterial`(s) e `Competency`(s) — reutilizáveis, não copiados.
- **Regras:** é template — nunca guarda dado de aluno (P2, `DOMAIN_MODEL.md`); só uma versão por template está `published` por vez; instanciada como `Atividade` para uma Turma (`DOMAIN_MODEL.md`) fixando a versão vigente no momento.

#### MissionSection
- **Finalidade:** cada bloco endereçável do corpo da Missão (hoje campos fixos: Objetivo, Pergunta Norteadora, Contexto, Ferramentas de IA, Produção do Aluno, Entrega). Formalizar como lista, em vez de campos fixos, permite adicionar um novo tipo de bloco sem migrar o schema.
- **Atributos:** id, `kind` (enum: `objetivo` | `pergunta_norteadora` | `contexto` | `ferramentas_ia` | `producao_esperada` | `entrega` | outro futuro), ordem, conteúdo (texto).
- **Relacionamentos:** pertence a um `MissionTemplate`.
- **Regras:** ordenada; `Evidence`, `Challenge`, `EvaluationCriteria` e `ReflectionGuide` **não são** `MissionSection` genéricas — têm estrutura própria (abaixo) porque carregam dado que o produto precisa consultar (ex.: `groundTruth` de uma Evidence), não só texto de exibição.

#### Evidence
- **Finalidade:** um item investigável dentro do Dossiê de uma Missão (hoje: os 4 itens "DOSSIÊ · Item N" da Missão 01, soltos como string). É a peça central de missões no estilo "Auditor da Realidade".
- **Atributos:** id, texto/manchete, atribuição/fonte descrita, **`groundTruth`** (`autentica` | `fabricada` — hoje só existe como comentário "CHAVE DO PROFESSOR" no arquivo de conteúdo, nunca como dado), `tellsForTeacher` (por que é convincente/o que denuncia — hoje também só no comentário), ordem.
- **Relacionamentos:** pertence a um `MissionTemplate`; referenciada pelo `Challenge`; julgada pelo aluno à luz de `EvaluationCriteria`.
- **Regras:** `groundTruth` e `tellsForTeacher` **nunca são expostos ao aluno** — mesma regra já vigente hoje (chave só em comentário), só que agora como dado com controle de acesso, não como comentário que depende de disciplina humana para não vazar.

#### Challenge
- **Finalidade:** a tarefa concreta que o aluno executa (hoje o campo plano `challenge`, "O Desafio").
- **Atributos:** id, instrução (texto), lista de `Evidence` que o desafio cobre, ações esperadas (ex.: "hipótese inicial" → "veredito final" → "manchete gerada").
- **Relacionamentos:** pertence a um `MissionTemplate`; referencia `Evidence`(s); a produção do aluno (`Produção`, `DOMAIN_MODEL.md`) é a resposta ao Challenge.
- **Regras:** todo `Evidence` do Dossiê deve ser coberto pelo Challenge (nenhum item órfão); a combinação de Challenge + Evidence é o que se cabe no tempo de aula (checklist de `MISSION_TEMPLATE.md`).

#### EvaluationCriteria
- **Finalidade:** o rubrica/guia com que o aluno (e o professor) julgam cada Evidence (hoje: "Guia de Investigação" + "Critérios de Auditoria" da Missão 01, também soltos em `didacticMaterials`).
- **Atributos:** id, lista de critérios (nome + descrição — ex.: Fonte, Data/Escopo, Evidência, Linguagem, Coerência interna), regra de decisão (ex.: "veredito real exige ao menos 2 critérios válidos presentes").
- **Relacionamentos:** referenciado por um ou mais `MissionTemplate` — **reutilizável entre Missões do mesmo módulo** (ex.: um "Guia de Investigação padrão" do Módulo 1 não precisa ser reescrito a cada Missão nova).
- **Regras:** os critérios precisam ser objetivos o bastante para dois alunos competentes chegarem ao mesmo veredito com a mesma Evidence (mesmo padrão de qualidade do checklist em `MISSION_TEMPLATE.md`).

#### ReflectionGuide
- **Finalidade:** o(s) prompt(s) que provocam a Reflexão do aluno no Diário do Auditor (hoje o campo plano `reflection` da Missão — nome que colide com a entidade `Reflexão` do aluno em `DOMAIN_MODEL.md`; este documento resolve a ambiguidade nomeando o prompt como `ReflectionGuide` e a resposta do aluno como `Reflection`/Reflexão).
- **Atributos:** id, pergunta(s) reflexiva(s) (1–2, sobre processo, não conteúdo).
- **Relacionamentos:** pertence a um `MissionTemplate`; motiva a criação de uma `Reflection` (entidade do aluno, `DOMAIN_MODEL.md`) quando o aluno responde.
- **Regras:** nunca é avaliativo — é registro, não prova (mesma regra já vigente para o Diário do Auditor).

#### TeacherGuide
- **Finalidade:** orientação para quem conduz a aula — hoje só existe como comentário de código ("CHAVE DO PROFESSOR", no arquivo da Missão 01), nunca surfaced em nenhuma tela, nem para o Professor logado. Formalizar como entidade é o que permitiria, no futuro, mostrar isso no Painel do Professor sem expor ao aluno.
- **Atributos:** id, notas de mediação (como conduzir o debate após a entrega), erros comuns esperados dos alunos, tempo estimado por etapa, a chave de correção completa (quando aplicável — ex.: o `groundTruth` de cada `Evidence`, centralizado aqui em vez de espalhado).
- **Relacionamentos:** pertence a um `MissionTemplate`; visível só a `Professor`/`Administrador` (nunca a `Aluno` — mesma fronteira de acesso do `groundTruth` de `Evidence`).
- **Regras:** opcional na v1 de uma Missão nova (pode nascer sem), mas o checklist de publicação (`MISSION_TEMPLATE.md`) deveria futuramente exigi-lo antes de `published`.

#### Competency
- **Finalidade:** habilidade desenvolvida (já existe como entidade `Competência` em `DOMAIN_MODEL.md`, e como `competencies: string[]` em código) — aqui, formalizada como **catálogo reutilizável**, não string livre repetida por Missão.
- **Atributos:** id, nome, descrição, categoria.
- **Relacionamentos:** referenciada por N `MissionTemplate`(s) — hoje, sem essa entidade, duas Missões que desenvolvem "Pensamento crítico" duplicam a string sem identidade compartilhada.
- **Regras:** mesma regra já registrada em `DOMAIN_MODEL.md` — reutilizável, base para rubricas futuras.

#### LearningObjective
- **Finalidade:** um objetivo de aprendizagem explícito e individualmente rastreável (hoje: o campo único `objective`, uma string livre de 1–3 frases que mistura conceito + prática).
- **Atributos:** id, descrição, tipo (conceitual | prático), ordem.
- **Relacionamentos:** pertence a um `MissionTemplate`; um `MissionTemplate` tem 1–N `LearningObjective`(s) (hoje sempre 1, implícito).
- **Regras:** decompor não é obrigatório para a Missão 01 continuar funcionando (o campo `objective` atual pode ser lido como um `LearningObjective` único) — é um ponto de extensão para quando avaliação formal por objetivo for necessária (`DOMAIN_MODEL.md`, melhoria sugerida 3).

#### DidacticMaterial
- **Finalidade:** recurso de apoio (já existe como entidade em `DOMAIN_MODEL.md`, e como `didacticMaterials: string[]` em código) — aqui, **com escopo corrigido**: hoje esse array também guarda Evidence e EvaluationCriteria disfarçados de material de apoio; com as duas entidades acima formalizadas, `DidacticMaterial` volta a significar só o que o nome diz (ex.: o texto-base "Como uma IA escreve uma notícia").
- **Atributos:** id, título, tipo, conteúdo/URL, autor, licença/origem.
- **Relacionamentos:** referenciado por N `MissionTemplate`(s) — reutilizável, catalogado na `Biblioteca` (`DOMAIN_MODEL.md`).
- **Regras:** mesma regra já registrada em `DOMAIN_MODEL.md`.

## Relacionamentos (resumo)

```
MissionTemplate (1) ── compõe-se de ──▶ (N) LearningObjective
MissionTemplate (1) ── compõe-se de ──▶ (N) MissionSection
MissionTemplate (1) ── compõe-se de ──▶ (N) Evidence
MissionTemplate (1) ── compõe-se de ──▶ (1) Challenge ── referencia ──▶ (N) Evidence
MissionTemplate (N) ── referencia ────▶ (N) EvaluationCriteria   (reutilizável entre Missões)
MissionTemplate (1) ── compõe-se de ──▶ (1) ReflectionGuide
MissionTemplate (0..1) ── compõe-se de ▶ (1) TeacherGuide
MissionTemplate (N) ── referencia ────▶ (N) Competency           (reutilizável entre Missões)
MissionTemplate (N) ── referencia ────▶ (N) DidacticMaterial     (reutilizável entre Missões)
```

Regra geral: tudo que é **específico de uma Missão** (LearningObjective, MissionSection, Evidence, Challenge, ReflectionGuide, TeacherGuide) é composição (não existe fora do template, versiona junto). Tudo que é **potencialmente compartilhado entre Missões** (EvaluationCriteria, Competency, DidacticMaterial) é referência, com ciclo de vida próprio.

## Fluxo de criação: como uma Missão nasce, evolui e é publicada

1. **Nasce.** Um autor (Professor com permissão de autoria, ou Admin IAH — `DOMAIN_MODEL.md`) cria um `MissionTemplate` em `status: draft`, `version: 1`. Preenche metadados, `LearningObjective`(s), monta os `MissionSection`(s) na ordem, define os `Evidence` do Dossiê (com `groundTruth` — só ele vê), escreve o `Challenge` referenciando essas Evidence, escolhe/cria `EvaluationCriteria`, escreve o `ReflectionGuide` e (idealmente) o `TeacherGuide`, associa `Competency`(s) e `DidacticMaterial`(s) existentes ou novos.
2. **Evolui.** Enquanto em `draft`, tudo é livremente editável, sem gerar nova versão. Ao pedir revisão, o status muda para `em_revisao` — outra pessoa (ou o checklist de `MISSION_TEMPLATE.md`) confere a Missão inteira antes de liberar.
3. **É publicada.** Status muda para `published`. A partir desse momento, o `MissionTemplate` pode ser instanciado como `Atividade` para uma ou mais Turmas (`DOMAIN_MODEL.md`) — a instância fixa `(templateId, version)`, nunca lê a versão "mais recente" dinamicamente.
4. **Muda depois de publicada.** Qualquer edição a um `MissionTemplate` `published` cria uma nova versão (`version + 1`) em `draft` — a versão publicada anterior nunca é alterada em lugar (regra P2 de `DOMAIN_MODEL.md`: turmas já rodando a v1 continuam vendo a v1). Quando a v2 é publicada, a v1 pode ser marcada `arquivada` (nunca apagada — preserva o histórico de quem já fez essa versão).

## Versionamento

- **Unidade de versão = o `MissionTemplate` inteiro.** `LearningObjective`, `MissionSection`, `Evidence`, `Challenge`, `ReflectionGuide` e `TeacherGuide` versionam **junto** com o template pai — não existe versionamento independente de um bloco isolado. Evita uma matriz combinatória de versões (ex.: "Missão v3 com Challenge da v2") que ninguém consegue auditar.
- **`EvaluationCriteria`, `Competency` e `DidacticMaterial` têm ciclo de vida próprio**, por serem reutilizáveis entre Missões — editar um Guia de Investigação compartilhado afeta todas as Missões que o referenciam a partir dali. Isso é uma decisão consciente (reuso > isolamento), com um custo assumido: mudar um `EvaluationCriteria` compartilhado é uma ação sensível, que deveria pedir confirmação explícita de que o autor sabe quantas Missões usam aquele critério — ponto em aberto, não resolvido neste documento.
- **`Atividade` (instância, `DOMAIN_MODEL.md`) sempre referencia `(templateId, version)` fixos**, nunca "a versão atual" — é o mecanismo que impede a edição de uma Missão corromper o histórico de quem já a fez (P2).
- **Nunca deletar uma versão publicada.** `arquivada` é o fim do ciclo de vida, não exclusão — histórico de produções de alunos depende da versão exata que eles viram.

## O que já existe vs. o que este modelo formaliza

| Entidade | Hoje (código real) | Lacuna que este modelo cobre |
|---|---|---|
| `MissionTemplate` | `Mission` (`modules/library/domain/mission.ts`) — plano, mono-versão | `version`, `status` com fluxo real (`draft`→`em_revisao`→`published`→`arquivada`), histórico |
| `MissionSection` | Campos fixos no objeto `Mission` | Lista dinâmica — novo tipo de bloco não exige migração de schema |
| `Evidence` | Strings soltas em `didacticMaterials` (ex.: "DOSSIÊ · Item 1…") | `groundTruth`/`tellsForTeacher` como dado com controle de acesso, hoje só em comentário de código |
| `Challenge` | Campo `challenge: string` | Referência estruturada a quais `Evidence` cobre |
| `EvaluationCriteria` | Strings soltas em `didacticMaterials` (Guia de Investigação + Critérios de Auditoria) | Entidade reutilizável entre Missões, regra de decisão explícita |
| `ReflectionGuide` | Campo `reflection: string` (nome ambíguo com a Reflexão do aluno) | Nome próprio, desambiguado da resposta do aluno |
| `TeacherGuide` | Comentário de código ("CHAVE DO PROFESSOR…") | Entidade visível ao Professor na Plataforma, nunca ao Aluno |
| `Competency` | `competencies: string[]`, sem catálogo | Catálogo compartilhado com identidade própria |
| `LearningObjective` | Campo único `objective: string` | Decomposição opcional em objetivos individualmente rastreáveis |
| `DidacticMaterial` | `didacticMaterials: string[]`, hoje também guarda Evidence/EvaluationCriteria | Escopo corrigido — só material de apoio de fato |

## Pontos de extensão

- **Nova Missão sem essas entidades:** continua funcionando exatamente como hoje (`Mission` plano) — este modelo é aditivo, não obrigatório para a Missão 02 existir. Ver `ROADMAP.md`, item "Segunda Missão".
- **Editor visual de autoria (futuro):** com as entidades decompostas, uma tela de autoria pode editar `Evidence`/`Challenge`/`EvaluationCriteria` independentemente, em vez de exigir edição direta do arquivo TypeScript — não implementado nesta Sprint, mas é o que essa decomposição viabiliza.
- **Avaliação formal (`Rubrica`/`Avaliação`, `DOMAIN_MODEL.md` melhoria 3):** `EvaluationCriteria` já modelado aqui é a base natural de uma futura `Rubrica`.
- **Alinhamento a referenciais (BNCC):** `LearningObjective` e `Competency`, ambos com identidade própria, são o ponto de extensão natural para um campo `alignsTo` futuro — não adicionado agora (`DOMAIN_MODEL.md` já registra isso como ponto em aberto, sem verificação feita).
