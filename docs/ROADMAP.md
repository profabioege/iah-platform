# Roadmap — IAH Educacional

Fonte oficial e única de verdade sobre **o que já foi entregue e o que vem a seguir**. Estado em 16/07/2026.

## Norte atual do produto

**Objetivo comercial:** fechar o piloto com o mantenedor da escola onde o fundador já leciona IA, em **agosto/2026**. A pergunta que decide toda priorização: *"isso melhora a demonstração/o uso real em sala de aula em agosto?"* — se não, adia (ver `VISION.md`, critérios de aceitação).

Este norte **substitui** o sequenciamento original de Sprints temáticas (Missões → Biblioteca → Professor → Aluno → Diário → Integrações → Mentor IAH). Módulos foram entregues fora dessa ordem, na sequência que o piloto de agosto exigia (ver "Funcionalidades concluídas"). Ver `DECISIONS.md` (D-014) para o registro desse pivô.

## Iniciativa transversal — Governança Curricular

A Plataforma IAH® adota oficialmente LDB, BNCC, BNCC Computação e o Método IAH® como referenciais permanentes (`STATUS.md`, "Alinhamento Normativo"; `DECISIONS.md` D-029 a D-033). Isso não é uma Sprint isolada — é uma lente aplicada ao longo do desenvolvimento, a implementar de forma incremental conforme cada módulo pedagógico (Lesson, Mission Studio, Painel do Gestor) amadurecer:

- Mapeamento de competências da BNCC.
- Mapeamento de habilidades da BNCC.
- Mapeamento das competências da BNCC Computação.
- Associação automática entre `Lesson`, Mission Flow e competências curriculares.
- Relatórios pedagógicos por competência.

Nenhum item acima está implementado ou priorizado com data — cada um entra como Sprint própria quando o piloto de agosto ou o amadurecimento de `Lesson` (D-028) exigir.

## Funcionalidades concluídas

