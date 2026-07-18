# Mission Studio — Estúdio de Missões

Ambiente oficial de criação, edição, versionamento e publicação de Missões do IAH. Materializa em produto o motor de autoria de [AUTHORING_MODEL.md](AUTHORING_MODEL.md) (D-022) e prepara os contratos para o **IPE — IAH Pedagogical Engine** (coautor pedagógico futuro; **nenhuma IA implementada nesta Sprint**, por decisão explícita). Decisão registrada em `DECISIONS.md` D-026.

## Estado honesto desta fase

- **Persistência: neste dispositivo (localStorage), rotulada na interface.** O projeto Supabase ainda não foi criado (passos de console do fundador pendentes — `SUPABASE.md`); gravar em banco real é a troca de implementação do contrato `MissionStudioRepository`, item do checklist Mock → Banco Real de `PERSISTENCE.md`. Nenhuma query especulativa foi escrita (D-023).
- **Publicar ≠ chegar ao aluno.** Publicar congela a versão e a marca como Publicada na Biblioteca do Estúdio. O runtime do aluno (`/missoes`) continua servido pelos arquivos de conteúdo (`modules/library`); a ponte "Missão publicada no Estúdio → visível ao aluno" é etapa futura (trocar a fonte do `MissionReader`). O botão diz exatamente o que faz.
- **Arquivos são referências (nome + URL).** Upload real exige storage (Supabase Storage) — entra com o banco.
- **Autor** vem da sessão real quando a autenticação estiver ativa (M07); no modo demonstração, rótulo honesto "Professor(a) de demonstração".

## Arquitetura

```
app/src/modules/authoring/
├── domain/
│   ├── studio-mission.ts             ← StudioMission (todos os campos), status, validação de publicação
│   ├── mission-studio-repository.ts  ← contrato (list/get/save/duplicate/publish/newVersion/archive)
│   └── ipe.ts                        ← contratos do IPE (IpePedagogicalEngine, IpeFieldSuggestion) + stub
├── infrastructure/
│   └── local-mission-studio-repository.ts ← localStorage (em uso)
└── index.ts                          ← getMissionStudioRepository() (ponto único de troca p/ banco)

app/src/app/(platform)/professor/estudio/
├── page.tsx + mission-library.tsx    ← Biblioteca (filtros + pesquisa + Nova Missão + duplicar)
└── [id]/page.tsx + mission-editor.tsx ← Editor em etapas (autosave, visualizar, publicar, nova versão)
```

Relação com os modelos existentes: `StudioMission` é o `MissionTemplate` de `AUTHORING_MODEL.md` achatado em documento editável (objetivos = `LearningObjective`s; estudos de caso = `Evidence`s simplificadas; rubrica/critérios = `EvaluationCriteria`; reflexão = `ReflectionGuide`), **estendido** com os metadados da Sprint M07: descrição, ano escolar, disciplina, carga horária, nível de dificuldade e tempo estimado. O `Mission` runtime (`modules/library`) permanece intocado.

## Fluxo

```
Biblioteca → Nova Missão (rascunho v1)
  → Editor em 6 etapas: Identificação → Pedagogia → Investigação →
    Avaliação → Materiais → Visualizar & Publicar
  → autosave contínuo (debounce ~600ms, rotulado "neste dispositivo")
  → Publicar (com pré-condições: título, pergunta norteadora, desafio,
    produção esperada — subconjunto verificável do checklist de
    MISSION_TEMPLATE.md)
```

## Versionamento (regras de AUTHORING_MODEL.md, agora em código)

- Cada registro é **uma versão** de uma **linhagem** (`lineageId`, `version`). A Biblioteca lista cada versão como linha própria (v1, v2…) — transparente por design.
- **Versão publicada é imutável**: o repositório recusa `save` sobre publicada/arquivada; o editor trava os campos e oferece **"Nova versão"** (v+1, rascunho, mesma linhagem).
- **Duplicar** cria uma **nova linhagem** (v1, rascunho, título com "(cópia)").
- **Nada é apagado**: fim de vida é `archived` (contrato `archive`), preservando histórico — pré-requisito para o dia em que alunos tiverem feito uma versão.
- Status: `draft` → (`review`, previsto no tipo, etapa editorial futura) → `published` → `archived`.

## Publicação

Pré-condições mínimas verificadas por máquina (`publishBlockers`); o restante do checklist de qualidade (`MISSION_TEMPLATE.md`) segue humano. Publicar exibe exatamente o alcance real: *"disponível na Biblioteca do Estúdio; levar ao aluno é a etapa futura"*.

## Integração futura com o IPE

Contratos em `modules/authoring/domain/ipe.ts` — **só contratos**, com invariantes que qualquer implementação deve respeitar (mesmo princípio da Avaliação Assistida, D-024):

- `IpeSuggestableField` é derivado dos campos editáveis do `StudioMission` — cada campo do editor já está, por construção, "preparado para geração futura": o IPE sugere para o mesmo shape que o editor edita.
- Toda sugestão carrega `rationale` (proveniência pedagógica) e `requiresTeacherReview: true` — **o IPE nunca grava**; devolve sugestões, o professor decide e o editor salva.
- `ipeNotConfigured` é o stub em uso (lança se chamado). Nenhum botão de IA existe na interface — botão fake violaria D-015/D-016.

## Expansão futura (ordem natural)

1. Banco real: implementar `MissionStudioRepository` sobre Supabase (+ tabela de missões de autoria; storage para arquivos) e trocar em `getMissionStudioRepository()`.
2. Ponte runtime: `MissionReader` do aluno passa a servir versões publicadas do Estúdio (fixando versão por Atividade — P2/`DOMAIN_MODEL.md`).
3. Etapa editorial `review` na interface.
4. IPE como coautor, sobre os contratos já fixados.