| Entrega | O que ficou pronto |
|---|---|
| Estrutura inicial + App Shell | Sidebar, header, tema Premium Dark |
| Site institucional (Landing) | Hero, seções de posicionamento, formulário `/contato`, rodapé com e-mails institucionais |
| Git + GitHub + Vercel | Deploy contínuo; `main` → `iah-platform.vercel.app` automaticamente |
| Módulo `library` + Missão 01 | Entidade `Mission`, `MissionReader` local, conteúdo real "A Fábrica de Notícias" (11 blocos) |
| Navegação real da Plataforma | `/missoes`, `/missoes/[id]` — fim da navegação decorativa |
| Produção do Aluno | Autosave, entrega datada, reabertura — persistida no dispositivo |
| Reflexão + Diário do Auditor | `MissionWorkspace` unificado (produção+reflexão sem sobrescrita), `/diario` lista reflexões |
| Identidade visual oficial | Componente `Logo` reutilizável, aplicado em sidebar/header/rodapé/`/entrar`/favicon/OG |
| Dashboard conectado à Missão real | Fim dos cards estáticos; Missão ativa + progresso real; estados iniciada/em andamento/concluída |
| Painel do Professor | `/professor` — 8 estados, contadores-filtro, último acesso, abertura de produção/reflexão (turma **simulada**, arquitetura pronta para banco) |
| Auditoria de demonstração (3 ajustes) | Link "Entrar" na Landing; sidebar honesta ("Em breve" nos itens não construídos); Dashboard sem flash em branco (skeleton) |
| Consolidação de contexto | Estes 5 documentos (`VISION`, `PRODUCT`, `ROADMAP`, `STATUS`, `DECISIONS`) como memória oficial única do projeto |
| Dossiê de Auditoria da Missão 01 | 4 manchetes reais de investigação (2 autênticas, 2 fabricadas — chave só no código-fonte), Guia de Investigação (5 critérios) e Critérios de Auditoria explícitos, com hipótese inicial + veredito final incorporados ao Desafio e à Produção |
| Ensaio da demonstração de agosto | Fluxo completo validado tecnicamente na Vercel (sem erro, sem quebra visual em 5 larguras); `ROTEIRO-DEMONSTRACAO.md` com roteiro de apresentação por etapa. Achado: divergência de meta de tempo (Landing promete 20 min, meta interna é 15 min) — não decidido ainda |
| M03 — Infraestrutura Google Workspace | `modules/integrations` (contratos `AuthProvider`/`ClassroomProvider`, mock em uso, stub Google sem chamada de rede), card "Integrações" no Painel do Professor, `GOOGLE_WORKSPACE.md`. Escopo original (OAuth/Classroom reais) reduzido após análise de risco — ver `DECISIONS.md` D-019 |
| Modelo Institucional (Domain Model) | `DOMAIN_MODEL.md` consolidado como modelo conceitual único (Identidade, Instituição, Currículo, Aprendizagem, Integrações, Colaboração, Acervo, Operação), nova entidade `Ano Letivo`, fluxo Instituição→Professor→Turma→Aluno→Missão, origens de dados futuras (manual/CSV/Google/Microsoft). Só documentação — ver `DECISIONS.md` D-020 |
| Fundação da Plataforma (multiescola) | `DOMAIN_MODEL.md` ganha `ClassroomIntegration`/`IntegrationProvider`/`Indicadores`; novo `IMPORT_ARCHITECTURE.md` (contrato `ImportProvider`, 5 provedores futuros: Manual/CSV/Google/Microsoft/Moodle, fluxo de revisão humana, reconciliação por e-mail). Só documentação — ver `DECISIONS.md` D-021 |
| Sistema de Autoria | Novo `AUTHORING_MODEL.md`: decompõe `Mission` em 10 entidades (`MissionTemplate`, `MissionSection`, `Evidence`, `Challenge`, `EvaluationCriteria`, `ReflectionGuide`, `TeacherGuide`, `Competency`, `LearningObjective`, `DidacticMaterial`) com versionamento; identificou que Evidence/EvaluationCriteria hoje são strings soltas em `didacticMaterials` e a chave de correção só existe em comentário de código. Só documentação — ver `DECISIONS.md` D-022 |
| M04 — Núcleo da Plataforma | Módulo `modules/platform` (12 entidades multi-tenant, contratos com `institutionId` obrigatório, seeds de demonstração em memória, stub de banco, factory), schema SQL versionado (`app/db/migrations/`), `ImportProvider` com 6 provedores (manual funcional + 5 stubs), `PERSISTENCE.md` (stack: Supabase/PostgreSQL sem Prisma). Zero mudança visual — ver `DECISIONS.md` D-023 |
| M06 — Google Classroom + Import Wizard | Módulo `modules/integrations/google-classroom` plugável (real + mock, mappers isolando os tipos Google), `ClassroomSyncService` + `ClassroomSyncState` (migration `0002`), Import Wizard de 6 passos em `/professor/importar`, seção Turmas no Painel do Professor, contratos de entrega de Missão. Tudo sobre dados simulados rotulados, sem OAuth/banco — ver `DECISIONS.md` D-024 e `GOOGLE_CLASSROOM_INTEGRATION.md` |
| M07 — Primeiro Usuário Real (autenticação) | Auth.js v5 + Google (login/logout, sessão JWT), middleware de rotas privadas, provisionamento automático Usuário→Professor→Perfil→Instituição (`modules/identity`, migration `0003`), allowlist fechada, `.env.example` reorganizado, `AUTHENTICATION.md`/`SUPABASE.md`. Ativa ao definir credenciais; sem elas, demo intacta — ver `DECISIONS.md` D-025 |
| M07 — Mission Studio | Estúdio de Missões (`/professor/estudio`): módulo `modules/authoring` (StudioMission com todos os campos, versionamento por linhagem, publicada imutável), Biblioteca com filtros/pesquisa, editor em 6 etapas com autosave, publicação com pré-condições, contratos do IPE (sem IA). Persistência localStorage rotulada até o Supabase existir — ver `DECISIONS.md` D-026 e `MISSION_STUDIO.md` |
| M08 — Mission Flow UX 2.0 | `/missoes/[id]` virou 9 microetapas (Capa→Contexto→Objetivo→Investigação→Comparação→Produção→Critérios→Entrega→Reflexão), 7 componentes reutilizáveis, baixa carga cognitiva. Sem schema novo (parser deriva do `didacticMaterials` existente); `modules/classroom` intocado — ver `DECISIONS.md` D-027 |
| M09 — Mission Flow 3.0 | Refinamento cognitivo das 9 etapas: indicador de tempo estimado, transição entre etapas, Capa/Investigação/Critérios/Entrega/Reflexão redesenhadas. Sem rota/schema/dependência nova — ver `CHANGELOG.md` |
| M10 — Lesson Architecture (fundação) | Sprint só de documentação. Define `Lesson` (Aula) como unidade pedagógica central — um Pedagogical Package que agrupa Planejamento, Objetivos, Competências BNCC, Série, Tempo, Pré-requisitos, Mission Flow (referenciado, não substituído), Slides, Material NotebookLM, Biblioteca Oficial, Estudos de Caso, Exercícios, Rubricas, Avaliação Assistida, Adaptações para Neurodivergentes, Portfólio e Analytics. Seis contratos nomeados em prosa (`Lesson`, `LessonBuilder`, `LessonResources`, `LessonMaterial`, `LessonAssessment`, `LessonAccessibility`) — nenhum código criado. Ver `DECISIONS.md` D-028 |
| Alinhamento Normativo (Governança Curricular) | LDB, BNCC, BNCC Computação e Método IAH® registrados como referenciais permanentes; 5 decisões (D-029 a D-033) tornando metadados curriculares obrigatórios em `Lesson`/`Mission`, exigindo rastreabilidade de competência em avaliação e relatórios pedagógicos por competência. Só documentação. Ver `DECISIONS.md` D-029 a D-033 |
| M11 — Knowledge Engine (Biblioteca Inteligente) | Novo módulo `modules/knowledge` (arquitetura, zero mudança visual): 6 entidades (`KnowledgeSource`/`Document`/`Collection`/`Tag`/`Topic`/`Reference`), 15 campos de metadados, 13 categorias de recurso, mecanismo de busca (`search()`, 6 filtros combináveis), 7 contratos de integração futura (stub), schema versionado (`0004_knowledge_engine.sql`), vínculo direto com `Lesson`/Mission Flow via `KnowledgeReference`. Ver `DECISIONS.md` D-034 e `KNOWLEDGE_ENGINE.md` |
| M12–M17 — Curriculum Engine, Institutional Workspace, Unificação Beryon, Learning Lifecycle | Ver `CHANGELOG.md` e `STATUS.md` para o detalhe entrega-a-entrega — esta tabela não foi mantida linha a linha nesse intervalo. |
| M18 — Arquitetura Institucional Multi-Instituição | Sprint só arquitetural (nenhuma UX/funcionalidade nova): `Institution` ganha `slug`/`domain`; domínio institucional padronizado para `@colegioberyon.com.br` em todo o seed; `modules/workspace/seeds/beryon-seed.ts` → `institution-seed.ts` com `BERYON_*` → `WORKSPACE_*` (nenhum símbolo de código preso ao nome de uma escola); login local de demonstração passa a validar o domínio institucional. Ver `DECISIONS.md` D-035 |
| Product Experience · Epic 01 — Executive Experience | Dashboard Executivo em `/gestor`: diagnóstico imediato, implantação, atenção executiva e leituras agregadas de professores, alunos e disciplina; cinco visões locais; dados do seed institucional; paleta Premium Dark preservada. Ver `DECISIONS.md` D-040 |

## Sprint atual

**Epic 01 — Executive Experience concluído.** O Painel do Gestor agora é a
principal tela da demonstração comercial (D-040). A próxima iniciativa de
Product Experience aguarda definição e aprovação; nenhuma nova engine,
integração de IA ou expansão Premium está autorizada. Prioridade operacional
imediata: reensaiar o roteiro comercial sobre a nova abertura executiva e medir
o tempo real da demonstração.

## Registro histórico do planejamento — Painel do Gestor (MVP Comercial)

> Planejamento original preservado para histórico. Foi superado pela Product
> Experience · Epic 01 e pela decisão D-040; o estado implementado está em
> `STATUS.md` e `CHANGELOG.md`.

### Por que este é o próximo passo

O formulário de `/demonstracao` já identifica o público-alvo por cargo (Diretor(a), Coordenador(a) pedagógico(a), Mantenedor(a), Professor(a)) — mas hoje a única visão pós-login é o Painel do Professor, operacional e granular (8 estados por aluno). Um Diretor/Mantenedor avaliando a plataforma não quer esse nível de detalhe; quer evidência rápida de adoção e de valor pedagógico. Isso serve diretamente o Norte do produto ("isso melhora a demonstração/uso real em agosto?").

### Indicadores que interessam a um Gestor (não a um Professor)

1. **Adesão da turma** — % de alunos que já iniciaram a Missão (visualizou ou além) vs. nunca acessou. Uma métrica, não 8 estados.
2. **Progresso agregado** — % da turma que concluiu a Missão (produção + reflexão), como stat único, não lista aluno a aluno.
3. **Evidência pedagógica (prova social)** — 1–2 trechos de reflexão em destaque, curados, mostrando a profundidade do pensamento crítico produzido — não a lista completa de produções (isso é papel do Painel do Professor).
4. **Competências desenvolvidas** — a lista já existente na Missão (`mission.competencies`: pensamento crítico, formulação de hipóteses, verificação de fontes, uso ético de IA, argumentação, letramento midiático) — contextualiza o que está sendo formado, sem repetir dado operacional.

Deliberadamente **fora** do escopo do Gestor: granularidade por aluno, filtros por status, abertura de produção individual — isso permanece exclusivo do Painel do Professor, para manter os dois papéis com propósitos distintos.

### Menor solução compatível com a arquitetura atual

- **Nenhum módulo novo.** Reaproveita `ClassMonitorReader`/`simulatedClassMonitor` (já usado por `/professor`) e `MissionReader`/`localMissionRepository` (já usado em toda a Plataforma).
- **Uma função pura de agregação** em `modules/classroom` (ex.: `summarizeClassProgress(students): ClassProgressSummary`), calculando adesão/progresso a partir dos mesmos `StudentMissionSnapshot[]` que o Painel do Professor já lê — sem duplicar fonte de dados.
- **Nova rota `/gestor`** em `(platform)`, seguindo exatamente o padrão de `professor/page.tsx` (server component, mesma injeção de dados, mesmo Design System — `Card`/`Badge`).
- **Item de navegação na sidebar**, do mesmo jeito que `/professor` hoje — sem "Em breve", porque será construído de fato.

### Riscos a decidir antes de implementar

- **Sem autenticação/papel** (mesmo risco já documentado para `/professor` e `/dashboard`): qualquer pessoa com a URL acessa `/gestor` — aceitável para demonstração controlada, não para uso público.
- **Privacidade do Diário** (backlog #5, ainda não resolvida): mostrar trechos de reflexão ao "Gestor" amplia a mesma exposição já sinalizada para o Professor — hoje é dado fictício autorizado, mas o desenho não deve pressupor que isso continua aceitável quando a turma for real.

**Critérios de aceite (quando aprovado para implementar):**
- [ ] `/gestor` mostra adesão, progresso agregado, 1–2 destaques de reflexão e competências desenvolvidas — sem lista aluno a aluno.
- [ ] Nenhum módulo novo; reaproveita os contratos `ClassMonitorReader`/`MissionReader` existentes.
- [ ] Validado em desktop/tablet/mobile, sem overflow, console limpo.
- [ ] Rotulado como "Turma de demonstração", mesmo padrão do Painel do Professor (D-015).

## Também pendente (não esquecido, fora desta Sprint)

- **Ensaio humano cronometrado da demonstração** — a validação técnica já feita não substitui um ensaio real com o roteiro lido em voz alta (ver `STATUS.md`).
- **Decidir a meta de tempo real** (15 ou 20 minutos — divergência entre Landing e `ROADMAP.md`/`STATUS.md`).
- **Google Workspace real** — criar projeto no Google Cloud Console quando o piloto exigir login/Classroom reais (ver `GOOGLE_WORKSPACE.md`).

## Backlog (pós-piloto de agosto, sem data)

Prioridade **decrescente** — cada item exige plano de implementação explícito antes de virar código, e reavaliação contra os critérios de `VISION.md` (o piloto pode reordenar tudo abaixo):

1. **Biblioteca** — acervo de Material Didático navegável, ligado às Missões.
2. **Autenticação real** — Supabase; login por papel (aluno/professor/gestor), seguindo os contextos Identidade & Acesso definidos em `DOMAIN_MODEL.md` (Usuário + Perfil, não herança rígida); acesso dos Painéis restrito à turma/escola real.
3. **Persistência em banco** — o núcleo já existe (`modules/platform`, M04): executar o checklist Mock → Banco Real de `PERSISTENCE.md` (projeto Supabase → migrations → implementar os stubs de `database-repositories.ts` → RLS → migrar páginas → aposentar `local-student-work-store`/`simulated-class-monitor`), sem mudar UI.
4. **Segunda Missão** — validar que "cadastrar arquivo de conteúdo" realmente escala sem tocar em interface; pode nascer no formato `Mission` plano de hoje, sem esperar pelo motor de autoria decomposto (`AUTHORING_MODEL.md`) — a decomposição é aditiva, não bloqueante.
5. **Diário do Auditor — privacidade** — controle explícito de compartilhamento professor/gestor↔aluno (hoje toda reflexão salva é visível a ambos os painéis simulados).
6. **Projetos** — produção autoral maior, individual ou em grupo.
7. **Google Workspace real** — trocar os stubs de `modules/integrations` por implementações reais (OAuth + Classroom API), quando o projeto Google Cloud existir (ver `GOOGLE_WORKSPACE.md`); demais provedores de importação (`CSVImportProvider`, `ManualImportProvider`, `MicrosoftTeamsProvider`, `MoodleProvider`) seguem o mesmo contrato `ImportProvider` (ver `IMPORT_ARCHITECTURE.md`), sem ordem de prioridade definida ainda entre eles.
8. **Mentor IAH — apoio inteligente à aprendizagem investigativa** (nome oficial desde 20/07/2026, `DECISIONS.md` D-042) — assistente de IA com registro de proveniência por uso; apoia a investigação do Auditor da Realidade, nunca a substitui (mesmo princípio de `VISION.md`). Ainda sem nenhuma implementação — nem componente, nem rota, nem entidade.
9. **Modo Claro funcional** — hoje só os tokens existem; falta a alternância na interface (o menu de Acessibilidade já expõe a opção sem efeito).
10. **Virada de domínio** — `iaheducacional.com.br` migrar do WordPress temporário para a aplicação Next.js (checklist em `DEPLOY.md`).
